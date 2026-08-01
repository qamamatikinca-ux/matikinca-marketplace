"use client";

export function loadLinkPageItems(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
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
  if (total <= 1) return null;
  const items = loadLinkPageItems(current, total);
  const idle = darkMode ? "border-white/15 bg-white/[.04] text-white" : "border-black/15 bg-white text-black";
  const button = `flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-xs font-black transition disabled:opacity-30 ${idle}`;

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label={label}>
      <button type="button" className={button} disabled={current === 1} onClick={() => onChange(current - 1)} aria-label="Previous page">‹</button>
      {items.map((item, index) => item === "…" ? (
        <span key={`ellipsis-${index}`} className={`${button} pointer-events-none`} aria-hidden="true">…</span>
      ) : (
        <button
          type="button"
          key={item}
          onClick={() => onChange(item)}
          aria-current={item === current ? "page" : undefined}
          className={`${button} ${item === current ? "border-[#f6b800] bg-[#f6b800] text-black" : ""}`}
        >
          {item}
        </button>
      ))}
      <button type="button" className={button} disabled={current === total} onClick={() => onChange(current + 1)} aria-label="Next page">›</button>
    </nav>
  );
}
