"use client";

import type { DealerInsight, DealerSection } from "@/lib/dealer/types";
import { EmptyState, Surface } from "./ui";

const weight = { important: 0, recommended: 1, insight: 2 } as const;

export default function DealerIntelligencePanel({ darkMode, insights, setSection }: { darkMode: boolean; insights: DealerInsight[]; setSection: (section: DealerSection) => void }) {
  const ordered = [...insights]
    .sort((a, b) => weight[a.severity] - weight[b.severity] || String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .slice(0, 5);
  const muted = darkMode ? "text-white/48" : "text-black/48";
  const important = ordered.filter((item) => item.severity === "important").length;

  return (
    <Surface darkMode={darkMode} className="overflow-hidden rounded-[22px]" data-loadlink-dealer-briefing="true">
      <div className="border-b border-current/10 px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-black tracking-[-.025em]">Dealer briefing</h2>
            <p className={`mt-1 max-w-2xl text-[10px] font-semibold leading-4 ${muted}`}>Real actions from your stock, leads, enquiries, quotes, showroom activity, verification and billing. LoadLink does not change anything for you.</p>
          </div>
          <span className={`shrink-0 rounded-full border border-current/10 px-2.5 py-1 text-[9px] font-black ${important ? "text-[#b88900]" : muted}`}>{important ? `${important} needs attention` : "No urgent items"}</span>
        </div>
      </div>

      {ordered.length ? (
        <div className="divide-y divide-current/10">
          {ordered.map((item) => {
            const actionable = Boolean(item.action_section);
            const label = item.severity === "important" ? "Needs attention" : item.severity === "recommended" ? "Next action" : "Watch";
            const body = (
              <>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.severity === "important" ? "bg-[#f6b800]" : item.severity === "recommended" ? "bg-current opacity-40" : "bg-current opacity-18"}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-[9px] font-black uppercase tracking-[.08em] ${muted}`}>{label}</span>
                  <span className="mt-0.5 block text-[12px] font-black sm:text-[13px]">{item.title}</span>
                  <span className={`mt-1 block text-[11px] font-semibold leading-5 ${muted}`}>{item.message}</span>
                </span>
                {item.action_label ? <span className="shrink-0 self-center text-[9px] font-black opacity-60">{item.action_label} →</span> : null}
              </>
            );
            return actionable ? (
              <button key={item.id} type="button" onClick={() => setSection(item.action_section as DealerSection)} className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-current/[.025] sm:px-5">{body}</button>
            ) : (
              <div key={item.id} className="flex items-start gap-3 px-4 py-4 sm:px-5">{body}</div>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Nothing needs attention" detail="New stock, lead, showroom, verification or billing actions will appear here when the live data gives you something useful to do." />
      )}
    </Surface>
  );
}
