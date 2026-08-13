"use client";

import { useState } from "react";

type SourceOption = {
  id: string;
  label: string;
  meta?: string;
  image?: string;
};

type Props = {
  sources: SourceOption[];
  value: string;
  darkMode: boolean;
  onChange: (id: string) => void;
};

export default function LoadLinkPostSourcePicker({ sources, value, darkMode, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selected = sources.find((source) => source.id === value) || null;
  return (
    <div className="relative mt-1">
      <button type="button" onClick={() => setOpen((current) => !current)} className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-[11px] font-bold ${darkMode ? "border-white/15 bg-[#151515] text-white" : "border-black/10 bg-white text-black"}`} aria-expanded={open}>
        <span className="min-w-0 flex-1 truncate">{selected ? selected.label : "Choose a LoadLink post…"}</span>
        <span className="text-[#f6b800]">⌄</span>
      </button>
      {open ? (
        <div role="listbox" className={`absolute left-0 right-0 top-[calc(100%+8px)] z-[180] max-h-[min(55svh,430px)] overflow-y-auto overscroll-contain rounded-[20px] border p-2 shadow-2xl touch-pan-y ${darkMode ? "border-white/12 bg-[#0c0c0c]" : "border-black/10 bg-white"}`}>
          {sources.map((source) => (
            <button key={source.id} type="button" role="option" aria-selected={source.id === value} onClick={() => { onChange(source.id); setOpen(false); }} className={`mb-1 grid min-h-[82px] w-full grid-cols-[64px_minmax(0,1fr)_24px] items-center gap-3 rounded-2xl border p-2 text-left ${source.id === value ? "border-[#f6b800] bg-[#f6b800]/10" : darkMode ? "border-white/10" : "border-black/10"}`}>
              <span className="h-16 w-16 overflow-hidden rounded-xl bg-black">
                {source.image ? <img src={source.image} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-[9px] font-black uppercase text-[#f6b800]">LoadLink</span>}
              </span>
              <span className="min-w-0"><strong className="block truncate text-xs font-black">{source.label.replace(/^Current post\s*·\s*/i, "")}</strong><span className={`mt-1 block truncate text-[10px] font-semibold ${darkMode ? "text-white/45" : "text-black/45"}`}>{source.meta || "Your post"}</span></span>
              <span className="text-center text-lg font-black text-[#f6b800]">{source.id === value ? "✓" : "›"}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
