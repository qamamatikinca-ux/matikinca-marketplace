"use client";

import { useEffect, useMemo, useState } from "react";
import type { DealerAnalytics, DealerAppointment, DealerInsight, DealerInventoryItem, DealerLead, DealerSection, DealerSummary, DealerWorkspaceState } from "@/lib/dealer/types";
import { dealerFetch, relativeAge } from "@/lib/dealer/client";
import DealerIntelligencePanel from "./DealerIntelligencePanel";
import DealerStatusComposer from "./DealerStatusComposer";
import { EmptyState, Metric, PrimaryButton, SecondaryButton, SectionHeading, Surface } from "./ui";

const EMPTY_WEEK: DealerAnalytics = { range_days: 7, totals: { showroom_views: 0, vehicle_views: 0, search_appearances: 0, saves: 0, enquiries: 0, leads: 0, won: 0, response_rate: 0, avg_response_minutes: null, followers_gained: 0 }, lead_sources: [], stock_performance: [], salesperson_performance: [], daily: [] };

export default function DealerOverview({ darkMode, context, summary, leads, appointments, insights, inventory, setSection, onRefresh }: {
  darkMode: boolean;
  context: DealerWorkspaceState;
  summary: DealerSummary;
  leads: DealerLead[];
  appointments: DealerAppointment[];
  insights: DealerInsight[];
  inventory: DealerInventoryItem[];
  setSection: (section: DealerSection) => void;
  onRefresh: () => void | Promise<void>;
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
    <DealerStatusComposer darkMode={darkMode} open={statusOpen} onClose={() => setStatusOpen(false)} inventory={inventory} context={context} onDone={() => { void onRefresh(); }} />

    <Surface darkMode={darkMode} className="overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
        <div className="p-4 sm:p-5">
          <div className="text-[10px] font-black uppercase tracking-[.1em] opacity-40">{today}</div>
          <h2 className="mt-1 text-[22px] font-black tracking-[-.035em]">Dealership home</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 opacity-55">Sales, stock and customer activity that needs attention today.</p>
        </div>
        <div className={`flex items-center gap-2 border-t p-4 lg:border-l lg:border-t-0 ${darkMode ? "border-white/10" : "border-black/10"}`}>
          <SecondaryButton darkMode={darkMode} type="button" onClick={() => setSection("messages")}>Messages{summary.unread_messages ? ` · ${summary.unread_messages}` : ""}</SecondaryButton>
          <PrimaryButton type="button" onClick={() => setStatusOpen(true)}>Post Status</PrimaryButton>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-current/10 bg-current/10 md:grid-cols-3 xl:grid-cols-6">
        <Metric darkMode={darkMode} label="Live stock" value={summary.live_stock} />
        <Metric darkMode={darkMode} label="New leads" value={summary.new_leads} attention={summary.new_leads > 0} />
        <Metric darkMode={darkMode} label="Follow-ups" value={summary.overdue_followups} attention={summary.overdue_followups > 0} />
        <Metric darkMode={darkMode} label="Unread chats" value={summary.unread_messages} attention={summary.unread_messages > 0} />
        <Metric darkMode={darkMode} label="Viewings" value={summary.appointments_today} />
        <Metric darkMode={darkMode} label="Response rate" value={`${Math.round(summary.response_rate || 0)}%`} />
      </div>
    </Surface>

    <div className="grid gap-3 lg:grid-cols-[1.08fr_.92fr] sm:gap-4">
      <Surface darkMode={darkMode} className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-current/10 px-4 py-4 sm:px-5">
          <SectionHeading title="Today" detail="Next customer actions." />
          <button type="button" onClick={() => setSection("leads")} className="shrink-0 text-xs font-black opacity-60 hover:opacity-100">Sales pipeline →</button>
        </div>
        {appointments.length || priorities.length ? <div className="divide-y divide-current/10">
          {appointments.slice(0, 2).map((item) => <div key={item.id} className="px-4 py-3.5 sm:px-5"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-black">{item.customer_name || "Customer viewing"}</div><div className="mt-1 truncate text-xs opacity-55">{item.listing_title || item.appointment_type} · {new Date(item.starts_at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}</div></div><span className="shrink-0 text-[10px] font-black uppercase opacity-45">Viewing</span></div></div>)}
          {priorities.map((lead) => <button key={lead.id} type="button" onClick={() => setSection("leads")} className="w-full px-4 py-3.5 text-left sm:px-5"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-black">{lead.customer_name || "Customer follow-up"}</div><div className="mt-1 truncate text-xs opacity-55">{lead.listing_title || lead.source}{lead.priority === "high" ? " · high activity" : ""}</div></div><span className="shrink-0 text-xs font-black opacity-45">{relativeAge(lead.last_activity_at || lead.created_at)}</span></div></button>)}
        </div> : <EmptyState title="Your day is clear" detail="New leads, follow-ups and appointments will appear here." />}
      </Surface>

      <Surface darkMode={darkMode} className="overflow-hidden">
        <div className="border-b border-current/10 px-4 py-4 sm:px-5"><SectionHeading title="Quick actions" detail="The jobs used most often." /></div>
        <div className="grid grid-cols-2 gap-px bg-current/10">
          <QuickAction darkMode={darkMode} title="Post Status" detail={summary.active_statuses ? `${summary.active_statuses} live now` : "Photo, video, vehicle or offer"} onClick={() => setStatusOpen(true)} />
          <QuickAction darkMode={darkMode} title="Manage stock" detail={`${summary.live_stock} live vehicles`} onClick={() => setSection("inventory")} />
          <QuickAction darkMode={darkMode} title="Customers" detail="Contacts and history" onClick={() => setSection("customers")} />
          <QuickAction darkMode={darkMode} title="Showroom" detail={context.showroom_status === "live" ? "Public showroom live" : "Preview and publish"} onClick={() => setSection("showroom")} />
        </div>
      </Surface>
    </div>

    {attention.length ? <Surface darkMode={darkMode} className="overflow-hidden"><div className="border-b border-current/10 px-4 py-3.5 sm:px-5"><SectionHeading title="Needs attention" detail="Only issues that require action." /></div><div className="grid sm:grid-cols-2 xl:grid-cols-4">{attention.map((item) => <button key={item.label} type="button" onClick={() => setSection(item.section)} className="border-b border-current/10 p-4 text-left sm:border-r"><div className="text-[10px] font-black uppercase tracking-[.09em] opacity-40">{item.label}</div><div className="mt-2 text-sm font-black capitalize">{item.detail}</div></button>)}</div></Surface> : null}

    <DealerIntelligencePanel darkMode={darkMode} insights={insights} setSection={setSection} />

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Small darkMode={darkMode} label="This week" value={week.totals.vehicle_views.toLocaleString()} detail="vehicle views" />
      <Small darkMode={darkMode} label="This week" value={week.totals.leads} detail="new leads" />
      <Small darkMode={darkMode} label="30 days" value={summary.sold_30d} detail="vehicles sold" />
      <Small darkMode={darkMode} label="Audience" value={summary.followers.toLocaleString()} detail="followers" />
    </div>
  </div>;
}

function QuickAction({ darkMode, title, detail, onClick }: { darkMode: boolean; title: string; detail: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`min-h-[104px] p-4 text-left transition hover:opacity-75 ${darkMode ? "bg-[#0c0c0c]" : "bg-white"}`}><div className="text-sm font-black">{title}</div><div className="mt-1.5 text-xs leading-5 opacity-50">{detail}</div></button>;
}

function Small({ darkMode, label, value, detail }: { darkMode: boolean; label: string; value: string | number; detail: string }) {
  return <Surface darkMode={darkMode} className="p-4"><div className="text-[9px] font-black uppercase tracking-[.1em] opacity-35">{label}</div><div className="mt-2 text-2xl font-black tracking-[-.04em] sm:text-3xl">{value}</div><div className="mt-1 text-xs opacity-50 sm:text-sm">{detail}</div></Surface>;
}
