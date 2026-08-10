"use client";

import type { DealerInsight, DealerSection } from "@/lib/dealer/types";
import { EmptyState, SectionHeading, Surface } from "./ui";

export default function DealerIntelligencePanel({ darkMode, insights, setSection }: { darkMode: boolean; insights: DealerInsight[]; setSection: (section: DealerSection) => void }) {
  const ordered = [...insights].sort((a, b) => ({ important: 0, recommended: 1, insight: 2 }[a.severity] - { important: 0, recommended: 1, insight: 2 }[b.severity]));
  return <Surface darkMode={darkMode} className="overflow-hidden">
    <div className="border-b border-current/10 px-4 py-4 sm:px-5"><SectionHeading title="Needs attention" detail="Only items that can improve sales, stock quality or account health appear here." /></div>
    {ordered.length ? <div className="divide-y divide-current/10">{ordered.slice(0, 7).map((item) => <button key={item.id} type="button" onClick={() => item.action_section && setSection(item.action_section)} className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-current/[.025] sm:px-5"><span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.severity === "important" ? "bg-red-500" : item.severity === "recommended" ? "bg-[#f6b800]" : "bg-current opacity-30"}`} /><span className="min-w-0 flex-1"><span className="block text-sm font-black">{item.title}</span><span className="mt-1 block text-sm leading-5 opacity-55">{item.message}</span></span>{item.action_label ? <span className="shrink-0 text-xs font-black opacity-65">{item.action_label}</span> : null}</button>)}</div> : <EmptyState title="Nothing urgent" detail="LoadLink will surface stock, lead, verification, billing and marketing actions here when they matter." />}
  </Surface>;
}
