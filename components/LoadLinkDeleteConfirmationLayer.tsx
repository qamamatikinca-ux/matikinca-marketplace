"use client";

import { useEffect, useRef, useState } from "react";
import LoadLinkIcon from "@/components/LoadLinkIcon";

type ActionKind = "delete" | "signout" | "accountDeletion";
type PendingAction = {
  element: HTMLButtonElement;
  label: string;
  kind: ActionKind;
};

const destructiveLabel = /^(delete|remove|delete account|delete listing|delete post|remove post|remove listing|remove vehicle)\b/i;
const accountDeletionLabel = /^(request deletion|request account deletion)\b/i;
const signOutLabel = /^(sign out|log out|logout)\b/i;

export default function LoadLinkDeleteConfirmationLayer() {
  const [pending, setPending] = useState<PendingAction | null>(null);
  const bypass = useRef(new WeakSet<HTMLButtonElement>());

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      const element = event.target instanceof Element ? event.target : null;
      if (!element || element.closest('[data-loadlink-confirmation-layer="true"]')) return;

      const target = element.closest("button");
      if (!(target instanceof HTMLButtonElement) || target.disabled) return;
      if (bypass.current.has(target)) {
        bypass.current.delete(target);
        return;
      }

      const explicit = target.dataset.loadlinkDeleteConfirm === "true";
      const text = (target.getAttribute("aria-label") || target.textContent || "").replace(/\s+/g, " ").trim();
      const isSignOut = signOutLabel.test(text);
      const isAccountDeletion = accountDeletionLabel.test(text);
      if (!explicit && !isSignOut && !isAccountDeletion && !destructiveLabel.test(text)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setPending({
        element: target,
        label: text || "Delete",
        kind: isSignOut ? "signout" : isAccountDeletion ? "accountDeletion" : "delete",
      });
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
  const isAccountDeletion = pending.kind === "accountDeletion";
  const destructive = !isSignOut;
  const subject = pending.label
    .replace(/^(delete|remove)\s*/i, "")
    .replace(/[?.!]+$/g, "")
    .trim();

  const eyebrow = isSignOut ? "Sign out" : isAccountDeletion ? "Account deletion" : "Confirm deletion";
  const title = isSignOut ? "Sign out of LoadLink?" : isAccountDeletion ? "Request account deletion?" : "Delete this item?";
  const description = isSignOut
    ? "You’ll be signed out on this device."
    : isAccountDeletion
      ? "LoadLink will review the request before the account is removed."
      : `${subject ? `Delete ${subject.toLowerCase()}?` : "Delete this item?"} This action may not be reversible.`;
  const confirmLabel = isSignOut ? "Sign out" : isAccountDeletion ? "Request deletion" : "Delete";

  return (
    <div
      data-loadlink-confirmation-layer="true"
      className="fixed inset-0 z-[2147483600] flex items-center justify-center bg-black/42 px-4 py-8 backdrop-blur-[10px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loadlink-confirm-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setPending(null);
      }}
    >
      <section
        className={`w-full max-w-[365px] rounded-[24px] border p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,.38)] backdrop-blur-2xl ${
          destructive
            ? "border-red-400/18 bg-[#151515]/95"
            : "border-white/12 bg-[#151515]/95"
        }`}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border ${
              destructive
                ? "border-red-400/24 bg-red-400/[.06] text-red-300"
                : "border-[#f6b800]/28 bg-[#f6b800]/[.06] text-[#f6b800]"
            }`}
          >
            <LoadLinkIcon name={isSignOut ? "logout" : "trash"} size={21} strokeWidth={1.8} />
          </div>

          <div className="min-w-0 flex-1">
            <p className={`text-[9px] font-black uppercase tracking-[.15em] ${destructive ? "text-red-300" : "text-[#f6b800]"}`}>{eyebrow}</p>
            <h2 id="loadlink-confirm-title" className="mt-1 text-[22px] font-black leading-tight tracking-[-.035em]">{title}</h2>
            <p className="mt-2 text-[13px] font-semibold leading-5 text-white/62">{description}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPending(null)}
            className={`h-11 rounded-[14px] border text-[13px] font-black transition active:scale-[.985] ${
              isSignOut
                ? "border-[#f6b800] bg-[#f6b800] text-black"
                : "border-white/12 bg-white/[.045] text-white"
            }`}
          >
            {isSignOut ? "Stay signed in" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={confirm}
            className={`h-11 rounded-[14px] border text-[13px] font-black transition active:scale-[.985] ${
              destructive
                ? "border-red-400/30 bg-red-400/[.06] text-red-300"
                : "border-white/12 bg-white/[.045] text-white"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
