"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import MarketplaceCard, { type MarketplaceCardItem } from "@/components/platform/MarketplaceCard";

export default function DealerInventorySlider({ darkMode }: { darkMode: boolean }) {
  const [items, setItems] = useState<MarketplaceCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const rail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/job-listings?kind=vehicle&limit=18", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => { if (active) setItems((data.rows || []).filter((item: MarketplaceCardItem) => item.dealership_id)); })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (!loading && !items.length) return null;
  function move(direction: -1 | 1) { rail.current?.scrollBy({ left: direction * Math.max(300, rail.current.clientWidth * .85), behavior: "smooth" }); }

  return <section className={`border-y px-5 py-12 md:px-12 ${darkMode ? "border-white/10 bg-[#070707] text-white" : "border-black/10 bg-[#f8f5ec] text-black"}`}><div className="mx-auto max-w-7xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#b88900]">Verified dealership stock</p><h2 className="mt-2 text-3xl font-black md:text-5xl">Commercial vehicles ready to view</h2><p className={`mt-3 max-w-2xl text-sm leading-7 ${darkMode ? "text-white/55" : "text-black/55"}`}>Live approved inventory from LoadLink dealerships. Every card opens a permanent details page.</p></div><div className="flex gap-2"><button onClick={() => move(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-current/15" aria-label="Previous dealership vehicles">←</button><button onClick={() => move(1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f6b800] text-black" aria-label="Next dealership vehicles">→</button></div></div>{loading ? <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className={`aspect-[3/4] animate-pulse rounded-[22px] ${darkMode ? "bg-white/5" : "bg-black/5"}`} />)}</div> : <div ref={rail} className="no-scrollbar mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">{items.map((item) => <div key={item.id} className="w-[82vw] max-w-[310px] shrink-0 snap-start"><MarketplaceCard item={item} darkMode={darkMode} /></div>)}</div>}<Link href="/dealerships" className="mt-4 inline-flex text-xs font-black uppercase tracking-[.12em] text-[#b88900]">Browse all dealerships →</Link></div></section>;
}
