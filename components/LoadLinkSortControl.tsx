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
        <div data-loadlink-vehicle-sort-sheet="true"
          className="fixed inset-0 z-[2147483590] flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm sm:p-6"
          role="dialog" aria-modal="true" aria-labelledby="vehicle-sort-filter-heading"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setSheetOpen(false); }}>
          <section className={["w-full max-w-[560px] rounded-[26px] border px-4 py-4 shadow-2xl sm:px-6 sm:py-5",
            darkMode ? "border-white/20 bg-[#171717] text-white" : "border-black/10 bg-white text-[#171717]"].join(" ")}>
            <div className="flex items-center justify-between gap-3">
              <h2 id="vehicle-sort-filter-heading" className="text-[19px] font-bold tracking-tight">Sort & filter</h2>
              <button ref={closeRef} type="button" onClick={() => setSheetOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-current/15"
                aria-label="Close sorting options"><LoadLinkIcon name="close" size={16} /></button>
            </div>
            <fieldset className="mt-4">
              <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider opacity-60">Sort order</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {options.map(option => (
                  <button key={option.value} type="button" onClick={() => onChange(option.value)}
                    aria-pressed={value === option.value}
                    className={["flex min-h-12 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-[12px] font-semibold",
                      value === option.value ? "border-[#f6b800] bg-[#f6b800] text-black" :
                      darkMode ? "border-white/20 bg-white/[.04]" : "border-black/10 bg-[#f7f7f7]"].join(" ")}>
                    <span>{option.label}</span>
                    {value === option.value && <LoadLinkIcon name="check" size={16} />}
                  </button>
                ))}
              </div>
            </fieldset>
            {equipment ? (
              <label className="mt-4 block">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider opacity-60">Equipment type</span>
                <select value={equipment.value} onChange={event => equipment.onChange(event.target.value)}
                  aria-label="Equipment type"
                  className={["h-12 w-full rounded-xl border px-3 text-sm font-semibold outline-none focus:border-[#f6b800]",
                    darkMode ? "border-white/20 bg-[#252525] text-white" : "border-black/10 bg-[#f7f7f7] text-black"].join(" ")}>
                  {equipment.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            ) : null}
            <fieldset className="mt-4">
              <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider opacity-60">Buying or renting</legend>
              <div className="grid grid-cols-3 gap-2">
                {filter.options.map(option => (
                  <button key={option.value} type="button" onClick={() => filter.onChange(option.value)}
                    aria-pressed={filter.value === option.value}
                    className={["flex min-h-11 items-center justify-center rounded-xl border px-2 text-center text-[11px] font-semibold",
                      filter.value === option.value ? "border-[#f6b800] bg-[#f6b800] text-black" :
                      darkMode ? "border-white/20 bg-white/[.04]" : "border-black/10 bg-[#f7f7f7]"].join(" ")}>{option.label}</button>
                ))}
              </div>
            </fieldset>
            <button type="button" onClick={() => setSheetOpen(false)}
              className="mt-5 min-h-12 w-full rounded-xl bg-[#f6b800] px-5 text-sm font-bold text-black">
              {typeof filter.resultCount === "number" ? "Show " + filter.resultCount + " listing" + (filter.resultCount === 1 ? "" : "s") : "Show listings"}
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
