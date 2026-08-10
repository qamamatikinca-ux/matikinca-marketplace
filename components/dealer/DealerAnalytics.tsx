"use client";

import { useEffect, useMemo, useState } from "react";
import { dealerFetch } from "@/lib/dealer/client";
import type { DealerAnalytics as AnalyticsType } from "@/lib/dealer/types";
import { EmptyState, Metric, SectionHeading, Select, Surface } from "./ui";

const empty: AnalyticsType = { range_days: 30, totals: { showroom_views: 0, vehicle_views: 0, search_appearances: 0, saves: 0, enquiries: 0, leads: 0, won: 0, response_rate: 0, avg_response_minutes: null, followers_gained: 0 }, lead_sources: [], stock_performance: [], salesperson_performance: [], daily: [] };

export default function DealerAnalytics({ darkMode }: { darkMode: boolean }) {
  const [range, setRange] = useState("30");
  const [data, setData] = useState<AnalyticsType>(empty);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setLoading(true); void dealerFetch<AnalyticsType>(`/api/dealer/analytics?days=${range}`).then(setData).catch(() => setData({ ...empty, range_days: Number(range) })).finally(() => setLoading(false)); }, [range]);
  const conversion = data.totals.leads ? Math.round((data.totals.won / data.totals.leads) * 100) : 0;
  const maxDaily = useMemo(() => Math.max(1, ...data.daily.map((d) => d.views)), [data.daily]);

  return <div className="grid gap-4">
    <Surface darkMode={darkMode} className="p-4 sm:p-5"><SectionHeading title="Analytics" detail="Performance based on actual LoadLink views, enquiries, leads, responses and Dealer Status activity." action={<div className="w-36"><Select darkMode={darkMode} value={range} onChange={(e) => setRange(e.target.value)}><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option></Select></div>} /></Surface>
    {loading ? <Surface darkMode={darkMode} className="px-5 py-14 text-center text-sm font-bold opacity-45">Loading performance…</Surface> : <>
      <div className="grid grid-cols-2 gap-px overflow-hidden border border-current/10 bg-current/10 md:grid-cols-4"><Metric darkMode={darkMode} label="Vehicle views" value={data.totals.vehicle_views.toLocaleString()} /><Metric darkMode={darkMode} label="Leads" value={data.totals.leads} /><Metric darkMode={darkMode} label="Conversion" value={`${conversion}%`} /><Metric darkMode={darkMode} label="Response rate" value={`${Math.round(data.totals.response_rate)}%`} /></div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <Surface darkMode={darkMode} className="p-4 sm:p-5"><SectionHeading title="Activity" detail="Vehicle views by day." />{data.daily.length ? <div className="mt-6 flex h-44 items-end gap-1 border-b border-current/10">{data.daily.map((day) => <div key={day.date} className="group flex h-full min-w-0 flex-1 items-end"><div title={`${day.date}: ${day.views} views`} className="w-full bg-current opacity-25 transition group-hover:opacity-55" style={{ height: `${Math.max(3, Math.round((day.views / maxDaily) * 100))}%` }} /></div>)}</div> : <EmptyState title="Not enough activity yet" detail="The chart will build as dealership stock receives traffic." />}</Surface>
        <Surface darkMode={darkMode} className="overflow-hidden"><div className="border-b border-current/10 px-4 py-4"><SectionHeading title="Lead sources" /></div>{data.lead_sources.length ? <div className="divide-y divide-current/10">{data.lead_sources.map((source) => <div key={source.label} className="flex items-center justify-between px-4 py-3 text-sm"><span>{source.label}</span><b>{source.value}</b></div>)}</div> : <EmptyState title="No source data" detail="External leads and LoadLink enquiries will be grouped here." />}</Surface>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Surface darkMode={darkMode} className="overflow-hidden"><div className="border-b border-current/10 px-4 py-4"><SectionHeading title="Stock performance" detail="Engagement and ageing for dealership vehicles." /></div>{data.stock_performance.length ? <div className="divide-y divide-current/10">{data.stock_performance.slice(0, 8).map((item) => <div key={item.id} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3"><div className="min-w-0"><div className="truncate text-sm font-black">{item.title}</div><div className="mt-1 text-xs opacity-50">{item.views} views · {item.saves} saves · {item.leads} leads</div></div><div className="text-xs font-black opacity-60">{item.days_in_stock}d</div></div>)}</div> : <EmptyState title="No stock performance yet" detail="Approved inventory activity will appear here." />}</Surface>
        <Surface darkMode={darkMode} className="overflow-hidden"><div className="border-b border-current/10 px-4 py-4"><SectionHeading title="Sales team" detail="Private manager view of lead handling and outcomes." /></div>{data.salesperson_performance.length ? <div className="divide-y divide-current/10">{data.salesperson_performance.map((person) => <div key={person.user_id} className="px-4 py-3"><div className="flex items-center justify-between"><span className="text-sm font-black">{person.name}</span><span className="text-xs opacity-50">{person.won} won</span></div><div className="mt-1 text-xs opacity-50">{person.leads} leads · {person.contacted} contacted{person.response_minutes !== null ? ` · ${Math.round(person.response_minutes)}m first response` : ""}</div></div>)}</div> : <EmptyState title="No team performance yet" detail="This section becomes useful after sales staff start handling leads." />}</Surface>
      </div>
    </>}
  </div>;
}
