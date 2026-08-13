"use client";

import { useState } from "react";

type ListingReportDialogProps = {
  listingId: string;
  title: string;
  darkMode: boolean;
  onClose: () => void;
};

export default function ListingReportDialog({ listingId, title, darkMode, onClose }: ListingReportDialogProps) {
  const [reason, setReason] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function save() {
    const clean = reason.trim();
    if (clean.length < 5) return;
    setError("");
    try {
      const current = JSON.parse(localStorage.getItem("loadlink-pending-reports") || "[]");
      const next = [{ listingId, title, reason: clean, createdAt: new Date().toISOString() }, ...(Array.isArray(current) ? current : [])];
      localStorage.setItem("loadlink-pending-reports", JSON.stringify(next));
      setSaved(true);
    } catch {
      setError("The report could not be saved on this device. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-[10020] flex items-end justify-center bg-black/65 p-3 backdrop-blur-[10px] sm:items-center" role="dialog" aria-modal="true" aria-labelledby="loadlink-report-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`w-full max-w-[500px] overflow-hidden rounded-[28px] border shadow-2xl ${darkMode ? "border-white/12 bg-[#0a0a0a] text-white" : "border-black/10 bg-[#fffdf7] text-black"}`}>
        <header className="flex items-start justify-between gap-4 border-b border-current/10 px-5 py-5">
          <div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#b88900]">LoadLink safety</p><h2 id="loadlink-report-title" className="mt-1 text-[25px] font-black tracking-[-.04em]">Report listing</h2></div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-current/15 text-xl" aria-label="Close report">×</button>
        </header>

        {saved ? (
          <div className="p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f6b800] text-2xl font-black text-black">✓</div>
            <h3 className="mt-4 text-xl font-black">Report saved</h3>
            <p className={`mx-auto mt-2 max-w-sm text-sm leading-6 ${darkMode ? "text-white/55" : "text-black/55"}`}>Your report has been saved with this listing for LoadLink review.</p>
            <button type="button" onClick={onClose} className="mt-5 h-12 w-full rounded-2xl bg-[#f6b800] text-xs font-black uppercase tracking-[.08em] text-black">Done</button>
          </div>
        ) : (
          <div className="p-5">
            <div className={`rounded-2xl border px-4 py-3 ${darkMode ? "border-[#f6b800]/25 bg-[#f6b800]/10" : "border-[#c99a16]/25 bg-[#fff5cf]"}`}><p className="truncate text-xs font-black">{title}</p></div>
            <label htmlFor="loadlink-report-reason" className="mt-5 block text-xs font-black">Tell us what is wrong</label>
            <textarea id="loadlink-report-reason" autoFocus value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Misleading information, scam concern, incorrect details…" maxLength={600} className={`mt-2 min-h-32 w-full resize-none rounded-2xl border px-4 py-3 text-sm font-semibold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.04] text-white placeholder:text-white/30" : "border-black/10 bg-white text-black placeholder:text-black/30"}`} />
            <p className={`mt-2 text-[10px] font-semibold leading-5 ${darkMode ? "text-white/42" : "text-black/42"}`}>Reports are private. Add enough detail for the listing to be reviewed properly.</p>
            {error ? <p className="mt-3 text-xs font-bold text-red-500">{error}</p> : null}
            <div className="mt-5 grid grid-cols-[.8fr_1.2fr] gap-2"><button type="button" onClick={onClose} className="h-12 rounded-2xl border border-current/15 text-xs font-black uppercase tracking-[.08em]">Cancel</button><button type="button" onClick={save} disabled={reason.trim().length < 5} className="h-12 rounded-2xl bg-[#f6b800] text-xs font-black uppercase tracking-[.08em] text-black disabled:opacity-35">Send report</button></div>
          </div>
        )}
      </section>
    </div>
  );
}
