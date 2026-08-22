"use client";

import { useEffect, useMemo, useState } from "react";
import { dealerFetch } from "@/lib/dealer/client";
import type { DealerAnalytics as AnalyticsType } from "@/lib/dealer/types";
import { EmptyState, SectionHeading, Select, Surface } from "./ui";

const empty: AnalyticsType = {
  range_days: 30,
  totals: {
    showroom_views: 0,
    vehicle_views: 0,
    search_appearances: 0,
    saves: 0,
    enquiries: 0,
    leads: 0,
    won: 0,
    response_rate: 0,
    avg_response_minutes: null,
    followers_gained: 0,
  },
  lead_sources: [],
  stock_performance: [],
  salesperson_performance: [],
  daily: [],
};

function number(value: number) { return Number(value || 0).toLocaleString("en-ZA"); }
function minutes(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value < 60) return `${Math.round(value)}m`;
  const hours = value / 60;
  return `${hours >= 10 ? Math.round(hours) : hours.toFixed(1)}h`;
}

export default function DealerAnalytics({ darkMode }: { darkMode: boolean }) {
  const [range, setRange] = useState("30");
  const [data, setData] = useState<AnalyticsType>(empty);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void dealerFetch<AnalyticsType>(`/api/dealer/analytics?days=${range}`)
      .then(setData)
      .catch(() => setData({ ...empty, range_days: Number(range) }))
      .finally(() => setLoading(false));
  }, [range]);

  const conversion = data.totals.leads ? Math.round((data.totals.won / data.totals.leads) * 100) : 0;
  const enquiryRate = data.totals.vehicle_views ? Math.round((data.totals.enquiries / data.totals.vehicle_views) * 100) : 0;
  const maxDaily = useMemo(() => Math.max(1, ...data.daily.map((day) => Math.max(day.views, day.leads, day.status_views))), [data.daily]);
  const totalEngagement = data.totals.saves + data.totals.enquiries;
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/48" : "text-black/48";

  const metrics = [
    ["Showroom views", number(data.totals.showroom_views), "People who opened your public showroom"],
    ["Vehicle views", number(data.totals.vehicle_views), "Views across current dealership stock"],
    ["Search appearances", number(data.totals.search_appearances), "Times your stock appeared in LoadLink search"],
    ["Enquiries", number(data.totals.enquiries), `${enquiryRate}% of vehicle views became enquiries`],
    ["Saves", number(data.totals.saves), "Vehicles buyers saved for later"],
    ["New leads", number(data.totals.leads), "Buyer opportunities created in this period"],
    ["Won", number(data.totals.won), `${conversion}% lead-to-win conversion`],
    ["Response rate", `${Math.round(data.totals.response_rate)}%`, `Average first response ${minutes(data.totals.avg_response_minutes)}`],
  ] as const;

  return (
    <div data-loadlink-dealer-analytics="modern" className="grid min-w-0 gap-4 overflow-hidden">
      <Surface darkMode={darkMode} className="min-w-0 p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[.12em] text-[#a87900]">Dealer performance</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-.04em] sm:text-3xl">Know what is moving your showroom.</h2>
            <p className={`mt-2 max-w-2xl text-xs font-semibold leading-5 ${muted}`}>Real LoadLink traffic, buyer intent, response performance and stock engagement. No invented scores.</p>
          </div>
          <div className="w-full shrink-0 sm:w-36"><Select darkMode={darkMode} value={range} onChange={(event) => setRange(event.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></Select></div>
        </div>
      </Surface>

      {loading ? (
        <Surface darkMode={darkMode} className="px-5 py-16 text-center text-sm font-bold opacity-45">Loading dealership performance…</Surface>
      ) : (
        <>
          <section className="grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-4" aria-label="Dealership analytics summary">
            {metrics.map(([label, value, detail]) => (
              <article key={label} className={`min-w-0 rounded-[18px] border p-4 ${surface}`}>
                <p className={`truncate text-[9px] font-black uppercase tracking-[.08em] ${muted}`}>{label}</p>
                <p className="mt-2 break-words text-2xl font-black tracking-[-.04em] sm:text-3xl">{value}</p>
                <p className={`mt-2 text-[10px] font-semibold leading-4 ${muted}`}>{detail}</p>
              </article>
            ))}
          </section>

          <div className="grid min-w-0 gap-4 xl:grid-cols-[1.25fr_.75fr]">
            <Surface darkMode={darkMode} className="min-w-0 overflow-hidden p-4 sm:p-5">
              <SectionHeading title="Activity over time" detail="Vehicle views, leads and dealership-status views by day." />
              {data.daily.length ? (
                <div className="mt-6 min-w-0 overflow-x-auto pb-1">
                  <div className="flex h-48 min-w-[520px] items-end gap-2 border-b border-current/10 px-1">
                    {data.daily.map((day) => {
                      const total = Math.max(day.views, day.leads, day.status_views);
                      return (
                        <div key={day.date} className="group flex h-full min-w-0 flex-1 flex-col justify-end" title={`${day.date} · ${day.views} views · ${day.leads} leads · ${day.status_views} status views`}>
                          <div className="relative flex h-full items-end gap-[2px]">
                            <span className="w-1/3 rounded-t bg-current opacity-20" style={{ height: `${Math.max(3, Math.round((day.views / maxDaily) * 100))}%` }} />
                            <span className="w-1/3 rounded-t bg-[#f6b800]" style={{ height: `${Math.max(day.leads ? 4 : 0, Math.round((day.leads / maxDaily) * 100))}%` }} />
                            <span className="w-1/3 rounded-t bg-current opacity-45" style={{ height: `${Math.max(day.status_views ? 4 : 0, Math.round((day.status_views / maxDaily) * 100))}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className={`mt-3 flex flex-wrap gap-4 text-[10px] font-bold ${muted}`}><span>■ Vehicle views</span><span className="text-[#a87900]">■ Leads</span><span>■ Status views</span></div>
                </div>
              ) : <EmptyState title="Not enough activity yet" detail="Daily performance appears as buyers interact with dealership stock and updates." />}
            </Surface>

            <Surface darkMode={darkMode} className="min-w-0 overflow-hidden p-4 sm:p-5">
              <SectionHeading title="Buyer journey" detail="How attention turns into sales opportunities." />
              <div className="mt-5 grid gap-2">
                <JourneyRow label="Search appearances" value={data.totals.search_appearances} max={Math.max(1, data.totals.search_appearances)} darkMode={darkMode} />
                <JourneyRow label="Vehicle views" value={data.totals.vehicle_views} max={Math.max(1, data.totals.search_appearances, data.totals.vehicle_views)} darkMode={darkMode} />
                <JourneyRow label="Buyer actions" value={totalEngagement} max={Math.max(1, data.totals.vehicle_views)} darkMode={darkMode} />
                <JourneyRow label="Leads" value={data.totals.leads} max={Math.max(1, totalEngagement)} darkMode={darkMode} />
                <JourneyRow label="Won" value={data.totals.won} max={Math.max(1, data.totals.leads)} darkMode={darkMode} strong />
              </div>
              <div className={`mt-5 border-t pt-4 text-xs font-semibold ${darkMode ? "border-white/10" : "border-black/10"}`}>
                <div className="flex justify-between gap-4"><span className={muted}>Followers gained</span><b>{number(data.totals.followers_gained)}</b></div>
                <div className="mt-2 flex justify-between gap-4"><span className={muted}>Average response</span><b>{minutes(data.totals.avg_response_minutes)}</b></div>
              </div>
            </Surface>
          </div>

          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            <Surface darkMode={darkMode} className="min-w-0 overflow-hidden">
              <div className="border-b border-current/10 px-4 py-4"><SectionHeading title="Stock performance" detail="Which vehicles attract attention and which may need action." /></div>
              {data.stock_performance.length ? (
                <div className="divide-y divide-current/10">
                  {data.stock_performance.slice(0, 10).map((item, index) => (
                    <div key={item.id} className="grid min-w-0 grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5">
                      <span className={`text-[11px] font-black ${muted}`}>{String(index + 1).padStart(2, "0")}</span>
                      <div className="min-w-0"><div className="truncate text-sm font-black">{item.title}</div><div className={`mt-1 truncate text-[10px] font-semibold ${muted}`}>{item.views} views · {item.saves} saves · {item.leads} leads</div></div>
                      <div className="text-right"><div className="text-xs font-black">{item.days_in_stock}d</div><div className={`mt-0.5 text-[9px] font-semibold ${muted}`}>in stock</div></div>
                    </div>
                  ))}
                </div>
              ) : <EmptyState title="No stock performance yet" detail="Approved inventory engagement will appear here." />}
            </Surface>

            <div className="grid min-w-0 gap-4">
              <Surface darkMode={darkMode} className="min-w-0 overflow-hidden">
                <div className="border-b border-current/10 px-4 py-4"><SectionHeading title="Lead sources" detail="Where buyer opportunities are coming from." /></div>
                {data.lead_sources.length ? <div className="divide-y divide-current/10">{data.lead_sources.map((source) => <div key={source.label} className="flex min-w-0 items-center justify-between gap-4 px-4 py-3 text-sm"><span className="min-w-0 truncate font-semibold">{source.label}</span><b className="shrink-0">{number(source.value)}</b></div>)}</div> : <EmptyState title="No source data yet" detail="LoadLink and external leads will be grouped here." />}
              </Surface>

              <Surface darkMode={darkMode} className="min-w-0 overflow-hidden">
                <div className="border-b border-current/10 px-4 py-4"><SectionHeading title="Sales response" detail="Manager view of lead handling and outcomes." /></div>
                {data.salesperson_performance.length ? <div className="divide-y divide-current/10">{data.salesperson_performance.map((person) => <div key={person.user_id} className="min-w-0 px-4 py-3.5"><div className="flex min-w-0 items-center justify-between gap-3"><span className="min-w-0 truncate text-sm font-black">{person.name}</span><span className="shrink-0 text-[10px] font-black text-[#a87900]">{person.won} won</span></div><div className={`mt-1 text-[10px] font-semibold ${muted}`}>{person.leads} leads · {person.contacted} contacted{person.response_minutes !== null ? ` · ${minutes(person.response_minutes)} first response` : ""}</div></div>)}</div> : <EmptyState title="No team performance yet" detail="This becomes useful after sales staff start handling leads." />}
              </Surface>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function JourneyRow({ label, value, max, darkMode, strong = false }: { label: string; value: number; max: number; darkMode: boolean; strong?: boolean }) {
  const width = Math.max(value ? 5 : 0, Math.min(100, Math.round((value / Math.max(1, max)) * 100)));
  return <div><div className="flex items-center justify-between gap-4 text-[11px]"><span className={strong ? "font-black" : "font-semibold"}>{label}</span><b>{Number(value || 0).toLocaleString("en-ZA")}</b></div><div className={`mt-1.5 h-2 overflow-hidden rounded-full ${darkMode ? "bg-white/[.07]" : "bg-black/[.06]"}`}><div className={strong ? "h-full rounded-full bg-[#f6b800]" : "h-full rounded-full bg-current opacity-35"} style={{ width: `${width}%` }} /></div></div>;
}
