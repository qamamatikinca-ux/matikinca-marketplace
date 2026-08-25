"use client";

import { useEffect, useState } from "react";

const DRAFT_PREFIX = "loadlink-contract-draft-v20260823";

export default function LoadLinkContractCancel20260826() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setVisible(window.location.pathname === "/contracts/post");
  }, []);

  if (!visible) return null;

  function clearContractDraft() {
    try {
      const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter(Boolean) as string[];
      keys.filter((key) => key === DRAFT_PREFIX || key.startsWith(`${DRAFT_PREFIX}:`)).forEach((key) => localStorage.removeItem(key));
    } catch {}
    window.location.assign("/contracts");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[max(14px,env(safe-area-inset-bottom))] left-4 z-40 min-h-11 rounded-[15px] border border-current/15 bg-black/55 px-4 text-xs font-bold text-white shadow-xl backdrop-blur-xl"
      >
        Cancel contract listing
      </button>

      {open ? (
        <div className="fixed inset-0 z-[2147483500] grid place-items-end bg-black/58 p-3 backdrop-blur-[6px] sm:place-items-center" role="dialog" aria-modal="true" aria-label="Cancel contract listing">
          <section className="w-full max-w-md rounded-[26px] border border-white/12 bg-[#0b0b0b]/92 p-5 text-white shadow-2xl backdrop-blur-2xl">
            <p className="text-[10px] font-black uppercase tracking-[.12em] text-white/45">Contract draft</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-.035em]">Cancel contract listing?</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/58">Your saved contract draft will be cleared from this device. Nothing will be submitted.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setOpen(false)} className="min-h-12 rounded-[15px] border border-white/14 bg-white/[.035] px-4 text-sm font-bold">Keep editing</button>
              <button type="button" onClick={clearContractDraft} className="min-h-12 rounded-[15px] bg-[#f6b800] px-4 text-sm font-black text-black">Cancel listing</button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
