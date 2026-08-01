"use client";

import { ReactNode, useEffect } from "react";

export default function FilterDrawer({ open, title, activeCount, resultCount, children, darkMode, onClose, onApply, onClear }: { open: boolean; title: string; activeCount: number; resultCount: number; children: ReactNode; darkMode: boolean; onClose: () => void; onApply: () => void; onClear: () => void }) {
  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", key); };
  }, [onClose, open]);

  if (!open) return null;
  return <div className="fixed inset-0 z-[10000] bg-black/70 lg:hidden"><button className="absolute inset-0" onClick={onClose} aria-label="Close filters" /><aside role="dialog" aria-modal="true" aria-label={title} className={`absolute inset-y-0 right-0 flex w-[min(92vw,440px)] flex-col border-l shadow-2xl ${darkMode ? "border-white/10 bg-[#090909] text-white" : "border-black/10 bg-white text-black"}`}><header className={`flex items-center justify-between border-b px-5 py-4 ${darkMode ? "border-white/10" : "border-black/10"}`}><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#b88900]">{activeCount} active</p><h2 className="mt-1 text-2xl font-black">{title}</h2></div><button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-current/15 text-xl" aria-label="Close filters">×</button></header><div className="flex-1 overflow-y-auto p-5">{children}</div><footer className={`grid grid-cols-2 gap-2 border-t p-4 ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}><button onClick={onClear} className="h-12 rounded-xl border border-current/15 text-xs font-black uppercase">Clear</button><button onClick={onApply} className="h-12 rounded-xl bg-[#f6b800] text-xs font-black uppercase text-black">Show {resultCount} results</button></footer></aside></div>;
}
