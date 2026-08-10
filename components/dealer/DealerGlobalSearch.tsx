"use client";

import { useEffect, useRef, useState } from "react";
import { dealerFetch } from "@/lib/dealer/client";
import type { DealerSearchResult, DealerSection } from "@/lib/dealer/types";

export default function DealerGlobalSearch({ darkMode, setSection }: { darkMode: boolean; setSection: (section: DealerSection) => void }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<DealerSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const seq = useRef(0);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setItems([]); setOpen(false); return; }
    const id = ++seq.current;
    const timer = window.setTimeout(() => {
      void dealerFetch<{ items: DealerSearchResult[] }>(`/api/dealer/search?q=${encodeURIComponent(q)}`).then((data) => { if (id === seq.current) { setItems(data.items || []); setOpen(true); } }).catch(() => { if (id === seq.current) setItems([]); });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  function choose(item: DealerSearchResult) {
    setOpen(false); setQuery("");
    if (item.href) { window.location.assign(item.href); return; }
    setSection(item.section);
    window.history.replaceState({}, "", `/dealer?section=${item.section}`);
  }

  return <div className="relative w-full"><input value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => { if (items.length) setOpen(true); }} placeholder="Search stock, customers, leads, quotes or messages" aria-label="Search Dealer" className={`h-11 w-full rounded-xl border px-4 text-sm font-semibold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/10 bg-[#111] text-white placeholder:text-white/28" : "border-black/10 bg-[#fbfaf6] text-black placeholder:text-black/30"}`} />{open ? <div className={`absolute left-0 right-0 top-[48px] z-40 max-h-[360px] overflow-y-auto border shadow-2xl ${darkMode ? "border-white/12 bg-[#0d0d0d]" : "border-black/10 bg-white"}`}>{items.length ? items.map((item) => <button type="button" key={`${item.type}-${item.id}`} onClick={() => choose(item)} className="flex w-full items-start gap-3 border-b border-current/8 px-4 py-3 text-left last:border-b-0 hover:bg-current/[.04]"><span className="mt-0.5 w-16 shrink-0 text-[10px] font-black uppercase tracking-[.08em] opacity-35">{item.type}</span><span className="min-w-0"><span className="block truncate text-sm font-black">{item.title}</span>{item.detail ? <span className="mt-1 block truncate text-xs opacity-50">{item.detail}</span> : null}</span></button>) : <div className="px-4 py-5 text-sm opacity-50">No Dealer records found.</div>}</div> : null}</div>;
}
