"use client";

export function loadLinkPageItems(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: Math.max(1, total) }, (_, index) => index + 1);
  if (current <= 5) return [1, 2, 3, 4, 5, 6, "…", total];
  if (current >= total - 4) return [1, "…", total - 5, total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

export default function LoadLinkPagination({
  current,
  total,
  onChange,
  darkMode,
  label = "Pages",
}: {
  current: number;
  total: number;
  onChange: (page: number) => void;
  darkMode: boolean;
  label?: string;
}) {
  const safeTotal = Math.max(1, total);
  const safeCurrent = Math.min(safeTotal, Math.max(1, current));
  const items = loadLinkPageItems(safeCurrent, safeTotal);
  const idle = darkMode ? "border-white/15 bg-[#111] text-white" : "border-black/12 bg-white text-black";
  const button = `flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl border px-3 text-xs font-black transition active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-25 ${idle}`;

  return (
    <nav className="mt-7" aria-label={label} data-loadlink-pagination="true">
      <div className={`mx-auto flex w-fit max-w-full items-center gap-2 overflow-x-auto rounded-2xl border p-2 no-scrollbar ${darkMode ? "border-white/10 bg-white/[.025]" : "border-black/[.07] bg-white/80"}`}>
        <button type="button" className={button} disabled={safeCurrent === 1} onClick={() => onChange(safeCurrent - 1)} aria-label="Previous page">‹</button>
        {items.map((item, index) => item === "…" ? (
          <span key={`ellipsis-${index}`} className="flex h-10 min-w-7 shrink-0 items-center justify-center text-xs font-black opacity-35" aria-hidden="true">…</span>
        ) : (
          <button
            type="button"
            key={item}
            onClick={() => onChange(item)}
            aria-label={`Page ${item}`}
            aria-current={item === safeCurrent ? "page" : undefined}
            className={`${button} ${item === safeCurrent ? "!border-[#f6b800] !bg-[#f6b800] !text-black shadow-[0_6px_18px_rgba(246,184,0,.2)]" : ""}`}
          >
            {item}
          </button>
        ))}
        <button type="button" className={button} disabled={safeCurrent === safeTotal} onClick={() => onChange(safeCurrent + 1)} aria-label="Next page">›</button>
      </div>
    </nav>
  );
}
