"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type TrialRow = {
  subscription_id: string;
  user_id: string;
  customer_name: string;
  email: string | null;
  plan: "pro" | "dealer" | string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

type GrantResult = {
  ok?: boolean;
  customer_name?: string;
  email?: string;
  plan?: string;
  ends_at?: string;
};

function dateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function planName(value: string) {
  return value === "dealer" ? "Dealer" : value === "pro" ? "Pro" : value;
}

function isActive(row: TrialRow) {
  if (!['trial', 'trialing'].includes(row.status)) return false;
  const end = row.ends_at ? new Date(row.ends_at).getTime() : 0;
  return end > Date.now();
}

export default function PlanTrialsPage() {
  const [role, setRole] = useState("");
  const [rows, setRows] = useState<TrialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [endingId, setEndingId] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<"pro" | "dealer">("pro");
  const [days, setDays] = useState(14);
  const [reason, setReason] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      if (!isSupabaseConfigured) throw new Error("Supabase is not configured for this deployment.");
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Sign in with an authorised LoadLink Control Centre account.");

      const [roleResult, queueResult] = await Promise.all([
        supabase.rpc("loadlink_phase2_admin_role"),
        supabase.rpc("loadlink_owner_plan_trial_queue", { p_limit: 200 }),
      ]);

      if (roleResult.error) throw roleResult.error;
      const activeRole = String(roleResult.data || "").toLowerCase();
      setRole(activeRole);
      if (!['owner', 'admin'].includes(activeRole)) throw new Error("Only the Owner or an authorised administrator can manage plan trials.");
      if (queueResult.error) throw queueResult.error;
      setRows((queueResult.data || []) as TrialRow[]);
    } catch (error) {
      setRows([]);
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Plan trials could not be loaded." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function grant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes("@")) {
      setMessage({ type: "error", text: "Enter the customer’s LoadLink account email." });
      return;
    }
    if (days < 1 || days > 60) {
      setMessage({ type: "error", text: "Trial length must be between 1 and 60 days." });
      return;
    }

    setBusy(true);
    try {
      const result = await supabase.rpc("loadlink_owner_grant_plan_trial", {
        p_email: cleanEmail,
        p_plan: plan,
        p_days: days,
        p_reason: reason.trim() || null,
      });
      if (result.error) throw result.error;
      const data = (result.data || {}) as GrantResult;
      setMessage({
        type: "success",
        text: `${planName(String(data.plan || plan))} access activated for ${data.customer_name || data.email || cleanEmail}${data.ends_at ? ` until ${dateTime(data.ends_at)}` : ""}.`,
      });
      setEmail("");
      setReason("");
      await load();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "The trial could not be activated." });
    } finally {
      setBusy(false);
    }
  }

  async function endTrial(row: TrialRow) {
    if (endingId) return;
    const note = window.prompt(`Why are you ending ${row.customer_name || row.email || "this customer"}’s ${planName(row.plan)} trial?`, "Ended by LoadLink Control Centre")?.trim();
    if (note === undefined) return;
    setEndingId(row.subscription_id);
    setMessage(null);
    try {
      const result = await supabase.rpc("loadlink_owner_end_plan_trial", {
        p_subscription_id: row.subscription_id,
        p_reason: note || null,
      });
      if (result.error) throw result.error;
      setMessage({ type: "success", text: `${planName(row.plan)} trial ended for ${row.customer_name || row.email || "customer"}.` });
      await load();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "The trial could not be ended." });
    } finally {
      setEndingId("");
    }
  }

  const activeCount = useMemo(() => rows.filter(isActive).length, [rows]);
  const proCount = useMemo(() => rows.filter((row) => isActive(row) && row.plan === "pro").length, [rows]);
  const dealerCount = useMemo(() => rows.filter((row) => isActive(row) && row.plan === "dealer").length, [rows]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => [row.customer_name, row.email, row.plan, row.status, row.reason].some((value) => String(value || "").toLowerCase().includes(needle)));
  }, [query, rows]);

  if (loading && rows.length === 0 && !message) {
    return <main className="min-h-screen bg-[#f4f2eb] text-black"><LoadLinkLoading /></main>;
  }

  return (
    <main className="min-h-screen bg-[#f3f1eb] text-black">
      <header className="border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div>
            <Link href="/admin" className="text-xl font-black tracking-[-.05em]">LOADLINK</Link>
            <p className="mt-0.5 text-[9px] font-black uppercase tracking-[.16em] text-black/35">Owner Control Centre</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-black/5 px-3 py-2 text-[10px] font-black uppercase tracking-[.1em] text-black/45 sm:inline-flex">{role || "owner"}</span>
            <Link href="/admin" className="rounded-xl bg-black px-4 py-3 text-xs font-black text-white">Control Centre</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9">
        <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#8a6500]">Owner access</p>
            <h1 className="mt-2 max-w-3xl text-4xl font-black tracking-[-.055em] sm:text-5xl">Plan trials without touching billing.</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-black/55">Grant temporary Pro or Dealer access to an existing LoadLink account by email. Trials are zero-value entitlements, separately audited from paid subscriptions, and can be ended from this screen.</p>
            <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
              <Metric label="Active trials" value={String(activeCount)} />
              <Metric label="Pro" value={String(proCount)} />
              <Metric label="Dealer" value={String(dealerCount)} />
            </div>
          </div>

          <form onSubmit={grant} className="rounded-[26px] border border-black/10 bg-white p-5 shadow-[0_22px_70px_rgba(0,0,0,.055)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#8a6500]">New access grant</p><h2 className="mt-1 text-2xl font-black tracking-[-.04em]">Start a free trial</h2></div>
              <span className="rounded-full bg-[#f6b800] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.1em]">Audited</span>
            </div>

            <label className="mt-5 block text-[10px] font-black uppercase tracking-[.12em] text-black/45">Customer email</label>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="off" placeholder="customer@email.co.za" className="mt-2 h-12 w-full rounded-xl border border-black/12 bg-[#faf9f6] px-4 text-sm font-bold outline-none transition focus:border-[#f6b800]" />

            <div className="mt-4 grid grid-cols-2 gap-2">
              {(["pro", "dealer"] as const).map((value) => <button key={value} type="button" onClick={() => setPlan(value)} className={`min-h-12 rounded-xl border px-4 text-left text-xs font-black transition ${plan === value ? "border-black bg-black text-white" : "border-black/10 bg-white text-black"}`}><span className="block text-[9px] uppercase tracking-[.12em] opacity-50">Plan</span>{planName(value)}</button>)}
            </div>

            <div className="mt-4 grid grid-cols-[120px_1fr] gap-3">
              <div><label className="block text-[10px] font-black uppercase tracking-[.12em] text-black/45">Days</label><input value={days} onChange={(event) => setDays(Math.max(1, Math.min(60, Number(event.target.value) || 1)))} type="number" min={1} max={60} className="mt-2 h-12 w-full rounded-xl border border-black/12 bg-[#faf9f6] px-4 text-sm font-black outline-none focus:border-[#f6b800]" /></div>
              <div><label className="block text-[10px] font-black uppercase tracking-[.12em] text-black/45">Internal note</label><input value={reason} onChange={(event) => setReason(event.target.value.slice(0, 240))} placeholder="Why this trial was granted" className="mt-2 h-12 w-full rounded-xl border border-black/12 bg-[#faf9f6] px-4 text-sm font-bold outline-none focus:border-[#f6b800]" /></div>
            </div>

            <button disabled={busy} type="submit" className="mt-5 min-h-12 w-full rounded-xl bg-[#f6b800] px-5 text-xs font-black uppercase tracking-[.08em] text-black transition hover:brightness-95 disabled:opacity-45">{busy ? "Activating…" : `Activate ${planName(plan)} trial`}</button>
            <p className="mt-3 text-[10px] font-semibold leading-5 text-black/40">The email must already belong to a LoadLink account. Existing paid access is protected and cannot be overwritten by a trial.</p>
          </form>
        </section>

        {message ? <div className={`mt-5 rounded-[18px] border p-4 text-sm font-bold ${message.type === "success" ? "border-emerald-500/25 bg-emerald-50 text-emerald-900" : "border-red-500/25 bg-red-50 text-red-900"}`}>{message.text}</div> : null}

        <section className="mt-8">
          <div className="flex flex-col gap-3 border-b border-black/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-[9px] font-black uppercase tracking-[.14em] text-black/35">Trial ledger</p><h2 className="mt-1 text-2xl font-black tracking-[-.04em]">Owner-granted access</h2></div>
            <div className="flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search email, name or plan" className="h-11 min-w-0 rounded-xl border border-black/10 bg-white px-4 text-xs font-bold outline-none focus:border-[#f6b800] sm:w-72" /><button type="button" onClick={() => void load()} className="h-11 rounded-xl border border-black/10 bg-white px-4 text-xs font-black">Refresh</button></div>
          </div>

          <div className="mt-4 grid gap-3">
            {!loading && filtered.length === 0 ? <div className="rounded-[24px] border border-black/10 bg-white px-6 py-14 text-center"><h3 className="text-xl font-black">No trials in this view</h3><p className="mt-2 text-sm font-semibold text-black/45">Granting a trial above will add it to this audited ledger.</p></div> : null}
            {filtered.map((row) => {
              const active = isActive(row);
              return <article key={row.subscription_id} className="rounded-[22px] border border-black/10 bg-white p-5 sm:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[.1em] ${active ? "bg-emerald-100 text-emerald-800" : "bg-black/5 text-black/45"}`}>{active ? "Active" : "Ended"}</span><span className="rounded-full bg-[#fff0af] px-3 py-1 text-[9px] font-black uppercase tracking-[.1em] text-[#6d5000]">{planName(row.plan)}</span></div>
                    <h3 className="mt-3 truncate text-xl font-black tracking-[-.03em]">{row.customer_name || "LoadLink member"}</h3>
                    <p className="mt-1 truncate text-xs font-bold text-black/48">{row.email || "Account email unavailable"}</p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] font-semibold text-black/45"><span>Started {dateTime(row.starts_at || row.created_at)}</span><span>{active ? "Ends" : "Ended"} {dateTime(row.ends_at)}</span>{row.reason ? <span>Note: {row.reason}</span> : null}</div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {active ? <><button type="button" disabled={Boolean(endingId)} onClick={() => { setEmail(row.email || ""); setPlan(row.plan === "dealer" ? "dealer" : "pro"); setDays(7); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="min-h-11 rounded-xl border border-black/10 px-4 text-xs font-black disabled:opacity-40">Extend</button><button type="button" disabled={Boolean(endingId)} onClick={() => void endTrial(row)} className="min-h-11 rounded-xl bg-black px-4 text-xs font-black text-white disabled:opacity-40">{endingId === row.subscription_id ? "Ending…" : "End trial"}</button></> : null}
                  </div>
                </div>
              </article>;
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-black/10 bg-white p-3.5 sm:p-4"><span className="block text-[8px] font-black uppercase tracking-[.12em] text-black/35">{label}</span><strong className="mt-1.5 block text-2xl font-black tracking-[-.04em]">{value}</strong></div>;
}
