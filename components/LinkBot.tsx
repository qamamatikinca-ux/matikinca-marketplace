"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Message = { from: "bot" | "user"; text: string };
const initial = ["Find something", "Posting help", "Payments & plans", "Talk to an agent"];

function pageHint(pathname: string) {
  if (pathname.startsWith("/messages")) return "Messages & calls";
  if (pathname.startsWith("/contracts")) return "Contracts";
  if (pathname.startsWith("/jobs")) return "Jobs";
  if (pathname.startsWith("/dealer") || pathname.startsWith("/dealership")) return "Dealerships";
  if (pathname.startsWith("/packages")) return "Packages & payments";
  if (pathname.includes("vehicle")) return "Vehicles & units";
  return "LoadLink";
}

export default function LinkBot() {
  const { darkMode } = useLoadLinkTheme();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ from: "bot", text: "Tell me what you want to do on LoadLink. I’ll use the page you’re on to keep the answer relevant." }]);
  const [choices, setChoices] = useState(initial);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [handover, setHandover] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const currentArea = useMemo(() => typeof window === "undefined" ? "LoadLink" : pageHint(window.location.pathname), [open]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => {
    const openAgent = () => startAgentHandover();
    window.addEventListener("loadlink:open-agent-support", openAgent);
    return () => window.removeEventListener("loadlink:open-agent-support", openAgent);
  }, []);

  function startAgentHandover() {
    setOpen(true);
    setHandover(true);
    setMessages((current) => [...current, { from: "bot", text: "Describe what happened, what you expected and the page or listing involved. I’ll attach the current page to the support request." }]);
    setChoices(["Cancel support handover"]);
  }

  async function sendSupportTicket(text: string) {
    const clean = text.trim();
    if (clean.length < 10) {
      setMessages((current) => [...current, { from: "bot", text: "Add a little more detail so support can investigate the problem properly." }]);
      return;
    }
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setMessages((current) => [...current, { from: "bot", text: "Sign in first so LoadLink can attach the request to your account and notify you about the outcome." }]);
        setChoices(["Sign in", "Cancel support handover"]);
        return;
      }
      const pathname = window.location.pathname;
      const resourceMatch = pathname.match(/^\/(?:listing|vehicles|contracts)\/([0-9a-f-]{36})$/i);
      const result = await supabase.rpc("loadlink_create_support_ticket", {
        p_subject: resourceMatch ? "Help with a LoadLink marketplace item" : `Help with ${pageHint(pathname)}`,
        p_description: `${clean}\n\nPage: ${window.location.href}`.slice(0, 5000),
        p_related_entity_type: resourceMatch ? "listing" : "page",
        p_related_entity_id: resourceMatch?.[1] || pathname,
      });
      if (result.error) throw result.error;
      const ticketNumber = String(result.data?.ticket_number || "your support ticket");
      setMessages((current) => [...current, { from: "bot", text: `${ticketNumber} is now in the LoadLink Support queue. You’ll get an account notification when it is reviewed.` }]);
      setHandover(false);
      setChoices(["Ask another question", "Open notifications"]);
      window.dispatchEvent(new CustomEvent("loadlink:toast", { detail: { kind: "success", title: "Support request sent", message: `${ticketNumber} was added to the Support queue.`, duration: 5200 } }));
    } catch (error) {
      const raw = error instanceof Error ? error.message : String((error as { message?: unknown })?.message || "");
      setMessages((current) => [...current, { from: "bot", text: /rate/i.test(raw) ? "You’ve sent several support requests recently. Wait a little before creating another one." : "LoadLink could not create the support request right now. Your description is still here so you can retry." }]);
      setChoices(["Try support request again", "Cancel support handover"]);
    } finally { setBusy(false); }
  }

  async function ask(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    setMessages((current) => [...current, { from: "user", text: clean }]);
    setInput("");

    if (/^talk to an agent$/i.test(clean) || /^try support request again$/i.test(clean)) { startAgentHandover(); return; }
    if (/^cancel support handover$/i.test(clean)) { setHandover(false); setMessages((current) => [...current, { from: "bot", text: "Support handover cancelled. I can keep helping you here." }]); setChoices(initial); return; }
    if (/^sign in$/i.test(clean)) { window.location.assign(`/login?returnTo=${encodeURIComponent(window.location.pathname || "/help")}`); return; }
    if (/^open notifications$/i.test(clean)) { window.location.assign("/notifications"); return; }
    if (handover) { await sendSupportTicket(clean); return; }

    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const response = await fetch("/api/linkbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,
          history: messages.slice(-10),
          context: {
            pathname: window.location.pathname,
            search: window.location.search,
            area: pageHint(window.location.pathname),
            signedIn: Boolean(auth.user),
          },
        }),
      });
      const data = await response.json();
      setMessages((current) => [...current, { from: "bot", text: data.answer || "Tell me a little more about what happened." }]);
      setChoices(Array.isArray(data.followups) && data.followups.length ? data.followups.slice(0, 4) : ["Ask another question", "Talk to an agent"]);
    } catch {
      setMessages((current) => [...current, { from: "bot", text: "I’m temporarily unavailable. Try again in a moment, or send the issue to LoadLink Support." }]);
      setChoices(["Try again", "Talk to an agent"]);
    } finally { setBusy(false); }
  }

  function submit(event: FormEvent) { event.preventDefault(); void ask(input); }

  const surface = darkMode ? "border-white/12 bg-[#0c0c0c]/94 text-white" : "border-black/10 bg-white/92 text-black";
  const muted = darkMode ? "text-white/48" : "text-black/48";

  return (
    <>
      <button onClick={() => setOpen(true)} className={`min-h-11 rounded-full border px-4 text-xs font-black shadow-sm ${darkMode ? "border-white/14 bg-white/[.04] text-white" : "border-black/10 bg-black/[.025] text-black"}`} aria-label="Open LinkBot">Ask LinkBot</button>
      {open ? (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/38 p-3 backdrop-blur-sm md:items-center">
          <section className={`flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-[26px] border shadow-[0_28px_100px_rgba(0,0,0,.28)] backdrop-blur-2xl ${surface}`} role="dialog" aria-modal="true" aria-label="LoadLink help">
            <header className="flex items-center justify-between border-b border-current/10 p-4">
              <div><h2 className="text-lg font-black">LinkBot</h2><p className={`mt-0.5 text-[10px] font-semibold ${muted}`}>{currentArea} · contextual help</p></div>
              <button onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full border border-current/12 text-lg" aria-label="Close LinkBot">×</button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {messages.map((message, index) => <div key={index} className={`max-w-[90%] rounded-[18px] px-3.5 py-3 text-[12px] font-semibold leading-5 ${message.from === "bot" ? darkMode ? "border border-white/10 bg-white/[.045] text-white/78" : "border border-black/8 bg-black/[.025] text-black/72" : "ml-auto bg-[#f6b800] text-black"}`}>{message.text}</div>)}
                {busy ? <div className={`inline-flex rounded-[18px] border px-3.5 py-3 text-[12px] ${darkMode ? "border-white/10 bg-white/[.045] text-white/55" : "border-black/8 bg-black/[.025] text-black/50"}`}>Thinking…</div> : null}
                <div ref={endRef} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">{choices.map((choice) => <button key={choice} onClick={() => void ask(choice)} className="rounded-full border border-current/12 px-3 py-2 text-[10px] font-bold">{choice}</button>)}</div>
            </div>
            <form onSubmit={submit} className="flex gap-2 border-t border-current/10 p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))]">
              <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder={handover ? "Describe the issue for LoadLink Support" : "Ask about this part of LoadLink"} rows={1} className={`max-h-24 min-w-0 flex-1 resize-none rounded-[17px] border px-3 py-3 text-base outline-none focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.035]" : "border-black/10 bg-black/[.02]"}`} />
              <button disabled={busy} className="rounded-full bg-[#f6b800] px-4 text-xs font-black text-black disabled:opacity-45">Send</button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
