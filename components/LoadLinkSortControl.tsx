"use client";

/** Consistent View Jobs sorting interface; leaves each page's ordering logic untouched. */
type SortOption = { value: string; label: string };

export default function LoadLinkSortControl({
  value,
  onChange,
  options,
  darkMode,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly SortOption[];
  darkMode: boolean;
  className?: string;
}) {
  return (
    <label
      data-loadlink-shared-sort="view-jobs"
      className={`loadlink-sort-control inline-flex min-h-11 max-w-full items-center gap-2 rounded-xl border px-3 text-xs font-bold ${darkMode ? "border-white/15 bg-[#111] text-white" : "border-black/10 bg-white text-black"} ${className}`}
    >
      <span className={`shrink-0 text-xs font-semibold ${darkMode ? "text-white/55" : "text-black/55"}`}>Sort by</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Sort by"
        className="min-w-0 max-w-[190px] flex-1 bg-transparent text-xs font-black outline-none focus-visible:ring-2 focus-visible:ring-[#f6b800]"
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
