"use client";

import { useMemo, useState } from "react";

function toLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, Math.max(0, month - 1), day || 1);
}

function dateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function LoadLinkDatePicker({ value, onChange, min, darkMode, ariaLabel }: { value: string; onChange: (value: string) => void; min?: string; darkMode: boolean; ariaLabel: string }) {
  const initial = value ? toLocalDate(value) : new Date();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1));
  const minValue = min || "0000-01-01";

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const leading = (first.getDay() + 6) % 7;
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: leading + count }, (_, index) => index < leading ? null : new Date(month.getFullYear(), month.getMonth(), index - leading + 1));
  }, [month]);

  const label = value ? new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(toLocalDate(value)) : "Choose a date";
  const panel = darkMode ? "border-white/12 bg-[#0b0b0b] text-white" : "border-black/10 bg-[#fffdf8] text-black";
  const soft = darkMode ? "border-white/10 bg-white/[.035]" : "border-black/8 bg-black/[.025]";

  return (
    <>
      <button type="button" onClick={() => { setMonth(new Date(initial.getFullYear(), initial.getMonth(), 1)); setOpen(true); }} aria-label={ariaLabel} className={`flex h-12 w-full items-center justify-between rounded-[15px] border px-4 text-left text-sm font-semibold outline-none ${darkMode ? "border-white/12 bg-white/[.045] text-white" : "border-black/10 bg-white/[.62] text-black"}`}>
        <span>{label}</span><CalendarIcon />
      </button>
      {open ? (
        <div className="fixed inset-0 z-[2147483200] flex items-center justify-center bg-black/58 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm" role="presentation">
          <button type="button" aria-label="Close date picker" className="absolute inset-0" onClick={() => setOpen(false)} />
          <section role="dialog" aria-modal="true" aria-label={ariaLabel} className={`relative z-10 max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-[28px] border p-5 shadow-2xl ${panel}`}>
            <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#b78300]">Date</p><h2 className="mt-1 text-2xl font-black tracking-[-.04em]">Choose a date</h2></div><button type="button" onClick={() => setOpen(false)} className={`flex h-10 w-10 items-center justify-center rounded-full border text-xl ${soft}`} aria-label="Close">×</button></div>
            <div className="mt-5 flex items-center justify-between gap-3"><button type="button" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} className={`h-10 w-10 rounded-full border ${soft}`} aria-label="Previous month">‹</button><strong className="text-base font-black">{new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric" }).format(month)}</strong><button type="button" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} className={`h-10 w-10 rounded-full border ${soft}`} aria-label="Next month">›</button></div>
            <div className="mt-5 grid grid-cols-7 text-center text-[9px] font-black uppercase opacity-45">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((item) => <span key={item} className="py-2">{item}</span>)}</div>
            <div className="grid grid-cols-7 gap-1.5">{days.map((date, index) => {
              if (!date) return <span key={`empty-${index}`} className="aspect-square" />;
              const next = dateValue(date);
              const disabled = next < minValue;
              const selected = next === value;
              return <button key={next} type="button" disabled={disabled} onClick={() => { onChange(next); setOpen(false); }} className={`aspect-square rounded-xl text-sm font-bold transition disabled:opacity-20 ${selected ? "bg-[#f6b800] text-black" : darkMode ? "bg-white/[.035] hover:bg-white/[.08]" : "bg-black/[.025] hover:bg-black/[.06]"}`}>{date.getDate()}</button>;
            })}</div>
            <p className={`mt-4 text-center text-[10px] font-semibold ${darkMode ? "text-white/45" : "text-black/48"}`}>Tap a date to select it. No extra confirmation panel is required.</p>
          </section>
        </div>
      ) : null}
    </>
  );
}

function CalendarIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 6h14v14H5V6Zm3-3v5m8-5v5M5 10h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
