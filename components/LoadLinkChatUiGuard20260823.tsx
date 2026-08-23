"use client";

import { useEffect, useRef, useState } from "react";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Pending = { kind: "delete" | "block" | "sensitive"; target: HTMLButtonElement | HTMLFormElement; title: string; detail: string } | null;
const sensitive = /\b(?:otp|one[- ]time pin|password|banking pin|card pin|cvv)\b/i;

function modernInfoIcon() {
  return `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="9" cy="7" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="17" r="2" fill="currentColor"/></svg>`;
}

function decorateConversationUi() {
  const trigger = document.querySelector<HTMLButtonElement>('button[aria-label="Conversation details"]');
  if (trigger && !trigger.dataset.loadlinkModernInfo) {
    trigger.dataset.loadlinkModernInfo = "true";
    trigger.innerHTML = modernInfoIcon();
    trigger.title = "Conversation info";
  }
  const sheet = document.querySelector<HTMLElement>('section[aria-label="Conversation details"]');
  if (sheet) sheet.dataset.loadlinkConversationInfoSheet = "true";
}

export default function LoadLinkChatUiGuard20260823() {
  const { darkMode } = useLoadLinkTheme();
  const [pending, setPending] = useState<Pending>(null);
  const bypass = useRef(false);

  useEffect(() => {
    if (!window.location.pathname.startsWith("/messages")) return;
    decorateConversationUi();
    const observer = new MutationObserver(decorateConversationUi);
    observer.observe(document.body, { childList: true, subtree: true });

    const onClick = (event: MouseEvent) => {
      if (bypass.current) return;
      const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button") : null;
      if (!button) return;
      const text = (button.textContent || "").replace(/\s+/g, " ").trim();
      if (/^Delete$/i.test(text)) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        setPending({ kind: "delete", target: button, title: "Delete message?", detail: "This removes the message for everyone in this conversation." });
      } else if (/^Block$/i.test(text)) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        setPending({ kind: "block", target: button, title: "Block this contact?", detail: "Neither person will be able to send messages until you unblock the conversation." });
      }
    };

    const onSubmit = (event: SubmitEvent) => {
      if (bypass.current) return;
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form) return;
      const composer = form.querySelector<HTMLTextAreaElement>('textarea[data-loadlink-message-composer="true"]');
      if (!composer || !sensitive.test(composer.value)) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      setPending({ kind: "sensitive", target: form, title: "Check this message", detail: "LoadLink will never ask for your password, OTP, PIN or CVV. Continue only if the message does not expose private security information." });
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => { observer.disconnect(); document.removeEventListener("click", onClick, true); document.removeEventListener("submit", onSubmit, true); };
  }, []);

  function continueAction() {
    if (!pending) return;
    const target = pending.target;
    const originalConfirm = window.confirm;
    bypass.current = true;
    window.confirm = () => true;
    setPending(null);
    try {
      if (target instanceof HTMLFormElement) target.requestSubmit();
      else target.click();
    } finally {
      window.setTimeout(() => { window.confirm = originalConfirm; bypass.current = false; }, 0);
    }
  }

  if (!pending) return null;
  return (
    <div className="fixed inset-0 z-[2147483500] flex items-end justify-center bg-black/42 p-3 backdrop-blur-sm sm:items-center" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="loadlink-chat-confirm-title" className={`w-full max-w-sm rounded-[24px] border p-5 shadow-[0_28px_100px_rgba(0,0,0,.30)] backdrop-blur-2xl ${darkMode ? "border-white/12 bg-[#0d0d0d]/96 text-white" : "border-black/10 bg-white/94 text-black"}`}>
        <h2 id="loadlink-chat-confirm-title" className="text-xl font-black tracking-[-.035em]">{pending.title}</h2>
        <p className={`mt-2 text-[12px] font-semibold leading-5 ${darkMode ? "text-white/55" : "text-black/55"}`}>{pending.detail}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setPending(null)} className="min-h-11 rounded-full border border-current/12 px-4 text-xs font-black">Cancel</button>
          <button type="button" onClick={continueAction} className={`min-h-11 rounded-full px-4 text-xs font-black ${pending.kind === "delete" || pending.kind === "block" ? "bg-[#e34848] text-white" : "bg-[#f6b800] text-black"}`}>{pending.kind === "sensitive" ? "Continue" : pending.kind === "delete" ? "Delete" : "Block"}</button>
        </div>
      </section>
    </div>
  );
}
