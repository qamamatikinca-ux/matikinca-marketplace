"use client";

import { useEffect, useMemo, useState } from "react";
import { dealerFetch } from "@/lib/dealer/client";
import type { DealerCampaign, DealerInsight, DealerInventoryItem, DealerStatus, DealerUpdate, DealerWorkspaceState } from "@/lib/dealer/types";
import DealerCampaigns from "./DealerCampaigns";
import DealerMediaLibrary from "./DealerMediaLibrary";
import DealerStatusComposer from "./DealerStatusComposer";
import DealerUpdates from "./DealerUpdates";
import { EmptyState, SectionHeading, Surface } from "./ui";

type View = "status" | "updates" | "campaigns" | "calendar" | "media";

export default function DealerMarketing({ darkMode, context, inventory, insights }: { darkMode: boolean; context: DealerWorkspaceState; inventory: DealerInventoryItem[]; insights: DealerInsight[] }) {
  const [statuses, setStatuses] = useState<DealerStatus[]>([]);
  const [updates, setUpdates] = useState<DealerUpdate[]>([]);
  const [campaigns, setCampaigns] = useState<DealerCampaign[]>([]);
  const [composer, setComposer] = useState(false);
  const [view, setView] = useState<View>("status");
  const [followers, setFollowers] = useState(0);

  async function loadStatuses() {
    try {
      const data = await dealerFetch<{ items: DealerStatus[] }>("/api/dealer/statuses");
      setStatuses(data.items || []);
    } catch {
      setStatuses([]);
    }
  }

  async function loadCalendarData() {
    const [u, c] = await Promise.allSettled([
      dealerFetch<{ items: DealerUpdate[] }>("/api/dealer/updates"),
      dealerFetch<{ items: DealerCampaign[] }>("/api/dealer/campaigns"),
    ]);
    if (u.status === "fulfilled") setUpdates(u.value.items || []);
    if (c.status === "fulfilled") setCampaigns(c.value.items || []);
  }

  useEffect(() => {
    void loadStatuses();
    void loadCalendarData();
    void dealerFetch<{ followers?: number }>("/api/dealer/summary").then((r) => setFollowers(Number(r.followers || 0))).catch(() => setFollowers(0));
  }, []);

  const marketingInsights = useMemo(() => insights.filter((item) => item.kind === "marketing" || item.kind === "inventory"), [insights]);
  const activeStatus = statuses.filter((status) => ["ready", "published"].includes(status.publication_status) && new Date(status.expires_at).getTime() > Date.now()).length;
  const publishedUpdates = updates.filter((item) => item.publication_status === "published").length;
  const activeCampaigns = campaigns.filter((item) => item.status === "active").length;

  return <div className="grid gap-3 sm:gap-4">
    <Surface darkMode={darkMode} className="overflow-hidden rounded-3xl">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.12em] opacity-35">Reach</div>
            <h2 className="mt-1 text-[24px] font-black tracking-[-.04em]">Status & updates</h2>
            <p className="mt-1 max-w-xl text-sm leading-6 opacity-50">New stock, offers and dealership updates for people following your showroom.</p>
          </div>
          <button type="button" onClick={() => setComposer(true)} disabled={!context.permissions.includes("marketing.write")} className="h-11 rounded-full bg-[#f6b800] px-5 text-sm font-black text-black disabled:opacity-40">Create Status</button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Tab active={view === "status"} onClick={() => setView("status")}>Status</Tab>
          <Tab active={view === "updates"} onClick={() => setView("updates")}>Updates</Tab>
          <Tab active={view === "campaigns"} onClick={() => setView("campaigns")}>Campaigns</Tab>
          <span className="hidden h-9 w-px bg-current/10 sm:block" />
          <Tab active={view === "calendar"} subtle onClick={() => setView("calendar")}>Calendar</Tab>
          <Tab active={view === "media"} subtle onClick={() => setView("media")}>Media</Tab>
        </div>
      </div>
      <div className="grid grid-cols-2 border-t border-current/10 sm:grid-cols-4">
        <Mini label="Status live" value={activeStatus} />
        <Mini label="Followers" value={followers} />
        <Mini label="Updates" value={publishedUpdates} />
        <Mini label="Campaigns" value={activeCampaigns} />
      </div>
    </Surface>

    {marketingInsights.length ? <Surface darkMode={darkMode} className="overflow-hidden rounded-3xl"><div className="border-b border-current/10 px-4 py-3.5 sm:px-5"><SectionHeading title="Opportunities" detail="Useful actions only." /></div><div className="divide-y divide-current/10">{marketingInsights.slice(0, 3).map((item) => <div key={item.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.severity === "important" ? "bg-red-500" : item.severity === "recommended" ? "bg-[#f6b800]" : "bg-current opacity-20"}`} /><div><div className="text-sm font-black">{item.title}</div><div className="mt-1 text-sm opacity-50">{item.message}</div></div></div>)}</div></Surface> : null}

    {view === "status" ? <StatusList darkMode={darkMode} items={statuses} canWrite={context.permissions.includes("marketing.write")} canPublish={context.permissions.includes("marketing.publish")} onChanged={loadStatuses} /> : null}
    {view === "updates" ? <DealerUpdates darkMode={darkMode} context={context} inventory={inventory} onChanged={setUpdates} /> : null}
    {view === "campaigns" ? <DealerCampaigns darkMode={darkMode} inventory={inventory} /> : null}
    {view === "calendar" ? <MarketingCalendar darkMode={darkMode} statuses={statuses} updates={updates} campaigns={campaigns} /> : null}
    {view === "media" ? <DealerMediaLibrary darkMode={darkMode} /> : null}

    <DealerStatusComposer darkMode={darkMode} open={composer} onClose={() => setComposer(false)} inventory={inventory} context={context} onDone={async () => { await loadStatuses(); await loadCalendarData(); }} />
  </div>;
}

function Tab({ active, subtle, onClick, children }: { active: boolean; subtle?: boolean; onClick: () => void; children: string }) {
  return <button type="button" onClick={onClick} className={`h-9 rounded-full border px-4 text-xs font-black transition ${active ? "border-current bg-current text-[color:var(--dealer-tab-contrast,currentColor)] invert" : subtle ? "border-current/10 opacity-45 hover:opacity-80" : "border-current/10 opacity-60 hover:opacity-100"}`}>{children}</button>;
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return <div className="border-b border-r border-current/10 p-4"><div className="text-[9px] font-black uppercase tracking-[.1em] opacity-35">{label}</div><div className="mt-1 text-xl font-black tracking-[-.03em]">{value}</div></div>;
}

function StatusList({ darkMode, items, canWrite, canPublish, onChanged }: { darkMode: boolean; items: DealerStatus[]; canWrite: boolean; canPublish: boolean; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  async function action(kind: "repost" | "remove" | "publish", id: string) {
    setBusy(`${kind}-${id}`); setError("");
    try {
      await dealerFetch("/api/dealer/statuses", { method: "POST", body: JSON.stringify({ action: kind, status_id: id }) });
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status could not be changed.");
    } finally {
      setBusy("");
    }
  }

  return <Surface darkMode={darkMode} className="overflow-hidden rounded-3xl">
    <div className="border-b border-current/10 px-4 py-4 sm:px-5"><SectionHeading title="Dealer Status" detail="24-hour dealership content. Photos, short videos, vehicle cards, text and promotions." />{error ? <p className="mt-2 text-sm font-bold text-red-500">{error}</p> : null}</div>
    {items.length ? <div className="divide-y divide-current/10">{items.map((item) => {
      const completion = item.views ? Math.round((item.completed_views / item.views) * 100) : 0;
      const ended = new Date(item.expires_at).getTime() <= Date.now() || item.publication_status === "expired" || item.publication_status === "removed";
      return <div key={item.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          {item.media_url ? <div className="h-14 w-12 shrink-0 overflow-hidden rounded-xl bg-black/10">{item.content_type === "video" ? <video src={item.media_url} muted className="h-full w-full object-cover" /> : <img src={item.media_url} alt="" className="h-full w-full object-cover" />}</div> : <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-xl border border-current/10 text-[9px] font-black uppercase">{item.content_type}</div>}
          <div className="min-w-0"><div className="truncate text-sm font-black">{item.title || item.listing_title || `${item.content_type} status`}</div><div className="mt-1 text-xs opacity-45">{item.publication_status.replaceAll("_", " ")} · {ended ? "ended" : `expires ${new Date(item.expires_at).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}</div>{canWrite ? <div className="mt-2 flex gap-3">{canPublish && item.moderation_status !== "approved" && item.publication_status !== "removed" ? <button disabled={Boolean(busy)} onClick={() => void action("publish", item.id)} className="text-[11px] font-black underline underline-offset-4 disabled:opacity-30">Publish</button> : null}<button disabled={Boolean(busy)} onClick={() => void action("repost", item.id)} className="text-[11px] font-black underline underline-offset-4 disabled:opacity-30">Repost</button>{item.publication_status !== "removed" ? <button disabled={Boolean(busy)} onClick={() => void action("remove", item.id)} className="text-[11px] font-black opacity-45 disabled:opacity-30">Remove</button> : null}</div> : null}</div>
        </div>
        <div className="grid grid-cols-4 gap-4 text-right text-xs"><Stat value={item.views} label="views" /><Stat value={`${completion}%`} label="complete" /><Stat value={item.vehicle_opens} label="opens" /><Stat value={item.messages_generated} label="leads" /></div>
      </div>;
    })}</div> : <EmptyState title="No Dealer Status yet" detail="Post a new arrival, short video, vehicle card, text update or promotion when there is something worth showing." />}
  </Surface>;
}

function Stat({ value, label }: { value: string | number; label: string }) { return <div><b>{value}</b><span className="mt-1 block opacity-40">{label}</span></div>; }

function MarketingCalendar({ darkMode, statuses, updates, campaigns }: { darkMode: boolean; statuses: DealerStatus[]; updates: DealerUpdate[]; campaigns: DealerCampaign[] }) {
  const events = [
    ...statuses.filter((s) => new Date(s.starts_at).getTime() > Date.now()).map((s) => ({ id: `s-${s.id}`, at: s.starts_at, title: s.title || s.listing_title || `${s.content_type} Status`, kind: "Status" })),
    ...updates.filter((u) => u.scheduled_at && new Date(u.scheduled_at).getTime() > Date.now()).map((u) => ({ id: `u-${u.id}`, at: u.scheduled_at!, title: u.title, kind: "Update" })),
    ...campaigns.filter((c) => c.starts_at && new Date(c.starts_at).getTime() > Date.now()).map((c) => ({ id: `c-${c.id}`, at: c.starts_at!, title: c.title, kind: "Campaign" })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return <Surface darkMode={darkMode} className="overflow-hidden rounded-3xl"><div className="border-b border-current/10 px-4 py-4 sm:px-5"><SectionHeading title="Marketing calendar" detail="Upcoming Status, dealership updates and campaigns." /></div>{events.length ? <div className="divide-y divide-current/10">{events.map((item) => <div key={item.id} className="flex items-center gap-4 px-4 py-4 sm:px-5"><div className="w-14 shrink-0 text-center"><div className="text-[9px] font-black uppercase opacity-35">{new Date(item.at).toLocaleDateString("en-ZA", { month: "short" })}</div><div className="text-xl font-black">{new Date(item.at).getDate()}</div></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-black">{item.title}</div><div className="mt-1 text-xs opacity-40">{item.kind} · {new Date(item.at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}</div></div></div>)}</div> : <EmptyState title="Nothing scheduled" detail="Schedule a Status, dealership update or campaign and it will appear here." />}</Surface>;
}
