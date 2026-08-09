"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function PhotoLimitUpgradeToast({
  open,
  onClose,
  limit = 5,
}: {
  open: boolean;
  onClose: () => void;
  limit?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onClose, 8000);
    return () => window.clearTimeout(timer);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-x-3 bottom-[max(16px,env(safe-area-inset-bottom))] z-[12000] mx-auto max-w-md" role="status" aria-live="polite">
      <div className="rounded-[22px] border border-black/10 bg-white p-4 text-black shadow-[0_20px_60px_rgba(0,0,0,.22)]">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-[#f6b800]">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16v11H4V7Zm3-3h10v3M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-black">Standard includes {limit} photos</h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-black/55">
              We kept the first {limit}. Upgrade if you want to show more photos and unlock Pro listing features.
            </p>
            <div className="mt-3 flex gap-2">
              <Link href="/account/packages" className="flex h-10 flex-1 items-center justify-center rounded-xl bg-black px-4 text-xs font-black text-white">
                View upgrade
              </Link>
              <button type="button" onClick={onClose} className="h-10 rounded-xl border border-black/10 px-4 text-xs font-black">
                Not now
              </button>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 text-lg" aria-label="Dismiss">×</button>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/5">
          <div className="loadlink-upgrade-toast-timer h-full w-full origin-left bg-[#f6b800]" />
        </div>
      </div>
    </div>
  );
}
