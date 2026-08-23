"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type DialogState = {
  kind: "confirm" | "report";
  title: string;
  body: string;
  confirmLabel: string;
  target?: HTMLElement | null;
  form?: HTMLFormElement | null;
};

const SENSITIVE = /\b(?:otp|one[- ]time pin|password|banking pin|card pin|cvv)\b/i;

export default function LoadLinkChatDialogGuard20260823() {
  const pathname = usePathname();
  const { darkMode } = useLoadLinkTheme();
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [reason, setReason] = useState("");
  const bypassRef = useRef(false);

  useEffect(() => {
    if (pathname !== "/messages") return;

    const onClick = (event: MouseEvent) => {
      if (bypassRef.current) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("button") : null;
      if (!target) return;
      const text = (target.textContent || "").replace(/\s+/g, " ").trim();

      if (/^report$/i.test(text)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        setReason("");
        setDialog({ kind: "report", title: "Report conversation", body: "Tell LoadLink what is unsafe, misleading or inappropriate. Reports are private and go to moderation.", confirmLabel: "Submit report", target });
        return;
      }

      if (/^delete$/i.test(text)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        setDialog({ kind: "confirm", title: "Delete message?", body: "This removes the message for everyone in the conversation. Message deletion is only available during the current edit window.", confirmLabel: "Delete", target });
        return;
      }

      if (/^block$/i.test(text)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        setDialog({ kind: "confirm", title: "Block this conversation?", body: "Neither person will be able to send new messages until you unblock the conversation.", confirmLabel: "Block", target });
      }
    };

    const onSubmit = (event: SubmitEvent) => {
      if (bypassRef.current) return;
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form?.classList.contains("loadlink-chat-composer")) return;
      const composer = form.querySelector<HTMLTextAreaElement>('[data-loadlink-message-composer="true"]');
      const text = composer?.value || "";
      if (!SENSITIVE.test(text)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setDialog({ kind: "confirm", title: "Check this message", body: "LoadLink will never ask for your password, OTP, PIN or CVV. Only continue if this message does not expose private security information.", confirmLabel: "Send anyway", form });
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [pathname]);

  function replayConfirm() {
    if (!dialog) return;
    const originalConfirm = window.confirm;
    const originalPrompt = window.prompt;
    bypassRef.current = true;
    try {
      if (dialog.kind === "report") {
        const clean = reason.trim();
        if (clean.length < 5) return;
        window.prompt = () => clean;
        dialog.target?.click();
      } else if (dialog.form) {
        window.confirm = () => true;
        dialog.form.requestSubmit();
      } else if (dialog.target) {
        window.confirm = () => true;
        dialog.target.click();
      }
      setDialog(null);
      setReason("");
    } finally {
      window.setTimeout(() => {
        window.confirm = originalConfirm;
        window.prompt = originalPrompt;
        bypassRef.current = false;
      }, 0);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    replayConfirm();
  }

  if (!dialog) return null;

  return (
    <div className="fixed inset-0 z-[2147483500] flex items-end justify-center bg-black/48 p-3 backdrop-blur-[12px] sm:items-center" role="presentation">
      <button type="button" aria-label="Close dialog" className="absolute inset-0" onClick={() => { setDialog(null); setReason(""); }} />
      <form onSubmit={submit} className={`loadlink-glass relative z-10 w-full max-w-[390px] rounded-[26px] border p-5 shadow-[0_28px_90px_rgba(0,0,0,.34)] ${darkMode ? "border-white/12 bg-[#0b0b0b]/94 text-white" : "border-black/10 bg-white/94 text-black"}`} role="dialog" aria-modal="true" aria-label={dialog.title}>
        <h2 className="text-xl font-black tracking-[-.035em]">{dialog.title}</h2>
        <p className={`mt-2 text-sm font-semibold leading-6 ${darkMode ? "text-white/52" : "text-black/52"}`}>{dialog.body}</p>
        {dialog.kind === "report" ? (
          <label className="mt-4 block"><span className="sr-only">Report reason</span><textarea autoFocus value={reason} onChange={(event) => setReason(event.target.value)} rows={4} maxLength={1200} placeholder="Describe what happened" className={`w-full resize-none rounded-[16px] border p-3 text-base font-medium outline-none focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.05] text-white placeholder:text-white/30" : "border-black/10 bg-black/[.025] text-black placeholder:text-black/35"}`} /></label>
        ) : null}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => { setDialog(null); setReason(""); }} className={`h-11 rounded-[14px] border text-sm font-black ${darkMode ? "border-white/12" : "border-black/10"}`}>Cancel</button>
          <button type="submit" disabled={dialog.kind === "report" && reason.trim().length < 5} className={`h-11 rounded-[14px] text-sm font-black text-white disabled:opacity-40 ${/delete|block/i.test(dialog.confirmLabel) ? "bg-[#d94545]" : "bg-black dark:bg-[#f6b800] dark:text-black"}`}>{dialog.confirmLabel}</button>
        </div>
      </form>
    </div>
  );
}
