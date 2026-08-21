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
    ? "You’ll be signed out on this device. You can sign back in at any time."
    : isAccountDeletion
      ? "This sends an account-deletion request to LoadLink. Your account is not removed instantly; the request must be reviewed first."
      : `${subject ? `You’re about to delete ${subject.toLowerCase()}.` : "You’re about to delete this item."} This action may not be reversible.`;
  const confirmLabel = isSignOut ? "Sign out" : isAccountDeletion ? "Request deletion" : "Delete";

  return (
    <div
      data-loadlink-confirmation-layer="true"
      className="fixed inset-0 z-[2147483600] flex items-center justify-center bg-black/30 px-4 py-8 backdrop-blur-[18px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loadlink-confirm-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setPending(null);
      }}
    >
      <section
        className={`w-full max-w-[410px] overflow-hidden rounded-[30px] border p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,.34)] backdrop-blur-3xl backdrop-saturate-150 sm:p-6 ${
          destructive
            ? "border-red-300/14 bg-[linear-gradient(145deg,rgba(23,23,23,.62),rgba(8,8,8,.43))]"
            : "border-white/14 bg-[linear-gradient(145deg,rgba(28,28,28,.58),rgba(8,8,8,.42))]"
        }`}
      >
        <div
          className={`mx-auto flex h-13 w-13 items-center justify-center rounded-full border backdrop-blur-xl ${
            destructive
              ? "border-red-400/28 bg-red-400/[.065] text-red-300"
              : "border-[#f6b800]/32 bg-[#f6b800]/[.075] text-[#f6b800]"
          }`}
        >
          <LoadLinkIcon name={isSignOut ? "logout" : "trash"} size={23} strokeWidth={1.8} />
        </div>

        <div className="mt-4 text-center">
          <p className={`text-[9px] font-black uppercase tracking-[.16em] ${destructive ? "text-red-300" : "text-[#f6b800]"}`}>{eyebrow}</p>
          <h2 id="loadlink-confirm-title" className="mt-2 text-[25px] font-black tracking-[-.045em]">{title}</h2>
          <p className="mx-auto mt-2 max-w-[340px] text-[13px] font-semibold leading-5 text-white/68">{description}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setPending(null)}
            className={`h-11 rounded-[15px] border text-[13px] font-black transition active:scale-[.985] ${
              isSignOut
                ? "border-[#f6b800] bg-[#f6b800] text-black"
                : "border-white/14 bg-white/[.055] text-white"
            }`}
          >
            {isSignOut ? "Stay signed in" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={confirm}
            className={`h-11 rounded-[15px] border text-[13px] font-black transition active:scale-[.985] ${
              destructive
                ? "border-red-400/40 bg-red-400/[.075] text-red-300"
                : "border-white/14 bg-white/[.055] text-white"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
