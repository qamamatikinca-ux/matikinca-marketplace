"use client";

import type { DealerInsight, DealerSection } from "@/lib/dealer/types";
import { EmptyState, Surface } from "./ui";

export default function DealerIntelligencePanel({ darkMode, insights, setSection }: { darkMode: boolean; insights: DealerInsight[]; setSection: (section: DealerSection) => void }) {
  const ordered = [...insights]
    .sort((a, b) => ({ important: 0, recommended: 1, insight: 2 }[a.severity] - { important: 0, recommended: 1, insight: 2 }[b.severity]) || String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .slice(0, 6);
  const muted = darkMode ? "text-white/48" : "text-black/48";

  return (
    <Surface darkMode={darkMode} className="overflow-hidden rounded-[24px]">
      <div className="flex flex-col gap-3 border-b border-current/10 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-black tracking-[-.025em]">Dealer Assistant</h2>
            {ordered.some((item) => item.severity === "important") ? <span className="h-2 w-2 rounded-full bg-[#f6b800]" aria-label="Important action available" /> : null}
          </div>
          <p className={`mt-1 max-w-2xl text-[10px] font-semibold leading-4 ${muted}`}>Based on your live stock, leads, enquiries, quotes, showroom activity, verification and billing. Nothing is changed or sent without you.</p>
        </div>
        <span className={`text-[9px] font-black uppercase tracking-[.1em] ${muted}`}>{ordered.length ? `${ordered.length} action${ordered.length === 1 ? "" : "s"}` : "All clear"}</span>
      </div>

      {ordered.length ? (
        <div className="divide-y divide-current/10">
          {ordered.map((item) => {
            const actionable = Boolean(item.action_section);
            const body = (
              <>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.severity === "important" ? "bg-[#f6b800]" : item.severity === "recommended" ? "bg-current opacity-45" : "bg-current opacity-20"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-black sm:text-[13px]">{item.title}</span>
                  <span className={`mt-1 block text-[11px] font-semibold leading-5 ${muted}`}>{item.message}</span>
                </span>
                {item.action_label ? <span className="shrink-0 self-center text-[9px] font-black text-[#b88900]">{item.action_label}</span> : null}
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
        <EmptyState title="No immediate action" detail="LoadLink will surface real stock, lead, marketing, verification or billing actions here when something needs attention." />
      )}
    </Surface>
  );
}
