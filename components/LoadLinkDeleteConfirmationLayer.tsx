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

    // Some older LoadLink actions still contain a native window.confirm.
    // This custom layer is the confirmation, so allow that original handler to continue once.
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
      className="fixed inset-0 z-[2147483600] flex items-center justify-center bg-black/35 px-4 py-8 backdrop-blur-[18px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loadlink-confirm-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setPending(null);
      }}
    >
      <section
        className={`w-full max-w-[430px] overflow-hidden rounded-[34px] border p-5 text-white shadow-[0_34px_110px_rgba(0,0,0,.42)] backdrop-blur-3xl backdrop-saturate-150 sm:p-6 ${
          destructive
            ? "border-red-300/15 bg-[linear-gradient(145deg,rgba(23,23,23,.67),rgba(8,8,8,.50))]"
            : "border-white/15 bg-[linear-gradient(145deg,rgba(28,28,28,.64),rgba(8,8,8,.48))]"
        }`}
      >
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full border backdrop-blur-xl ${
            destructive
              ? "border-red-400/30 bg-red-400/[.07] text-red-300"
              : "border-[#f6b800]/35 bg-[#f6b800]/[.08] text-[#f6b800]"
          }`}
        >
          <LoadLinkIcon name={isSignOut ? "logout" : "trash"} size={24} strokeWidth={1.8} />
        </div>

        <div className="mt-5 text-center">
          <p className={`text-[10px] font-black uppercase tracking-[.16em] ${destructive ? "text-red-300" : "text-[#f6b800]"}`}>{eyebrow}</p>
          <h2 id="loadlink-confirm-title" className="mt-2 text-[27px] font-black tracking-[-.045em]">{title}</h2>
          <p className="mx-auto mt-2 max-w-[350px] text-sm font-semibold leading-6 text-white/72">{description}</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setPending(null)}
            className={`h-12 rounded-[17px] border text-sm font-black transition active:scale-[.985] ${
              isSignOut
                ? "border-[#f6b800] bg-[#f6b800] text-black"
                : "border-white/15 bg-white/[.07] text-white"
            }`}
          >
            {isSignOut ? "Stay signed in" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={confirm}
            className={`h-12 rounded-[17px] border text-sm font-black transition active:scale-[.985] ${
              destructive
                ? "border-red-400/45 bg-red-400/[.09] text-red-300"
                : "border-white/15 bg-white/[.07] text-white"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
