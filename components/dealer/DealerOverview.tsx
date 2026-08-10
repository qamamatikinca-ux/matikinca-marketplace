"use client";

import { useEffect, useMemo, useState } from "react";
import type { DealerAnalytics, DealerAppointment, DealerInsight, DealerInventoryItem, DealerLead, DealerSection, DealerSummary, DealerWorkspaceState } from "@/lib/dealer/types";
import { dealerFetch, relativeAge } from "@/lib/dealer/client";
import DealerIntelligencePanel from "./DealerIntelligencePanel";
import DealerStatusComposer from "./DealerStatusComposer";
import { EmptyState, SectionHeading, Surface } from "./ui";

const EMPTY_WEEK: DealerAnalytics = { range_days: 7, totals: { showroom_views: 0, vehicle_views: 0, search_appearances: 0, saves: 0, enquiries: 0, leads: 0, won: 0, response_rate: 0, avg_response_minutes: null, followers_gained: 0 }, lead_sources: [], stock_performance: [], salesperson_performance: [], daily: [] };

export default function DealerOverview({ darkMode, context, summary, leads, appointments, insights, inventory, setSection, onRefresh }: {
  darkMode: boolean; context: DealerWorkspaceState; summary: DealerSummary; leads: DealerLead[]; appointments: DealerAppointment[];
  insights: DealerInsight[]; inventory: DealerInventoryItem[]; setSection: (section: DealerSection) => void; onRefresh: () => void | Promise<void>;
}) {
  const [week, setWeek] = useState<DealerAnalytics>(EMPTY_WEEK);
  const [statusOpen, setStatusOpen] = useState(false);
  useEffect(() => { void dealerFetch<DealerAnalytics>("/api/dealer/analytics?days=7").then(setWeek).catch(() => {}); }, []);

  const today = new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });
  const highLeads = leads.filter((lead) => lead.priority === "high" && !["won", "lost"].includes(lead.status));
  const overdue = leads.filter((lead) => lead.next_follow_up_at && new Date(lead.next_follow_up_at).getTime() < Date.now() && !["won", "lost"].includes(lead.status));
  const priorities = [...overdue, ...highLeads.filter((lead) => !overdue.some((item) => item.id === lead.id)), ...leads].filter((value, index, array) => array.findIndex((item) => item.id === value.id) === index).slice(0, 4);
  const attention = useMemo(() => {
    const items: Array<{ label: string; detail: string; section: DealerSection }> = [];
    const inventoryIssues = insights.filter((item) => item.kind === "inventory").length;
    if (summary.overdue_followups) items.push({ label: "Follow-ups", detail: `${summary.overdue_followups} overdue`, section: "leads" });
    if (inventoryIssues) items.push({ label: "Stock quality", detail: `${inventoryIssues} need attention`, section: "inventory" });
    if (context.verification_status === "changes_required") items.push({ label: "Verification", detail: "Changes required", section: "verification" });
    if (["past_due", "grace_period"].includes(context.subscription_status)) items.push({ label: "Billing", detail: context.subscription_status.replaceAll("_", " "), section: "billing" });
    return items;
  }, [context, insights, summary.overdue_followups]);

  return <div className="grid gap-3 sm:gap-4">
    <DealerStatusComposer darkMode={darkMode} open={statusOpen} onClose={() => setStatusOpen(false)} inventory={inventory} context={context} onDone={() => void onRefresh()} />

    <section className={`overflow-hidden rounded-3xl border ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
      <div className="p-4 sm:p-6">
        <div className="text-[10px] font-black uppercase tracking-[.12em] opacity-35">{today}</div>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-[25px] font-black tracking-[-.045em] sm:text-[30px]">Sales pulse</h2><p className="mt-1 max-w-xl text-sm leading-6 opacity-50">What matters at the dealership right now.</p></div>
          <button type="button" onClick={() => setStatusOpen(true)} className="h-11 rounded-full bg-[#f6b800] px-5 text-sm font-black text-black">Post Status</button>
        </div>
      </div>
      <div className="grid grid-cols-2 border-t border-current/10 sm:grid-cols-4">
        <PulseItem label="Live stock" value={summary.live_stock} detail="vehicles" />
        <PulseItem label="New leads" value={summary.new_leads} detail="waiting" attention={summary.new_leads > 0} />
        <PulseItem label="Follow-ups" value={summary.overdue_followups} detail="overdue" attention={summary.overdue_followups > 0} />
        <PulseItem label="Inbox" value={summary.unread_messages} detail="unread" attention={summary.unread_messages > 0} />
      </div>
    </section>

    <div className="grid gap-3 lg:grid-cols-[1.1fr_.9fr] sm:gap-4">
      <Surface darkMode={darkMode} className="overflow-hidden rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-current/10 px-4 py-4 sm:px-5"><SectionHeading title="Today" detail="Viewings and customer follow-ups." /><button type="button" onClick={() => setSection("leads")} className="shrink-0 text-xs font-black opacity-55">Open sales →</button></div>
        {appointments.length || priorities.length ? <div className="divide-y divide-current/10">
          {appointments.slice(0, 2).map((item) => <div key={item.id} className="px-4 py-3.5 sm:px-5"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-black">{item.customer_name || "Customer viewing"}</div><div className="mt-1 truncate text-xs opacity-50">{item.listing_title || item.appointment_type} · {new Date(item.starts_at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}</div></div><span className="shrink-0 rounded-full border border-current/10 px-2 py-1 text-[9px] font-black uppercase opacity-50">Viewing</span></div></div>)}
          {priorities.map((lead) => <button key={lead.id} type="button" onClick={() => setSection("leads")} className="w-full px-4 py-3.5 text-left sm:px-5"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-black">{lead.customer_name || "Customer follow-up"}</div><div className="mt-1 truncate text-xs opacity-50">{lead.listing_title || lead.source}{lead.priority === "high" ? " · high activity" : ""}</div></div><span className="shrink-0 text-xs font-black opacity-40">{relativeAge(lead.last_activity_at || lead.created_at)}</span></div></button>)}
        </div> : <EmptyState title="Your day is clear" detail="New leads, follow-ups and appointments will appear here." />}
      </Surface>

      <Surface darkMode={darkMode} className="overflow-hidden rounded-3xl">
        <div className="border-b border-current/10 px-4 py-4 sm:px-5"><SectionHeading title="Quick actions" detail="Fast access to daily dealership work." /></div>
        <div className="grid grid-cols-2">
          <Quick title="Status" detail={summary.active_statuses ? `${summary.active_statuses} live now` : "Photo, video, vehicle or offer"} onClick={() => setStatusOpen(true)} />
          <Quick title="Stock" detail={`${summary.live_stock} live vehicles`} onClick={() => setSection("inventory")} />
          <Quick title="Customers" detail="Contacts and history" onClick={() => setSection("customers")} />
          <Quick title="Showroom" detail={context.showroom_status === "live" ? "Public showroom live" : "Preview and publish"} onClick={() => setSection("showroom")} />
        </div>
      </Surface>
    </div>

    {attention.length ? <Surface darkMode={darkMode} className="overflow-hidden rounded-3xl"><div className="border-b border-current/10 px-4 py-3.5 sm:px-5"><SectionHeading title="Needs attention" detail="Only items that require action." /></div><div className="grid sm:grid-cols-2 xl:grid-cols-4">{attention.map((item) => <button key={item.label} type="button" onClick={() => setSection(item.section)} className="border-b border-current/10 p-4 text-left sm:border-r"><div className="text-[10px] font-black uppercase tracking-[.09em] opacity-35">{item.label}</div><div className="mt-2 text-sm font-black capitalize">{item.detail}</div></button>)}</div></Surface> : null}

    <DealerIntelligencePanel darkMode={darkMode} insights={insights} setSection={setSection} />

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Small darkMode={darkMode} label="Vehicle views" value={week.totals.vehicle_views.toLocaleString()} detail="this week" />
      <Small darkMode={darkMode} label="New leads" value={week.totals.leads} detail="this week" />
      <Small darkMode={darkMode} label="Sold" value={summary.sold_30d} detail="last 30 days" />
      <Small darkMode={darkMode} label="Followers" value={summary.followers.toLocaleString()} detail="dealership audience" />
    </div>
  </div>;
}

function PulseItem({ label, value, detail, attention }: { label: string; value: string | number; detail: string; attention?: boolean }) { return <div className="border-b border-r border-current/10 p-4 sm:p-5"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.09em] opacity-35">{attention ? <span className="h-1.5 w-1.5 rounded-full bg-[#f6b800]" /> : null}{label}</div><div className="mt-2 text-2xl font-black tracking-[-.04em]">{value}</div><div className="mt-0.5 text-[11px] opacity-40">{detail}</div></div>; }
function Quick({ title, detail, onClick }: { title: string; detail: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="min-h-[112px] border-b border-r border-current/10 p-4 text-left transition hover:bg-current/[.03]"><div className="text-sm font-black">{title}</div><div className="mt-1.5 text-xs leading-5 opacity-45">{detail}</div><div className="mt-4 text-xs font-black opacity-40">Open →</div></button>; }
function Small({ darkMode, label, value, detail }: { darkMode: boolean; label: string; value: string | number; detail: string }) { return <Surface darkMode={darkMode} className="rounded-2xl p-4"><div className="text-[9px] font-black uppercase tracking-[.1em] opacity-35">{label}</div><div className="mt-2 text-2xl font-black tracking-[-.04em] sm:text-3xl">{value}</div><div className="mt-1 text-xs opacity-45">{detail}</div></Surface>; }
