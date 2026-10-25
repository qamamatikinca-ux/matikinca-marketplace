"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import { browserSupabase } from "@/lib/phase2/supabase";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { conversationStarters } from "@/lib/conversationStarters";

type Thread = { id: string; driver_profile_id: string; driver_user_id: string; enquirer_user_id: string; driver_name: string; enquirer_name: string; blocked: boolean };
type Message = { id: string; sender_id: string; body: string; created_at: string };
export default function DriverMessagesPage() {
  const router = useRouter();
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [userId, setUserId] = useState("");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const pendingSend = useRef<{ thread: string; text: string; key: string } | null>(null);
  const tail = useRef<HTMLDivElement>(null);
  const thread = threads.find(row => row.id === selected);
  const loadThreads = useCallback(async () => {
    const { data, error } = await browserSupabase().from("driver_message_threads").select("*").order("updated_at", { ascending: false }).limit(100);
    if (error) throw error;
    setThreads(data || []);
  }, []);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const client = browserSupabase();
        const { data: { user }, error } = await client.auth.getUser();
        if (error || !user) { router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`); return; }
        if (!active) return;
        setUserId(user.id);
        const params = new URLSearchParams(window.location.search);
        const driver = params.get("driver");
        if (!driver && params.get("thread")) setSelected(params.get("thread") || "");
        if (driver) {
          const opened = await client.rpc("loadlink_open_driver_chat", { p_profile_id: driver });
          if (opened.error) throw opened.error;
          if (active) setSelected(String(opened.data));
        }
        if (active) await loadThreads();
      } catch { if (active) setError("Driver messages could not load. Refresh to retry, or return to the driver directory."); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [loadThreads, router]);
  useEffect(() => {
    if (!selected || !userId) return;
    let active = true;
    async function refresh() {
      if (document.hidden || !navigator.onLine) return;
      try {
        const { data, error } = await browserSupabase().from("driver_thread_messages").select("id,sender_id,body,created_at").eq("thread_id", selected).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(100);
        if (error) throw error;
        if (active) { setMessages((data || []).reverse()); setError(""); }
        if (active) await loadThreads();
      } catch { if (active) setError("Messages could not refresh. Your last loaded messages are still shown. We will retry automatically."); }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("online", refresh); };
  }, [selected, userId, loadThreads]);
  useEffect(() => { tail.current?.scrollIntoView({ block: "nearest" }); }, [messages.length]);
  async function send() {
    if (!thread || !draft.trim() || busy) return;
    const text = draft.trim();
    if (pendingSend.current?.thread !== thread.id || pendingSend.current?.text !== text) pendingSend.current = { thread: thread.id, text, key: crypto.randomUUID() };
    setBusy(true); setError("");
    try {
      const { data, error } = await browserSupabase().rpc("loadlink_send_driver_message", { p_thread_id: thread.id, p_body: text, p_client_message_id: pendingSend.current.key });
      if (error) throw error;
      setMessages(rows => rows.some(row => row.id === String(data)) ? rows : [...rows, { id: String(data), sender_id: userId, body: text, created_at: new Date().toISOString() }]);
      setDraft(""); pendingSend.current = null;
    } catch { setError("Message was not sent. The profile may be unavailable or this conversation may be closed. Check your connection and retry."); }
    finally { setBusy(false); }
  }
  async function closeThread() {
    if (!thread || busy || !window.confirm("Close this conversation? Neither person will be able to send further messages here.")) return;
    setBusy(true); setError("");
    try {
      const { error } = await browserSupabase().rpc("loadlink_close_driver_chat", { p_thread_id: thread.id });
      if (error) throw error;
      await loadThreads();
    } catch { setError("The conversation could not be closed. Please retry."); }
    finally { setBusy(false); }
  }
  const panel = darkMode ? "border-white/15 bg-[#111]" : "border-black/10 bg-white";
  return <main className={`min-h-screen ${darkMode ? "bg-black text-white" : "bg-[#fffaf0] text-black"}`}>
    <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
    <section className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-black">Driver messages</h1><Link href="/messages" className="text-sm underline">Back to listing messages</Link><Link href="/drivers" className="text-sm underline">Find drivers</Link></div>
      {error ? <p role="alert" className="my-4 rounded-xl border border-red-500/30 p-3 text-sm">{error}</p> : null}
      <div className="mt-5 grid gap-4 md:grid-cols-[240px_1fr]">
        <aside aria-label="Driver conversations" className={`rounded-2xl border p-3 ${panel}`}><p className="mb-3 text-xs opacity-60">Your 100 most recently active conversations</p>{loading ? <p>Loading…</p> : threads.length === 0 ? <p className="text-sm opacity-65">No driver conversations yet.</p> : threads.map(row => <button key={row.id} disabled={busy} onClick={() => { setSelected(row.id); setMessages([]); setDraft(""); }} aria-pressed={selected === row.id} className={`mb-2 w-full rounded-xl border p-3 text-left text-sm ${selected === row.id ? "border-[#f6b800]" : "border-current/10"}`}>{row.driver_user_id === userId ? row.enquirer_name : row.driver_name}<span className="mt-1 block text-xs opacity-55">{row.blocked ? "Closed" : `Driver profile: ${row.driver_name}`}</span></button>)}</aside>
        <section className={`min-w-0 rounded-2xl border p-4 ${panel}`}>
          {!thread ? <p className="text-sm opacity-65">Choose a conversation or use Contact driver on a driver profile.</p> : <>
            <div className="flex items-center justify-between gap-3"><h2 className="font-bold">{thread.driver_user_id === userId ? thread.enquirer_name : thread.driver_name}</h2>{!thread.blocked ? <button disabled={busy} onClick={() => void closeThread()} className="text-xs underline">Close conversation</button> : null}</div>
            <p className="mt-1 text-xs opacity-60">About {thread.driver_name}’s driver profile</p>
            <div className="my-4 max-h-[48vh] min-h-40 space-y-3 overflow-y-auto" aria-label="Messages" aria-live="polite">{messages.length === 100 ? <p className="text-xs opacity-60">Showing the latest 100 messages.</p> : null}{messages.map(message => <div key={message.id} className={`max-w-[90%] whitespace-pre-wrap break-words rounded-2xl p-3 text-sm ${message.sender_id === userId ? "ml-auto bg-[#f6b800] text-black" : "border border-current/15"}`}>{message.body}<time dateTime={message.created_at} className="mt-1 block text-[10px] opacity-60">{new Date(message.created_at).toLocaleString()}</time></div>)}<div ref={tail} /></div>
            {thread.blocked ? <p className="text-sm opacity-65">This conversation is closed.</p> : <>
              {messages.length === 0 ? <div className="mb-3 flex flex-wrap gap-2">{conversationStarters({ title: thread.driver_name, listing_kind: "driver" }, thread.driver_name, thread.driver_user_id === userId).map(suggestion => <button key={suggestion} onClick={() => setDraft(suggestion)} className="rounded-xl border border-current/15 p-2 text-left text-xs">{suggestion}</button>)}</div> : null}
              <form onSubmit={event => { event.preventDefault(); void send(); }}><label htmlFor="driver-message" className="text-xs font-bold">Message about this driver profile</label><textarea id="driver-message" maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-current/20 bg-transparent p-3 text-sm" /><button disabled={busy || !draft.trim()} className="mt-2 rounded-xl bg-[#f6b800] px-5 py-3 font-bold text-black disabled:opacity-50">{busy ? "Sending…" : "Send message"}</button></form>
            </>}
          </>}
        </section>
      </div>
    </section>
  </main>;
}
