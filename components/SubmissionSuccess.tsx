"use client";

import { useEffect } from "react";

type SubmissionSuccessProps = {
  open: boolean;
  title?: string;
  message?: string;
};

export default function SubmissionSuccess({
  open,
  title = "Submission sent",
  message = "Your submission has been received. Our team will review it and update you within a few minutes.",
}: SubmissionSuccessProps) {
  useEffect(() => {
    if (!open) return;
    try {
      if ("vibrate" in navigator) navigator.vibrate([80, 45, 120]);
    } catch {
      // Vibration is optional and not supported by every mobile browser.
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/80 px-5 backdrop-blur-md" role="status" aria-live="assertive">
      <section className="w-full max-w-sm rounded-[30px] border border-[#f6b800]/60 bg-[#080808] px-6 py-8 text-center text-white shadow-[0_30px_90px_rgba(0,0,0,.55)]">
        <div className="loadlink-success-ring mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#f6b800] bg-[#f6b800] text-black">
          <svg className="loadlink-success-check" width="46" height="46" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path d="M12 25.5 20.5 34 37 15" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="mt-6 text-[11px] font-black uppercase tracking-[0.2em] text-[#f6b800]">LoadLink</p>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">{title}</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-white/65">{message}</p>
      </section>
    </div>
  );
}
