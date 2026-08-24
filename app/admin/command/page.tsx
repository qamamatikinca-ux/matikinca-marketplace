"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Snapshot = {
  generated_at: string;
  counts: {
    open_tasks: number;
    blocked_tasks: number;
    overdue_tasks: number;
    open_support: number;
    urgent_support: number;
    enabled_flags: number;
    live_communications: number;
    scheduled_communications: number;
    health_events_24h: number;
  };
  tasks: Array<{
    id: string;
    title: string;
    department: string | null;
    priority: string;
    status: string;
    due_at: string | null;
    sla_due_at: string | null;
    created_at: string;
  }>;
  support: Array<{
    id: string;
    ticket_number: string;
    subject: string;
    status: string;
    priority: string;
    due_at: string | null;
    created_at: string;
  }>;
  health: Array<{
    service: string;
    status: string;
    latency_ms: number | null;
    checked_at: string;
  }>;
  feature_flags: Array<{
    key: string;
    enabled: boolean;
    updated_at: string;
  }>;
  communications: Array<{
    id: string;
    title: string;
    status: string;
    audience: string;
    surface: string;
    priority: string;
    starts_at: string | null;
    ends_at: string | null;
    updated_at: string;
  }>;
};

export default function OwnerCommandPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const result = await supabase.rpc("loadlink_owner_command_snapshot");
    if (result.error) {
      setError(result.error.code === "42501" ? "Owner Command is restricted to Owner and Admin accounts." : result.error.message);
      setSnapshot(null);
    } else {
      setSnapshot(result.data as Snapshot);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const healthState = useMemo(() => {
    if (!snapshot) return "unknown";
    if (!snapshot.counts.health_events_24h) return "stale";
    if (snapshot.health.some((item) => !["ok", "healthy", "up", "operational"].includes(item.status.toLowerCase()))) return "attention";
    return "healthy";
  }, [snapshot]);

  const ownerAttention = useMemo(() => {
    if (!snapshot) return [];
    const items: Array<{ label: string; detail: string; href?: string; tone: "critical" | "warn" | "quiet" }> = [];
    if (snapshot.counts.blocked_tasks) items.push({ label: `${snapshot.counts.blocked_tasks} blocked internal task${snapshot.counts.blocked_tasks === 1 ? "" : "s"}`, detail: "A blocked task cannot progress without intervention.", tone: "critical" });
    if (snapshot.counts.overdue_tasks) items.push({ label: `${snapshot.counts.overdue_tasks} overdue task${snapshot.counts.overdue_tasks === 1 ? "" : "s"}`, detail: "Review ownership and due dates.", tone: "critical" });
    if (snapshot.counts.urgent_support) items.push({ label: `${snapshot.counts.urgent_support} urgent support case${snapshot.counts.urgent_support === 1 ? "" : "s"}`, detail: "Customer response should be prioritised.", href: "/admin/support-tickets", tone: "critical" });
    if (healthState === "stale") items.push({ label: "Platform health checks are stale", detail: "No platform-health event has been recorded in the last 24 hours.", tone: "warn" });
    if (healthState === "attention") items.push({ label: "A platform service needs attention", detail: "At least one latest health signal is not operational.", tone: "critical" });
    if (!items.length) items.push({ label: "No immediate owner intervention", detail: "Current operational signals do not contain a blocking or urgent condition.", tone: "quiet" });
    return items;
  }, [healthState, snapshot]);

  if (loading) {
    return <main className="min-h-screen bg-[#f4f2eb] px-4 py-10 text-black"><div className="mx-auto max-w-7xl text-sm font-bold text-black/45">Loading Owner Command…</div></main>;
  }

  if (error || !snapshot) {
    return <main className="min-h-screen bg-[#f4f2eb] px-4 py-10 text-black"><div className="mx-auto max-w-3xl rounded-[26px] border border-black/10 bg-white p-7"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9a7000]">Control Centre</p><h1 className="mt-2 text-3xl font-black">Owner Command unavailable</h1><p className="mt-3 text-sm font-semibold leading-6 text-black/55">{error || "The operational snapshot could not be loaded."}</p><Link href="/admin" className="mt-5 inline-flex rounded-full bg-black px-5 py-3 text-xs font-black text-white">Back to Control Centre</Link></div></main>;
  }

  return (
    <main className="min-h-screen bg-[#f4f2eb] px-4 py-8 text-black sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-black/10 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9a7000]">Owner workspace</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.05em] sm:text-5xl">Owner Command</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-black/55">One operational view of what needs intervention now. Every figure below comes from live LoadLink control data.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void load()} className="h-11 rounded-full border border-black/10 bg-white px-5 text-xs font-black">Refresh</button>
            <Link href="/admin" className="inline-flex h-11 items-center rounded-full bg-black px-5 text-xs font-black text-white">Control Centre</Link>
          </div>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Signal label="Open internal tasks" value={snapshot.counts.open_tasks} sub={`${snapshot.counts.blocked_tasks} blocked · ${snapshot.counts.overdue_tasks} overdue`} alert={snapshot.counts.blocked_tasks > 0 || snapshot.counts.overdue_tasks > 0} />
          <Signal label="Customer support" value={snapshot.counts.open_support} sub={`${snapshot.counts.urgent_support} urgent`} alert={snapshot.counts.urgent_support > 0} />
          <Signal label="Customer communications" value={snapshot.counts.live_communications} sub={`${snapshot.counts.scheduled_communications} scheduled`} />
          <Signal label="Enabled feature flags" value={snapshot.counts.enabled_flags} sub={healthState === "healthy" ? "Health reporting active" : healthState === "stale" ? "Health data stale" : "Review health signals"} alert={healthState !== "healthy"} />
        </section>

        <section className="mt-6 rounded-[28px] border border-black/10 bg-black p-5 text-white sm:p-7">
          <div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#f6b800]">Decision inbox</p><h2 className="mt-1 text-2xl font-black tracking-[-.035em]">Owner attention</h2></div><span className="text-[10px] font-bold text-white/35">Updated {relativeTime(snapshot.generated_at)}</span></div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {ownerAttention.map((item, index) => {
              const content = <><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.tone === "critical" ? "bg-red-400" : item.tone === "warn" ? "bg-[#f6b800]" : "bg-emerald-400"}`} /><span><strong className="block text-sm font-black">{item.label}</strong><span className="mt-1 block text-[11px] font-semibold leading-5 text-white/50">{item.detail}</span></span></>;
              return item.href ? <Link key={`${item.label}-${index}`} href={item.href} className="flex gap-3 rounded-[18px] border border-white/10 bg-white/[.04] p-4 transition hover:border-[#f6b800]/60">{content}</Link> : <div key={`${item.label}-${index}`} className="flex gap-3 rounded-[18px] border border-white/10 bg-white/[.04] p-4">{content}</div>;
            })}
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
          <Panel eyebrow="Internal operations" title="Task pressure" action={snapshot.tasks.length ? <span className="text-[10px] font-bold text-black/35">Highest attention first</span> : undefined}>
            {snapshot.tasks.length ? <div className="space-y-2">{snapshot.tasks.map((task) => <div key={task.id} className="rounded-[18px] border border-black/10 px-4 py-3.5"><div className="flex flex-wrap items-center gap-2"><StatePill value={task.status} /><PriorityPill value={task.priority} />{task.department ? <span className="text-[9px] font-black uppercase tracking-[.12em] text-black/35">{task.department}</span> : null}</div><h3 className="mt-2 text-sm font-black">{task.title}</h3><p className="mt-1 text-[10px] font-bold text-black/40">{task.due_at ? `Due ${formatDate(task.due_at)}` : task.sla_due_at ? `SLA ${formatDate(task.sla_due_at)}` : `Opened ${formatDate(task.created_at)}`}</p></div>)}</div> : <Empty title="No open internal tasks" detail="The task queue is clear." />}
          </Panel>

          <Panel eyebrow="Customer operations" title="Support pressure" action={<Link href="/admin/support-tickets" className="text-[10px] font-black underline decoration-[#f6b800] decoration-2 underline-offset-4">Open support</Link>}>
            {snapshot.support.length ? <div className="space-y-2">{snapshot.support.map((ticket) => <Link href="/admin/support-tickets" key={ticket.id} className="block rounded-[18px] border border-black/10 px-4 py-3.5 transition hover:border-[#f6b800]"><div className="flex flex-wrap items-center gap-2"><PriorityPill value={ticket.priority} /><StatePill value={ticket.status} /><span className="text-[9px] font-black uppercase tracking-[.12em] text-black/35">{ticket.ticket_number}</span></div><h3 className="mt-2 text-sm font-black">{ticket.subject}</h3><p className="mt-1 text-[10px] font-bold text-black/40">{ticket.due_at ? `Due ${formatDate(ticket.due_at)}` : `Opened ${formatDate(ticket.created_at)}`}</p></Link>)}</div> : <Empty title="Support queue clear" detail="There are no open customer support tickets." />}
          </Panel>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-3">
          <Panel eyebrow="Infrastructure" title="Latest health signals">
            {snapshot.health.length ? <div className="space-y-2">{snapshot.health.map((service) => <div key={service.service} className="flex items-center justify-between gap-3 rounded-[16px] border border-black/10 px-4 py-3"><div><p className="text-xs font-black">{humanize(service.service)}</p><p className="mt-1 text-[9px] font-bold text-black/35">{formatDate(service.checked_at)}{service.latency_ms != null ? ` · ${service.latency_ms}ms` : ""}</p></div><HealthPill value={service.status} /></div>)}</div> : <Empty title="No health telemetry" detail="No platform health service has reported yet." warning />}
          </Panel>

          <Panel eyebrow="Release controls" title="Feature flags">
            {snapshot.feature_flags.length ? <div className="space-y-2">{snapshot.feature_flags.map((flag) => <div key={flag.key} className="flex items-center justify-between gap-3 rounded-[16px] border border-black/10 px-4 py-3"><div className="min-w-0"><p className="truncate text-xs font-black">{humanize(flag.key)}</p><p className="mt-1 text-[9px] font-bold text-black/35">Updated {formatDate(flag.updated_at)}</p></div><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[.1em] ${flag.enabled ? "bg-emerald-100 text-emerald-800" : "bg-black/5 text-black/40"}`}>{flag.enabled ? "On" : "Off"}</span></div>)}</div> : <Empty title="No feature flags" detail="No runtime feature switches are registered." />}
          </Panel>

          <Panel eyebrow="Customer communication" title="Campaign state" action={<Link href="/admin/communications" className="text-[10px] font-black underline decoration-[#f6b800] decoration-2 underline-offset-4">Communication Studio</Link>}>
            {snapshot.communications.length ? <div className="space-y-2">{snapshot.communications.map((campaign) => <Link href="/admin/communications" key={campaign.id} className="block rounded-[16px] border border-black/10 px-4 py-3 transition hover:border-[#f6b800]"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-black">{campaign.title}</p><p className="mt-1 text-[9px] font-bold text-black/35">{humanize(campaign.audience)} · {humanize(campaign.surface)}</p></div><StatePill value={campaign.status} /></div></Link>)}</div> : <Empty title="No campaigns" detail="Nothing is live, scheduled or in draft." />}
          </Panel>
        </section>
      </div>
    </main>
  );
}

function Signal({ label, value, sub, alert = false }: { label: string; value: number; sub: string; alert?: boolean }) {
  return <article className={`rounded-[22px] border bg-white px-5 py-4 ${alert ? "border-[#d8a400]" : "border-black/10"}`}><div className="flex items-start justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-[.12em] text-black/40">{label}</p>{alert ? <span className="mt-0.5 h-2 w-2 rounded-full bg-[#f6b800]" /> : null}</div><p className="mt-2 text-3xl font-black tracking-[-.05em]">{value}</p><p className="mt-1 text-[10px] font-bold text-black/40">{sub}</p></article>;
}

function Panel({ eyebrow, title, action, children }: { eyebrow: string; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-[28px] border border-black/10 bg-white p-5 shadow-[0_16px_45px_rgba(0,0,0,.025)] sm:p-6"><div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#9a7000]">{eyebrow}</p><h2 className="mt-1 text-xl font-black tracking-[-.03em]">{title}</h2></div>{action}</div>{children}</section>;
}

function Empty({ title, detail, warning = false }: { title: string; detail: string; warning?: boolean }) {
  return <div className={`rounded-[18px] border border-dashed p-5 ${warning ? "border-[#d8a400]/60 bg-[#f6b800]/5" : "border-black/15"}`}><p className="text-sm font-black">{title}</p><p className="mt-1 text-[11px] font-semibold leading-5 text-black/40">{detail}</p></div>;
}

function PriorityPill({ value }: { value: string }) {
  const normal = value.toLowerCase();
  const cls = normal === "urgent" ? "bg-red-100 text-red-800" : normal === "high" ? "bg-amber-100 text-amber-800" : "bg-black/5 text-black/45";
  return <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[.1em] ${cls}`}>{humanize(value)}</span>;
}

function StatePill({ value }: { value: string }) {
  const normal = value.toLowerCase();
  const cls = ["live", "open", "active", "completed", "done", "resolved"].includes(normal) ? "bg-emerald-100 text-emerald-800" : normal === "blocked" ? "bg-red-100 text-red-800" : ["scheduled", "pending", "in_progress", "in-progress"].includes(normal) ? "bg-amber-100 text-amber-800" : "bg-black/5 text-black/45";
  return <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[.1em] ${cls}`}>{humanize(value)}</span>;
}

function HealthPill({ value }: { value: string }) {
  const healthy = ["ok", "healthy", "up", "operational"].includes(value.toLowerCase());
  return <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[.1em] ${healthy ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{humanize(value)}</span>;
}

function humanize(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function relativeTime(value: string) {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "now";
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}
