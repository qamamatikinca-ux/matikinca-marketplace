"use client";

import { useEffect, useRef, useState } from "react";

type PendingAction = {
  element: HTMLButtonElement;
  label: string;
};

const destructiveLabel = /^(delete|remove|request deletion|delete account|delete listing|delete post|remove post|remove listing|remove vehicle)\b/i;

export default function LoadLinkDeleteConfirmationLayer() {
  const [pending, setPending] = useState<PendingAction | null>(null);
  const bypass = useRef(new WeakSet<HTMLButtonElement>());

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target instanceof Element ? event.target.closest("button") : null;
      if (!(target instanceof HTMLButtonElement) || target.disabled) return;
      if (bypass.current.has(target)) {
        bypass.current.delete(target);
        return;
      }

      const explicit = target.dataset.loadlinkDeleteConfirm === "true";
      const text = (target.getAttribute("aria-label") || target.textContent || "").replace(/\s+/g, " ").trim();
      if (!explicit && !destructiveLabel.test(text)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setPending({ element: target, label: text || "Delete" });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  function confirm() {
    const action = pending;
    if (!action) return;
    setPending(null);
    const originalConfirm = window.confirm;
    try {
      // Existing LoadLink handlers that still contain window.confirm should not
      // open a second browser dialog after the branded confirmation has passed.
      window.confirm = () => true;
      bypass.current.add(action.element);
      action.element.click();
    } finally {
      window.confirm = originalConfirm;
    }
  }

  if (!pending) return null;
  const subject = pending.label.replace(/^(delete|remove|request)\s*/i, "").replace(/[?.!]+$/g, "").trim();

  return (
    <div className="fixed inset-0 z-[2147483600] flex items-center justify-center bg-black/78 px-4 py-8 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="loadlink-delete-title">
      <section className="w-full max-w-md overflow-hidden rounded-[30px] border border-white/12 bg-[radial-gradient(circle_at_50%_0%,rgba(255,92,70,.11),transparent_36%),#0b0b0b] p-5 text-white shadow-[0_34px_100px_rgba(0,0,0,.62)] sm:p-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-red-500/35 bg-red-500/[.08] text-red-400 shadow-[0_0_36px_rgba(239,68,68,.12)]"><TrashIcon /></div>
        <div className="mt-5 text-center">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-red-400">Confirm deletion</p>
          <h2 id="loadlink-delete-title" className="mt-2 text-2xl font-black tracking-[-.04em]">Are you sure?</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-white/52">{subject ? `You’re about to delete ${subject.toLowerCase()}.` : "You’re about to delete this item."} This action may not be reversible.</p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => setPending(null)} className="h-12 rounded-[15px] border border-white/12 bg-white/[.04] text-sm font-black text-white">Cancel</button>
          <button type="button" onClick={confirm} className="h-12 rounded-[15px] border border-red-500/55 bg-red-500/[.09] text-sm font-black text-red-400 shadow-[0_10px_28px_rgba(239,68,68,.08)]">Delete</button>
        </div>
      </section>
    </div>
  );
}

function TrashIcon() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>;
}
