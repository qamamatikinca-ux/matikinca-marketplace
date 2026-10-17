"use client";

import { useEffect, useRef, useState } from "react";
import LoadLinkIcon from "@/components/LoadLinkIcon";

type SortOption = { value: string; label: string; description?: string };

type ListingFilter = {
  value: string;
  onChange: (value: string) => void;
  options: readonly SortOption[];
  resultCount?: number;
};

/** Shared View Jobs sorting style; optional organised listing-type filter for vehicles. */
export default function LoadLinkSortControl({
  value,
  onChange,
  options,
  darkMode,
  className = "",
  filter,
  equipment,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly SortOption[];
  darkMode: boolean;
  className?: string;
  filter?: ListingFilter;
  equipment?: ListingFilter;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!sheetOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
      if (event.key !== "Tab") return;
      const dialog = document.querySelector<HTMLElement>('[data-loadlink-vehicle-sort-sheet="true"]');
      const focusable = Array.from(dialog?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') || []);
      if (!focusable.length) return;
      const current = focusable.indexOf(document.activeElement as HTMLButtonElement);
      if (event.shiftKey && current <= 0) {
        event.preventDefault();
        focusable[focusable.length - 1]?.focus();
      } else if (!event.shiftKey && current === focusable.length - 1) {
        event.preventDefault();
        focusable[0]?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [sheetOpen]);

  const classes = `loadlink-sort-control inline-flex min-h-11 max-w-full items-center gap-2 rounded-xl border px-3 text-xs font-bold ${darkMode ? "border-white/15 bg-[#111] text-white" : "border-black/10 bg-white text-black"} ${className}`;

  if (!filter) {
    return (
      <label data-loadlink-shared-sort="view-jobs" className={classes}>
        <span className={`shrink-0 text-xs font-semibold ${darkMode ? "text-white/55" : "text-black/55"}`}>Sort by</span>
        <select value={value} onChange={(event) => onChange(event.target.value)} aria-label="Sort by" className="min-w-0 max-w-[190px] flex-1 bg-transparent text-xs font-black outline-none focus-visible:ring-2 focus-visible:ring-[#f6b800]">
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
    );
  }

  return (
    <>
      <button
        type="button"
        data-loadlink-shared-sort="view-jobs"
        aria-haspopup="dialog"
        aria-expanded={sheetOpen}
        aria-label="Sort and filter vehicle listings"
        onClick={() => setSheetOpen(true)}
        className={classes}
      >
        <span>Sort by</span>
        <strong className="min-w-0 truncate text-xs font-black">{options.find((option) => option.value === value)?.label || "Newest first"}{filter.value !== "all" || (equipment && equipment.value !== "all") ? " · Filtered" : ""}</strong>
        <LoadLinkIcon name="chevronDown" size={15} className="shrink-0" />
      </button>

      {sheetOpen ? (
        <div
          data-loadlink-vehicle-sort-sheet="true"
          className="fixed inset-0 z-[2147483590] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[12px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vehicle-sort-filter-heading"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setSheetOpen(false); }}
        >
          <section className={`flex w-full max-w-[500px] max-h-[min(84dvh,820px)] flex-col overflow-hidden rounded-[28px] border p-4 shadow-[0_28px_90px_rgba(0,0,0,.2)] ${darkMode ? "border-white/20 bg-[#181818] text-white" : "border-white/90 bg-[#ebe9e5] text-black"}`}>
            <div className="flex shrink-0 items-center justify-between gap-4 px-1 pb-3">
              <h2 id="vehicle-sort-filter-heading" className="text-xl font-black uppercase tracking-[-.015em]">Sort &amp; filter</h2>
              <button ref={closeRef} type="button" onClick={() => setSheetOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-current/15" aria-label="Close sorting options">
                <LoadLinkIcon name="close" size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-1 touch-pan-y [-webkit-overflow-scrolling:touch]">
              <h3 className={`mb-3 text-[11px] font-black uppercase tracking-[.16em] ${darkMode ? "text-white/55" : "text-black/50"}`}>Sort order</h3>
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={value === option.value}
                  onClick={() => onChange(option.value)}
                  className={`mb-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-[15px] border px-4 text-left text-sm font-bold ${value === option.value ? "border-[#f6b800] bg-[#f6b800] text-black" : darkMode ? "border-white/12 bg-white/[.045]" : "border-black/10 bg-white/[.48]"}`}
                >
                  <span>{option.label}</span>
                  {value === option.value ? <LoadLinkIcon name="check" size={17} strokeWidth={2.2} /> : null}
                </button>
              ))}
              <div className={`my-5 border-t ${darkMode ? "border-white/12" : "border-black/10"}`} />

              {equipment ? (
                <>
                  <h3 className={`mb-3 text-[11px] font-black uppercase tracking-[.16em] ${darkMode ? "text-white/55" : "text-black/50"}`}>Equipment type</h3>
                  {equipment.options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={equipment.value === option.value}
                      onClick={() => equipment.onChange(option.value)}
                      className={`mb-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-[15px] border px-4 text-left text-sm font-bold ${equipment.value === option.value ? "border-[#f6b800] bg-[#f6b800] text-black" : darkMode ? "border-white/12 bg-white/[.045]" : "border-black/10 bg-white/[.48]"}`}
                    >
                      <span>{option.label}</span>
                      {equipment.value === option.value ? <LoadLinkIcon name="check" size={17} strokeWidth={2.2} /> : null}
                    </button>
                  ))}
                  <div className={`my-5 border-t ${darkMode ? "border-white/12" : "border-black/10"}`} />
                </>
              ) : null}
              <h3 className={`mb-3 text-[11px] font-black uppercase tracking-[.16em] ${darkMode ? "text-white/55" : "text-black/50"}`}>Buying or renting</h3>
              {filter.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={filter.value === option.value}
                  onClick={() => filter.onChange(option.value)}
                  className={`mb-2 flex min-h-14 w-full items-center justify-between gap-3 rounded-[15px] border px-4 text-left text-sm font-bold ${filter.value === option.value ? "border-[#f6b800] bg-[#f6b800] text-black" : darkMode ? "border-white/12 bg-white/[.045]" : "border-black/10 bg-white/[.48]"}`}
                >
                  <span className="min-w-0">
                    <span className="block">{option.label}</span>
                    {option.description ? <small className={`mt-1 block text-[11px] font-medium ${filter.value === option.value ? "text-black/65" : darkMode ? "text-white/50" : "text-black/50"}`}>{option.description}</small> : null}
                  </span>
                  {filter.value === option.value ? <LoadLinkIcon name="check" size={17} strokeWidth={2.2} /> : null}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setSheetOpen(false)} className="mt-3 min-h-12 shrink-0 rounded-[15px] bg-[#f6b800] px-5 text-sm font-black text-black">
              {typeof filter.resultCount === "number" ? `Show ${filter.resultCount} listing${filter.resultCount === 1 ? "" : "s"}` : "Show listings"}
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
