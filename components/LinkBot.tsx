"use client";

import LoadLinkIcon from "@/components/LoadLinkIcon";

import { FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Message = { from: "bot" | "user"; text: string; actions?: Array<{label:string;href:string}> };
const initial = ["Talk to an agent", "View my support cases", "Find something on LoadLink", "Post or manage a listing", "Fix a problem"];

export default function LinkBot() {
  const { darkMode } = useLoadLinkTheme();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { from: "bot", text: "Hi, I’m LinkBot. Tell me what you’re trying to do on LoadLink and I’ll take you to the exact next step." },
  ]);
  const [choices, setChoices] = useState(initial);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [handover, setHandover] = useState(false);
  const [includeRecentQuestions,setIncludeRecentQuestions]=useState(false);
  const [supportDraft,setSupportDraft]=useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const panelRef=useRef<HTMLElement>(null);
  useEffect(()=>{if(!open)return;const previous=document.activeElement as HTMLElement|null;const frame=requestAnimationFrame(()=>inputRef.current?.focus());const overflow=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{cancelAnimationFrame(frame);document.body.style.overflow=overflow;previous?.focus();};},[open]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => {
    const openAgent = () => startAgentHandover();
    const openHelp = () => setOpen(true);
    window.addEventListener("loadlink:open-linkbot", openHelp);
    window.addEventListener("loadlink:open-agent-support", openAgent);
    return () => { window.removeEventListener("loadlink:open-agent-support", openAgent); window.removeEventListener("loadlink:open-linkbot", openHelp); };
  }, []);

  function startAgentHandover() {
    setOpen(true);
    setHandover(true);
    setMessages((current) => [...current, { from: "bot", text: "Describe what happened, including the affected page or listing. Your issue will become a numbered support case. You can choose whether to include recent LinkBot questions." }]);
    setChoices(["Cancel support handover"]);
  }

  async function sendSupportTicket(text: string) {
    const clean = text.trim();
    setSupportDraft(clean);
    if (clean.length < 10) {
      setMessages((current) => [...current, { from: "bot", text: "Add a little more detail so support can investigate this properly." }]);
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
      const listingMatch = pathname.match(/^\/listing\/([0-9a-f-]{36})$/i);
      const subject = listingMatch ? "Help with a LoadLink listing" : `Help with ${pathname === "/help" ? "LoadLink" : pathname.replace(/^\//, "").replaceAll("-", " ")}`;
      const recentQuestions=includeRecentQuestions ? messages.filter(item=>item.from==="user"&&!/^(talk to an agent|try support request again)$/i.test(item.text)).slice(-4).map(item=>item.text.slice(0,350)).join("\n- ") : "";
      const result = await supabase.rpc("loadlink_create_support_ticket", {
        p_subject: subject,
        p_description: `${clean}${recentQuestions ? `\n\nRecent LinkBot questions shared with consent:\n- ${recentQuestions}` : ""}\n\nPage: ${window.location.origin}${pathname}`.slice(0, 5000),
        p_related_entity_type: listingMatch ? "listing" : "page",
        p_related_entity_id: listingMatch?.[1] || pathname,
      });
      if (result.error) throw result.error;
      const ticketNumber = String(result.data?.ticket_number || "Your support ticket");
      setMessages((current) => [...current, { from: "bot", text: `${ticketNumber} is now in the LoadLink Support queue. You can track this case and reply to a support employee in My support cases.` }]);
      setHandover(false);
      setIncludeRecentQuestions(false);
      setChoices(["View my support cases", "Ask another question", "Open notifications"]);
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
    const history = messages.slice(-16);
    setMessages((current) => [...current, { from: "user", text: clean }]);
    setInput("");

    if (/^try support request again$/i.test(clean)) { await sendSupportTicket(supportDraft); return; }
    if (/^(ask another question|try again)$/i.test(clean)) { setChoices(initial); inputRef.current?.focus(); return; }
    if (/^talk to an agent$/i.test(clean)) {
      startAgentHandover();
      return;
    }
    if (/^cancel support handover$/i.test(clean)) {
      setHandover(false);
      setMessages((current) => [...current, { from: "bot", text: "Support handover cancelled. I can keep helping you here." }]);
      setChoices(initial);
      return;
    }
    if (/^view my support cases$/i.test(clean)) {
      window.location.assign("/support/cases");
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
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch("/api/linkbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,
          history,
          context: {
            pathname: window.location.pathname,
            search: window.location.search.slice(0, 300),
            theme: darkMode ? "dark" : "light",
            signedIn: Boolean(sessionData.session?.user),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.answer || "Help is temporarily unavailable.");
      const actions = Array.isArray(data.actions) ? data.actions.filter((item: {href?:string;label?:string})=>typeof item.href === "string" && /^\/(?!\/)[a-z0-9/?=#%&_-]*$/i.test(item.href) && typeof item.label === "string").slice(0,3) : [];
      setMessages((current) => [...current, { from: "bot", text: data.answer || "Tell me a little more about what happened.", actions }]);
      setChoices(data.followups || ["Ask another question", "Talk to an agent"]);
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

  const panel = darkMode ? "border-white/12 bg-[#0a0a0a]/92 text-white" : "border-black/10 bg-white/88 text-black";
  const botBubble = darkMode ? "border-white/10 bg-white/[.055] text-white/80" : "border-black/8 bg-black/[.035] text-black/75";
  const softBorder = darkMode ? "border-white/12" : "border-black/10";

  return (
    <>
      <button onClick={() => setOpen(true)} className={`fixed bottom-5 right-5 z-[120] rounded-full border px-5 py-3 text-sm font-black shadow-[0_14px_40px_rgba(0,0,0,.18)] backdrop-blur-xl ${darkMode ? "border-white/12 bg-white/[.09] text-white" : "border-black/10 bg-white/75 text-black"}`} aria-label="Open LinkBot">LinkBot</button>
      {open ? (
        <div data-theme={darkMode ? "dark" : "light"} className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/38 p-3 backdrop-blur-sm md:items-center" data-loadlink-linkbot="true">
          <section ref={panelRef} onKeyDown={event=>{if(event.key==="Escape"){setOpen(false);return;}if(event.key!=="Tab")return;const items=Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],textarea,input')||[]);const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}} className={`flex max-h-[88dvh] ll-linkbot-panel w-full max-w-md flex-col overflow-hidden rounded-[28px] border shadow-[0_30px_90px_rgba(0,0,0,.28)] backdrop-blur-3xl ${panel}`} role="dialog" aria-modal="true" aria-label="LoadLink help">
            <header className={`flex items-center justify-between border-b p-4 ${softBorder}`}>
              <div><p className={`text-[10px] font-black uppercase tracking-[.14em] ${darkMode ? "text-white/45" : "text-black/45"}`}>LoadLink help</p><h2 className="mt-1 text-xl font-black">LinkBot</h2><p className={`mt-1 text-[10px] ${darkMode ? "text-white/40" : "text-black/40"}`}>Guidance and support from LoadLink</p></div>
              <button onClick={() => setOpen(false)} className={`flex h-10 w-10 items-center justify-center rounded-full border text-xl ${softBorder}`} aria-label="Close LinkBot"><LoadLinkIcon name="close" size={18} className="inline-block shrink-0 align-middle" /></button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="space-y-3" role="log" aria-label="Support conversation" aria-live="polite">
                {messages.map((message, index) => <div key={index} className={`max-w-[88%] rounded-2xl border p-3 text-sm leading-6 ${message.from === "bot" ? botBubble : darkMode ? "ml-auto border-white/10 bg-white text-black" : "ml-auto border-black bg-black font-semibold text-white"}`}><p className="whitespace-pre-wrap">{message.text}</p>{message.actions?.map(action=><a key={action.href} href={action.href} className="ll-bot-action">{action.label}<LoadLinkIcon name="chevronRight" size={16}/></a>)}</div>)}
                {busy ? <div className={`inline-flex rounded-2xl border p-3 text-sm ${botBubble}`}>Working…</div> : null}
                <div ref={endRef} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">{choices.map((choice) => <button key={choice} disabled={busy} onClick={() => void ask(choice)} className={`rounded-full border px-3 py-2 text-xs font-bold ${softBorder}`}>{choice}</button>)}</div>
            </div>
            {handover ? <label className={`mx-4 mb-2 flex items-center gap-2 text-[11px] ${darkMode ? "text-white/65" : "text-black/65"}`}><input type="checkbox" checked={includeRecentQuestions} onChange={e=>setIncludeRecentQuestions(e.target.checked)} /> Include recent LinkBot questions in this support case</label> : null}
            <form onSubmit={submit} className={`flex gap-2 border-t p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] ${softBorder}`}>
              <textarea ref={inputRef} aria-label={handover ? "Describe your support request" : "Message LinkBot"} maxLength={1600} value={input} onChange={(event) => setInput(event.target.value)} placeholder={handover ? "Describe the issue for LoadLink Support" : "What are you trying to do?"} rows={1} className={`max-h-24 min-w-0 flex-1 resize-none rounded-2xl border px-3 py-3 text-sm outline-none ${darkMode ? "border-white/12 bg-white/[.045] text-white placeholder:text-white/35" : "border-black/10 bg-white/70 text-black placeholder:text-black/35"}`} />
              <button disabled={busy || !input.trim()} className={`${darkMode ? "bg-white text-black" : "bg-black text-white"} rounded-full px-4 font-black disabled:opacity-45`}>Send</button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
