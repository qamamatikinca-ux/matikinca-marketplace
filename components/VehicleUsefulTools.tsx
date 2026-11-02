"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import LoadLinkIcon, { type LoadLinkIconName } from "@/components/LoadLinkIcon";

const tools: Array<{ title: string; subtitle: string; href: string; icon: LoadLinkIconName; kicker: string }> = [
  { title: "Truck finance calculator", subtitle: "Estimate monthly payments and explore commercial vehicles within your budget.", href: "/tools/truck-finance", icon: "wallet", kicker: "Buying" },
  { title: "Commercial vehicle price guide", subtitle: "Compare real asking prices for similar vehicles listed on LoadLink.", href: "/tools/vehicle-price-guide", icon: "truck", kicker: "Pricing" },
  { title: "Logistics document tools", subtitle: "Prepare rate quotes, trip briefs and other transport documents.", href: "/tools", icon: "tools", kicker: "Operations" },
  { title: "List your vehicle", subtitle: "Reach buyers and transport businesses through the LoadLink marketplace.", href: "/list-your-vehicle", icon: "plus", kicker: "Selling" },
];

export default function VehicleUsefulTools({ darkMode }: { darkMode: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const muted = darkMode ? "text-white/60" : "text-black/60";
  const panel = darkMode ? "border-white/15 bg-[#161716]" : "border-black/10 bg-white";
  const noScroll = "no-scrollbar";
  function changePage(index: number) {
    const node = scrollRef.current;
    const card = node?.querySelector<HTMLElement>("[data-loadlink-tool-card]");
    if (!node || !card) return;
    const gap = 12;
    node.scrollTo({ left: index * (card.offsetWidth + gap), behavior: "smooth" });
    setActive(index);
  }
  function updateFromScroll() {
    const node = scrollRef.current;
    const card = node?.querySelector<HTMLElement>("[data-loadlink-tool-card]");
    if (!node || !card) return;
    setActive(Math.min(tools.length - 1, Math.max(0, Math.round(node.scrollLeft / (card.offsetWidth + 12)))));
  }
  return (
    <section className="mt-8" aria-labelledby="loadlink-useful-tools-heading" data-loadlink-useful-tools="true">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="loadlink-useful-tools-heading" className="text-[22px] font-bold tracking-[-.035em]">Useful tools</h2>
          <p className={"mt-1 text-xs leading-5 " + muted}>Simple tools for buying, selling and running transport work.</p>
        </div>
        <Link href="/tools" className="shrink-0 text-xs font-semibold underline underline-offset-4">All tools</Link>
      </div>
      <div
        ref={scrollRef}
        data-loadlink-no-swipe-dots="true"
        onScroll={updateFromScroll}
        className={"mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [-webkit-overflow-scrolling:touch] " + noScroll}
        aria-label="Useful tools carousel"
      >
        {tools.map((tool) => (
          <Link
            key={tool.title}
            data-loadlink-tool-card
            href={tool.href}
            className={"flex min-h-[184px] w-[min(82vw,315px)] shrink-0 snap-start flex-col rounded-[17px] border p-5 text-left shadow-none transition-colors focus-visible:outline-2 focus-visible:outline-[#f6b800] sm:w-[305px] " + panel}
          >
            <div className="flex items-center justify-between gap-3">
              <span className={"inline-flex h-11 w-11 items-center justify-center rounded-xl " + (darkMode ? "bg-[#f6b800]/15 text-[#f6b800]" : "bg-[#fff5d3] text-[#886200]")}>
                <LoadLinkIcon name={tool.icon} size={23} />
              </span>
              <LoadLinkIcon name="arrowUpRight" size={19} />
            </div>
            <p className={"mt-5 text-[10px] font-bold uppercase tracking-[.1em] " + muted}>{tool.kicker}</p>
            <h3 className="mt-1 text-[16px] font-bold leading-[1.35]">{tool.title}</h3>
            <p className={"mt-2 text-xs leading-5 " + muted}>{tool.subtitle}</p>
          </Link>
        ))}
      </div>
      <div className="mt-1 flex items-center justify-center gap-2" aria-label="Select useful tool card">
        {tools.map((tool,index) => (
          <button key={tool.title} type="button" onClick={() => changePage(index)} aria-label={"Show " + tool.title} aria-current={index === active ? "true" : undefined} className={"h-[7px] rounded-full transition-all " + (index === active ? "w-8 bg-[#f6b800]" : darkMode ? "w-[7px] bg-white/25" : "w-[7px] bg-black/20")} />
        ))}
      </div>
    </section>
  );
}
