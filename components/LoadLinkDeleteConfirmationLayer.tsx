"use client";

import { useEffect, useRef, useState } from "react";
import LoadLinkIcon from "@/components/LoadLinkIcon";

type PendingAction = {
  element: HTMLButtonElement;
  label: string;
  kind: "delete" | "signout";
};

const destructiveLabel = /^(delete|remove|request deletion|delete account|delete listing|delete post|remove post|remove listing|remove vehicle)\b/i;
const signOutLabel = /^(sign out|log out|logout)\b/i;

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
      const isSignOut = signOutLabel.test(text);
      if (!explicit && !isSignOut && !destructiveLabel.test(text)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setPending({ element: target, label: text || "Delete", kind: isSignOut ? "signout" : "delete" });
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
      window.confirm = () => true;
      bypass.current.add(action.element);
      action.element.click();
    } finally {
      window.confirm = originalConfirm;
    }
  }

  if (!pending) return null;
  const isSignOut = pending.kind === "signout";
  const subject = pending.label.replace(/^(delete|remove|request)\s*/i, "").replace(/[?.!]+$/g, "").trim();

  return (
    <div className="fixed inset-0 z-[2147483600] flex items-center justify-center bg-black/72 px-4 py-8 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="loadlink-confirm-title">
      <section className={`w-full max-w-md overflow-hidden rounded-[30px] border bg-[#0b0b0b] p-5 text-white shadow-[0_34px_100px_rgba(0,0,0,.62)] sm:p-6 ${isSignOut ? "border-white/12" : "border-red-500/20"}`}>
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border ${isSignOut ? "border-[#f6b800]/35 bg-[#f6b800]/[.08] text-[#f6b800]" : "border-red-500/35 bg-red-500/[.08] text-red-400"}`}>
          <LoadLinkIcon name={isSignOut ? "logout" : "trash"} size={27} />
        </div>
        <div className="mt-5 text-center">
          <p className={`text-[10px] font-black uppercase tracking-[.16em] ${isSignOut ? "text-[#f6b800]" : "text-red-400"}`}>{isSignOut ? "Sign out" : "Confirm deletion"}</p>
          <h2 id="loadlink-confirm-title" className="mt-2 text-2xl font-black tracking-[-.04em]">{isSignOut ? "Sign out of LoadLink?" : "Are you sure?"}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-white/52">
            {isSignOut
              ? "You’ll be signed out on this device. You can sign back in at any time."
              : `${subject ? `You’re about to delete ${subject.toLowerCase()}.` : "You’re about to delete this item."} This action may not be reversible.`}
          </p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => setPending(null)} className={`h-12 rounded-[15px] border text-sm font-black ${isSignOut ? "border-[#f6b800] bg-[#f6b800] text-black" : "border-white/12 bg-white/[.04] text-white"}`}>{isSignOut ? "Stay signed in" : "Cancel"}</button>
          <button type="button" onClick={confirm} className={`h-12 rounded-[15px] border text-sm font-black ${isSignOut ? "border-white/15 bg-white/[.04] text-white/75" : "border-red-500/55 bg-red-500/[.09] text-red-400"}`}>{isSignOut ? "Sign out" : "Delete"}</button>
        </div>
      </section>
    </div>
  );
}
