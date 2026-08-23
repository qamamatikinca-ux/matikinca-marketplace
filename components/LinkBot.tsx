"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Message = { from: "bot" | "user"; text: string };
const initial = ["Talk to an agent", "Find something", "Post or manage something", "Fix this page"];

export default function LinkBot() {
  const { darkMode } = useLoadLinkTheme();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { from: "bot", text: "Tell me what you are trying to do on LoadLink. I’ll use the page you are on to guide you to the right action." },
  ]);
  const [choices, setChoices] = useState(initial);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [handover, setHandover] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => {
    const openAgent = () => startAgentHandover();
    window.addEventListener("loadlink:open-agent-support", openAgent);
    return () => window.removeEventListener("loadlink:open-agent-support", openAgent);
  }, []);

  function startAgentHandover() {
    setOpen(true);
    setHandover(true);
    setMessages((current) => [...current, { from: "bot", text: "Describe what happened, what page or listing is involved, and what you expected LoadLink to do. I’ll send that context with the support request." }]);
    setChoices(["Cancel support handover"]);
  }

  async function sendSupportTicket(text: string) {
    const clean = text.trim();
    if (clean.length < 10) {
      setMessages((current) => [...current, { from: "bot", text: "Add a little more detail so support can investigate the right thing." }]);
      return;
    }
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setMessages((current) => [...current, { from: "bot", text: "Sign in first so LoadLink can attach the support request to your account and notify you about the outcome." }]);
        setChoices(["Sign in", "Cancel support handover"]);
        return;
      }
      const pathname = window.location.pathname;
      const listingMatch = pathname.match(/^\/(?:listing|vehicles|contracts)\/([0-9a-f-]{36})$/i);
      const subject = listingMatch ? "Help with a LoadLink listing" : `Help with ${pathname === "/help" ? "LoadLink" : pathname.replace(/^\//, "").replaceAll("-", " ")}`;
      const result = await supabase.rpc("loadlink_create_support_ticket", {
        p_subject: subject,
        p_description: `${clean}\n\nPage: ${window.location.href}`.slice(0, 5000),
        p_related_entity_type: listingMatch ? "listing" : "page",
        p_related_entity_id: listingMatch?.[1] || pathname,
      });
      if (result.error) throw result.error;
      const ticketNumber = String(result.data?.ticket_number || "your support ticket");
      setMessages((current) => [...current, { from: "bot", text: `${ticketNumber} is now in the LoadLink Support queue. You’ll get an account notification when it is reviewed.` }]);
      setHandover(false);
      setChoices(["Ask another question", "Open notifications"]);
      window.dispatchEvent(new CustomEvent("loadlink:toast", { detail: { kind: "success", title: "Support request sent", message: `${ticketNumber} was added to the LoadLink Support queue.`, duration: 5200 } }));
    } catch (error) {
      const raw = error instanceof Error ? error.message : String((error as { message?: unknown })?.message || "");
      setMessages((current) => [...current, { from: "bot", text: /rate/i.test(raw) ? "You’ve sent several support requests recently. Wait a little before creating another one." : "LoadLink could not create the support request right now. Your description is still here so you can retry." }]);
      setChoices(["Try support request again", "Cancel support handover"]);
    } finally {
      setBusy(false);
    }
  }

  async function ask(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    setMessages((current) => [...current, { from: "user", text: clean }]);
    setInput("");

    if (/^talk to an agent$/i.test(clean) || /^try support request again$/i.test(clean)) {
      startAgentHandover();
      return;
    }
    if (/^cancel support handover$/i.test(clean)) {
      setHandover(false);
      setMessages((current) => [...current, { from: "bot", text: "Support handover cancelled. I can keep helping here." }]);
      setChoices(initial);
      return;
    }
    if (/^sign in$/i.test(clean)) {
      window.location.assign(`/login?returnTo=${encodeURIComponent(window.location.pathname || "/help")}`);
      return;
    }
    if (/^open notifications$/i.test(clean)) {
      window.location.assign("/notifications");
      return;
    }
    if (handover) {
      await sendSupportTicket(clean);
      return;
    }

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
            title: document.title,
            signedIn: Boolean(auth.user),
            theme: darkMode ? "dark" : "light",
          },
        }),
      });
      const data = await response.json();
      setMessages((current) => [...current, { from: "bot", text: data.answer || "Tell me a little more about what happened." }]);
      setChoices(Array.isArray(data.followups) && data.followups.length ? data.followups.slice(0, 4) : ["Ask another question", "Talk to an agent"]);
    } catch {
      setMessages((current) => [...current, { from: "bot", text: "I’m temporarily unavailable. Try again in a moment, or send the issue to LoadLink Support." }]);
      setChoices(["Try again", "Talk to an agent"]);
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(input);
  }

  const shell = darkMode ? "border-white/12 bg-[#080808]/95 text-white" : "border-black/10 bg-white/92 text-black";
  const botBubble = darkMode ? "border-white/10 bg-white/[.055] text-white/78" : "border-black/8 bg-black/[.035] text-black/72";
  const soft = darkMode ? "border-white/14 text-white/78" : "border-black/10 text-black/70";

  return (
    <>
      <button onClick={() => setOpen(true)} className={`rounded-full border px-4 py-2.5 text-xs font-black shadow-sm ${darkMode ? "border-white/12 bg-white/[.04] text-white" : "border-black/10 bg-white text-black"}`} aria-label="Open LinkBot">Ask LinkBot</button>
      {open ? (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/45 p-3 backdrop-blur-sm md:items-center">
          <section className={`loadlink-glass flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-[26px] border shadow-[0_28px_90px_rgba(0,0,0,.32)] ${shell}`} role="dialog" aria-modal="true" aria-label="LoadLink help">
            <header className={`flex items-center justify-between border-b p-4 ${darkMode ? "border-white/10" : "border-black/8"}`}>
              <div><h2 className="text-xl font-black tracking-[-.03em]">LinkBot</h2><p className={`mt-1 text-[11px] font-semibold ${darkMode ? "text-white/45" : "text-black/45"}`}>Context-aware LoadLink help</p></div>
              <button onClick={() => setOpen(false)} className={`flex h-10 w-10 items-center justify-center rounded-full border text-xl ${soft}`} aria-label="Close LinkBot">×</button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {messages.map((message, index) => <div key={index} className={`max-w-[88%] rounded-2xl border p-3 text-sm leading-6 ${message.from === "bot" ? botBubble : "ml-auto border-[#f6b800] bg-[#f6b800] font-semibold text-black"}`}>{message.text}</div>)}
                {busy ? <div className={`inline-flex rounded-2xl border p-3 text-sm ${botBubble}`}>Checking LoadLink…</div> : null}
                <div ref={endRef} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">{choices.map((choice) => <button key={choice} onClick={() => void ask(choice)} className={`rounded-full border px-3 py-2 text-xs font-bold ${soft}`}>{choice}</button>)}</div>
            </div>
            <form onSubmit={submit} className={`flex gap-2 border-t p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] ${darkMode ? "border-white/10" : "border-black/8"}`}>
              <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder={handover ? "Describe the issue for LoadLink Support" : "What do you need help with?"} rows={1} className={`max-h-24 min-w-0 flex-1 resize-none rounded-2xl border px-3 py-3 text-base outline-none focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.045] text-white" : "border-black/10 bg-black/[.025] text-black"}`} />
              <button disabled={busy} className="rounded-full bg-[#f6b800] px-4 font-black text-black disabled:opacity-45">Send</button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
