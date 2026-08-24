"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type Tool = {
  href: string;
  group: "Priority" | "People" | "Money" | "Trust" | "Marketplace" | "Support";
  eyebrow: string;
  title: string;
  description: string;
  roles: string[];
  metricKey?: keyof QueueMetrics;
  ownerOnly?: boolean;
};

type QueueMetrics = {
  drivers: number | null;
  payments: number | null;
  support: number | null;
};

const tools: Tool[] = [
  { href: "/admin/drivers", group: "Priority", eyebrow: "Applications", title: "Driver applications", description: "Review driver profiles and private documents before they become public.", roles: ["owner", "admin", "operations", "moderator", "verification"], metricKey: "drivers" },
  { href: "/admin/payments", group: "Priority", eyebrow: "Finance", title: "Payment review", description: "Inspect confirmed purchases and release entitlements only after Control Centre approval.", roles: ["owner", "admin", "operations", "finance"], metricKey: "payments" },
  { href: "/admin/support-tickets", group: "Priority", eyebrow: "Human support", title: "Agent inbox", description: "Talk-to-agent handovers land here with customer and page context for staff follow-up.", roles: ["owner", "admin", "operations", "support"], metricKey: "support" },
  { href: "/admin/trials", group: "Money", eyebrow: "Owner tools", title: "Free plan trials", description: "Grant or extend Pro and Dealer access by customer email without touching paid billing.", roles: ["owner", "admin"], ownerOnly: true },
  { href: "/admin/package-requests", group: "Money", eyebrow: "Plans", title: "Package approvals", description: "Review tailored package and plan requests before payment begins.", roles: ["owner", "admin", "operations", "finance"] },
  { href: "/admin/listings", group: "Marketplace", eyebrow: "Marketplace", title: "Listing moderation", description: "Approve or reject jobs, contracts and vehicle listings with a traceable reason.", roles: ["owner", "admin", "operations", "moderator"] },
  { href: "/admin/reports", group: "Trust", eyebrow: "Safety", title: "Marketplace reports", description: "Investigate reports, open the affected listing and record a protected outcome.", roles: ["owner", "admin", "operations", "moderator", "support"] },
  { href: "/admin/verifications", group: "Trust", eyebrow: "Identity", title: "Identity verification", description: "Review identity, selfie and company-document submissions in the protected queue.", roles: ["owner", "admin", "operations", "moderator", "verification"] },
  { href: "/admin/dealerships", group: "People", eyebrow: "Dealerships", title: "Dealership approvals", description: "Review dealership verification, business documents and requested changes.", roles: ["owner", "admin", "operations", "moderator", "verification"] },
  { href: "/admin/support-feedback", group: "Support", eyebrow: "Experience", title: "Customer experience", description: "Review posting feedback and follow-up signals from LoadLink users.", roles: ["owner", "admin", "operations", "support"] },
];

const metricDefault: QueueMetrics = { drivers: null, payments: null, support: null };

function metricLabel(value: number | null) {
  if (value === null) return "Open";
  if (value === 0) return "Clear";
  return `${value} waiting`;
}

function queueTone(value: number | null) {
  if (value === null) return "bg-black/5 text-black/45";
  if (value === 0) return "bg-emerald-100 text-emerald-800";
  return "bg-[#fff0af] text-[#6d5000]";
}

export default function AdminPage() {
  const [role, setRole] = useState("");
  const [ready, setReady] = useState(false);
  const [metrics, setMetrics] = useState<QueueMetrics>(metricDefault);
  const [query, setQuery] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
      const roleResult = await supabase.rpc("loadlink_phase2_admin_role");
      if (roleResult.error) throw roleResult.error;
      const activeRole = String(roleResult.data || "").trim().toLowerCase();
      setRole(activeRole);

      const next: QueueMetrics = { ...metricDefault };
      const jobs: PromiseLike<{ data: unknown; error: { message?: string } | null }>[] = [];
      const keys: (keyof QueueMetrics)[] = [];

      if (["owner", "admin", "operations", "moderator", "verification"].includes(activeRole)) {
        jobs.push(supabase.rpc("loadlink_admin_driver_queue", { p_status: "pending", p_limit: 150, p_offset: 0 }));
        keys.push("drivers");
      }
      if (["owner", "admin", "operations", "finance"].includes(activeRole)) {
        jobs.push(supabase.rpc("loadlink_admin_payment_queue", { p_status: "received_pending_review" }));
        keys.push("payments");
      }
      if (["owner", "admin", "operations", "support"].includes(activeRole)) {
        jobs.push(supabase.rpc("loadlink_admin_support_ticket_queue", { p_status: "open", p_limit: 150, p_offset: 0 }));
        keys.push("support");
      }

      const results = await Promise.allSettled(jobs);
      results.forEach((result, index) => {
        if (result.status !== "fulfilled" || result.value.error) return;
        const data = Array.isArray(result.value.data) ? result.value.data : [];
        next[keys[index]] = data.length;
      });
      setMetrics(next);
      setUpdatedAt(new Date());
    } catch {
      setMetrics(metricDefault);
    } finally {
      setReady(true);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const visibleTools = useMemo(() => tools.filter((tool) => tool.roles.includes(role)), [role]);
  const filteredTools = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return visibleTools;
    return visibleTools.filter((tool) => [tool.group, tool.eyebrow, tool.title, tool.description].some((value) => value.toLowerCase().includes(needle)));
  }, [query, visibleTools]);

  const actionCount = useMemo(() => Object.values(metrics).reduce<number>((sum, value) => sum + (typeof value === "number" ? value : 0), 0), [metrics]);

  if (!ready) return <main className="min-h-screen bg-[#f3f1eb] text-black"><LoadLinkLoading /></main>;

  return (
    <main className="min-h-screen bg-[#f3f1eb] text-black">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[1500px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2"><strong className="text-xl font-black tracking-[-.05em]">LOADLINK</strong><span className="rounded-full bg-[#f6b800] px-2 py-1 text-[8px] font-black uppercase tracking-[.12em]">Control</span></div>
            <p className="mt-0.5 truncate text-[9px] font-black uppercase tracking-[.16em] text-black/35">Protected operations workspace</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-black/10 bg-[#f7f5ef] px-3 py-2 text-[9px] font-black uppercase tracking-[.12em] text-black/50 sm:inline-flex">{role || "staff"}</span>
            <Link href="/" className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[11px] font-black sm:px-4">Marketplace</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">
        <section className="overflow-hidden rounded-[30px] bg-black text-white shadow-[0_28px_80px_rgba(0,0,0,.12)]">
          <div className="grid gap-0 lg:grid-cols-[1.35fr_.65fr]">
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#f6b800] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-black">Live operations</span><span className="text-[9px] font-black uppercase tracking-[.12em] text-white/35">Auto-refreshes every minute</span></div>
              <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-[-.06em] sm:text-6xl lg:text-7xl">Control Centre</h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/52 sm:text-base">Applications, money, moderation and customer support in one protected operating surface. What you see is limited by your staff role; owner controls stay separated from normal operations.</p>
              <div className="mt-7 flex flex-wrap gap-2">
                <Link href="/admin/drivers" className="rounded-xl bg-white px-4 py-3 text-xs font-black text-black">Review drivers</Link>
                <Link href="/admin/support-tickets" className="rounded-xl border border-white/15 px-4 py-3 text-xs font-black text-white">Agent inbox</Link>
                {['owner', 'admin'].includes(role) ? <Link href="/admin/trials" className="rounded-xl border border-[#f6b800]/60 px-4 py-3 text-xs font-black text-[#f6b800]">Grant a free trial</Link> : null}
              </div>
            </div>

            <div className="border-t border-white/10 bg-white/[.045] p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
              <p className="text-[9px] font-black uppercase tracking-[.16em] text-white/35">Needs attention</p>
              <div className="mt-3 text-6xl font-black tracking-[-.07em] text-[#f6b800]">{actionCount}</div>
              <p className="mt-2 text-xs font-semibold leading-5 text-white/45">Open items across the queues available to your role.</p>
              <div className="mt-6 grid gap-2">
                <QueueLine href="/admin/drivers" label="Driver applications" value={metrics.drivers} />
                <QueueLine href="/admin/payments" label="Payment reviews" value={metrics.payments} />
                <QueueLine href="/admin/support-tickets" label="Support handovers" value={metrics.support} />
              </div>
              <button type="button" disabled={refreshing} onClick={() => void load()} className="mt-5 text-[10px] font-black uppercase tracking-[.12em] text-white/45 underline decoration-[#f6b800] decoration-2 underline-offset-4 disabled:opacity-30">{refreshing ? "Refreshing…" : "Refresh queues"}</button>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatusCard label="Driver applications" value={metrics.drivers} href="/admin/drivers" />
          <StatusCard label="Payments awaiting review" value={metrics.payments} href="/admin/payments" />
          <StatusCard label="Talk-to-agent handovers" value={metrics.support} href="/admin/support-tickets" />
        </section>

        {['owner', 'admin'].includes(role) ? <section className="mt-5 rounded-[26px] border border-[#f6b800]/45 bg-[#fff7d6] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-3xl"><div className="flex items-center gap-2"><span className="rounded-full bg-black px-3 py-1 text-[8px] font-black uppercase tracking-[.12em] text-white">Owner desk</span><span className="text-[9px] font-black uppercase tracking-[.12em] text-black/35">High privilege</span></div><h2 className="mt-3 text-2xl font-black tracking-[-.04em]">Grant Pro or Dealer access by email.</h2><p className="mt-2 text-sm font-semibold leading-6 text-black/55">The trial desk uses the protected subscription system, keeps paid access intact, records the actor and reason, and notifies the customer automatically.</p></div>
            <Link href="/admin/trials" className="shrink-0 rounded-xl bg-black px-5 py-3.5 text-xs font-black text-white">Open plan trials</Link>
          </div>
        </section> : null}

        <section className="mt-8">
          <div className="flex flex-col gap-3 border-b border-black/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-[9px] font-black uppercase tracking-[.16em] text-black/35">Workspace</p><h2 className="mt-1 text-3xl font-black tracking-[-.045em]">Operations console</h2><p className="mt-1 text-xs font-semibold text-black/40">{visibleTools.length} tools available to {role || "this role"}{updatedAt ? ` · updated ${updatedAt.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}` : ""}</p></div>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Control Centre" className="h-11 w-full rounded-xl border border-black/10 bg-white px-4 text-xs font-bold outline-none transition focus:border-[#f6b800] sm:w-72" />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredTools.map((tool) => {
              const metric = tool.metricKey ? metrics[tool.metricKey] : null;
              return <Link key={tool.href} href={tool.href} className="group relative overflow-hidden rounded-[24px] border border-black/10 bg-white p-5 shadow-[0_16px_50px_rgba(0,0,0,.035)] transition duration-200 hover:-translate-y-0.5 hover:border-black/25 hover:shadow-[0_22px_60px_rgba(0,0,0,.07)] sm:p-6">
                <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#8a6500]">{tool.eyebrow}</p><p className="mt-1 text-[9px] font-black uppercase tracking-[.12em] text-black/25">{tool.group}</p></div>{tool.metricKey ? <span className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[.08em] ${queueTone(metric)}`}>{metricLabel(metric)}</span> : tool.ownerOnly ? <span className="rounded-full bg-black px-3 py-1.5 text-[8px] font-black uppercase tracking-[.1em] text-white">Owner</span> : null}</div>
                <h3 className="mt-5 text-2xl font-black tracking-[-.04em]">{tool.title}</h3>
                <p className="mt-2 min-h-12 text-sm font-semibold leading-6 text-black/50">{tool.description}</p>
                <div className="mt-5 flex items-center justify-between border-t border-black/8 pt-4"><span className="text-[10px] font-black uppercase tracking-[.1em] text-black/45">Open workspace</span><span className="text-xl transition group-hover:translate-x-1">→</span></div>
              </Link>;
            })}
          </div>

          {filteredTools.length === 0 ? <div className="mt-4 rounded-[24px] border border-black/10 bg-white px-6 py-12 text-center"><h3 className="text-xl font-black">No matching Control Centre tool</h3><button type="button" onClick={() => setQuery("")} className="mt-3 text-xs font-black underline decoration-[#f6b800] decoration-2 underline-offset-4">Clear search</button></div> : null}
        </section>

        <footer className="mt-8 flex flex-col gap-2 border-t border-black/10 py-6 text-[10px] font-semibold text-black/35 sm:flex-row sm:items-center sm:justify-between"><span>Protected LoadLink operations. Actions are enforced server-side.</span><span>Role: {role || "staff"}</span></footer>
      </div>
    </main>
  );
}

function QueueLine({ href, label, value }: { href: string; label: string; value: number | null }) {
  return <Link href={href} className="flex items-center justify-between gap-3 rounded-xl bg-white/[.06] px-4 py-3 transition hover:bg-white/[.09]"><span className="text-xs font-bold text-white/65">{label}</span><strong className="text-sm font-black text-white">{value === null ? "—" : value}</strong></Link>;
}

function StatusCard({ label, value, href }: { label: string; value: number | null; href: string }) {
  return <Link href={href} className="rounded-[20px] border border-black/10 bg-white p-4 transition hover:border-black/20"><div className="flex items-center justify-between gap-3"><span className="text-[9px] font-black uppercase tracking-[.12em] text-black/35">{label}</span><span className={`h-2.5 w-2.5 rounded-full ${value === 0 ? "bg-emerald-500" : value === null ? "bg-black/15" : "bg-[#f6b800]"}`} /></div><strong className="mt-2 block text-3xl font-black tracking-[-.05em]">{value === null ? "—" : value}</strong><span className="mt-1 block text-[10px] font-bold text-black/35">{value === 0 ? "Queue clear" : value === null ? "Open workspace" : "Requires review"}</span></Link>;
}
