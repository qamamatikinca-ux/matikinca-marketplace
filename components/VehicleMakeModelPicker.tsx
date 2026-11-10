"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type MarketBrand = {
  name: string;
  count: number;
  models: Array<{ name: string; count: number }>;
};

type Props = {
  darkMode: boolean;
  title: string;
  brands: MarketBrand[];
  currentMake: string;
  currentModel: string;
  initialPanel?: "makes" | "models";
  onChoose: (make: string, model: string) => void;
  onClose: () => void;
};

/** Brand -> model selector based on LoadLink's own vehicle catalogue and real inventory. */
export default function VehicleMakeModelPicker({
  darkMode, title, brands, currentMake, currentModel,
  initialPanel = "makes", onChoose, onClose,
}: Props) {
  const [activeMake, setActiveMake] = useState(() => initialPanel === "models" && currentMake ? currentMake : "");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const brand = brands.find(item => item.name === activeMake);
  const normalized = query.trim().toLowerCase();
  const results = useMemo(() => {
    const source = activeMake ? (brand?.models || []) : brands;
    return source.filter(item => item.name.toLowerCase().includes(normalized));
  }, [brands, brand, activeMake, normalized]);

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const listener = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", listener);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", listener);
    };
  }, [onClose]);

  const border = darkMode ? "border-white/10" : "border-black/10";
  const subdued = darkMode ? "text-[#c6c8ca]" : "text-[#575c63]";

  return (
    <div className="fixed inset-0 z-[2147483580] flex items-end justify-center bg-black/50 backdrop-blur-[4px] sm:items-center sm:p-5"
      role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label={activeMake ? "Select model" : "Select make"}
        className={"flex h-[100dvh] w-full max-w-[560px] flex-col overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,.2)] sm:h-[min(90dvh,850px)] sm:rounded-[24px] " + (darkMode ? "bg-[#141414] text-white" : "bg-white text-[#161616]")}>
        <header className={"flex min-h-[72px] shrink-0 items-center gap-3 border-b px-4 sm:px-5 " + border}>
          <button type="button" aria-label={activeMake ? "Back to manufacturers" : "Close make and model selector"}
            onClick={() => { if (activeMake) { setActiveMake(""); setQuery(""); } else onClose(); }}
            className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-xl " + border}>
            <span aria-hidden="true">‹</span>
          </button>
          <div className="min-w-0 flex-1">
            <p className={"text-[10px] font-bold uppercase tracking-[.13em] " + subdued}>{title}</p>
            <h2 className="truncate text-base font-bold">{activeMake ? activeMake + " models" : "Select make, model, variant"}</h2>
          </div>
          <button type="button" onClick={onClose} className={"min-h-10 shrink-0 rounded-full px-3 text-xs font-semibold " + subdued}>Close</button>
        </header>

        <div className={"shrink-0 border-b p-4 " + border}>
          <label className="sr-only" htmlFor="marketplace-make-model-search">{activeMake ? "Search models" : "Search manufacturers"}</label>
          <input ref={searchRef} id="marketplace-make-model-search" type="search"
            placeholder={activeMake ? "Search " + activeMake + " models" : "Enter make, model, variant"}
            value={query} onChange={event => setQuery(event.target.value)}
            className={"h-12 w-full rounded-xl border px-4 text-base outline-none focus:border-[#f6b800] " +
              (darkMode ? "border-white/25 bg-[#202020] text-white placeholder:text-white/65" : "border-black/15 bg-[#fafafa] text-black placeholder:text-black/40")} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" role="list">
          {!normalized ? (
            <button type="button" onClick={() => onChoose(activeMake, "")}
              className={"flex min-h-[68px] w-full items-center gap-4 border-b px-5 text-left " + border + (darkMode ? " text-white hover:bg-white/[.055]" : " hover:bg-black/[.025]")}>
              <span className={"flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 " +
                ((!activeMake && !currentMake) || (activeMake && !currentModel) ? "border-[#f6b800] bg-[#f6b800] text-black" : border)}>
                {(!activeMake && !currentMake) || (activeMake && !currentModel) ? "✓" : ""}
              </span>
              <span className="flex-1 text-[15px] font-semibold">{activeMake ? "Any model" : "Any make"}</span>
            </button>
          ) : null}
          {results.map(option => {
            const isMake = !activeMake;
            const selected = isMake ? currentMake === option.name : currentMake === activeMake && currentModel === option.name;
            return (
              <div key={option.name} role="listitem"
                className={"flex min-h-[70px] items-center gap-2 border-b px-4 transition-colors " + border + (darkMode ? " hover:bg-white/[.055]" : " hover:bg-black/[.025]")}>
                <button type="button" onClick={() => { if (isMake) { setActiveMake(option.name); setQuery(""); } else { onChoose(activeMake, option.name); } }}
                  className="flex min-h-[65px] min-w-0 flex-1 items-center gap-3 text-left">
                  <span className={"flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-xs font-bold " +
                    (selected ? "border-[#f6b800] bg-[#f6b800] text-black" : darkMode ? "border-white/40" : "border-[#687082]")}>
                    {selected ? "✓" : ""}
                  </span>
                  <span className={"min-w-0 truncate text-[15px] font-semibold " + (darkMode ? "text-[#fafafa]" : "text-[#171717]")}>{option.name}</span>
                  <span className={"shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                    (darkMode ? "bg-white/10 text-[#ededed]" : "bg-[#f2f3f5] text-[#4d5663]")}>{option.count}</span>
                </button>
                {isMake ? (
                  <button type="button" aria-label={"Show " + option.name + " models"}
                    onClick={() => { setActiveMake(option.name); setQuery(""); searchRef.current?.focus(); }}
                    className={"min-h-10 shrink-0 rounded-full border px-3 text-[12px] font-semibold " +
                      (darkMode ? "border-white/25 text-[#f6b800]" : "border-black/10 text-[#926b00]")}>
                    Models <span aria-hidden="true">›</span>
                  </button>
                ) : null}
              </div>
            );
          })}
          {!results.length ? <p className={"p-6 text-center text-sm " + subdued}>No matching {activeMake ? "models" : "makes"}. Try another search.</p> : null}
        </div>
        <footer className={"shrink-0 border-t px-4 py-3 " + border}>
          <button type="button" onClick={onClose}
            className="min-h-12 w-full rounded-xl bg-[#f6b800] px-5 text-sm font-bold text-black">
            View vehicle listings
          </button>
        </footer>
      </section>
    </div>
  );
}
