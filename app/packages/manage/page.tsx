"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { getLoadLinkIntelligence, getPaystackManagementLink, type LoadLinkIntelligenceState } from "@/lib/loadlinkIntelligence";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

const entitledStates = new Set(["active", "trial", "trialing", "grace_period", "cancelled", "past_due"]);

function planStateLabel(value?: string | null) {
  const state = String(value || "standard").toLowerCase();
  if (state === "active") return "Active";
  if (state === "trial" || state === "trialing") return "Trial";
  if (state === "grace_period") return "Grace period";
  if (state === "past_due") return "Payment due";
  if (state === "cancelled") return "Cancelled · access remaining";
  if (state === "expired") return "Expired";
  return state.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function dateLabel(value?: string | null) {
  if (!value) return "Not supplied";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not supplied";
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export default function ManagePackagePage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [state, setState] = useState<LoadLinkIntelligenceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const supportPhone = String(process.env.NEXT_PUBLIC_LOADLINK_SUPPORT_PHONE || "").trim();

  useEffect(() => {
    void getLoadLinkIntelligence().then(setState).catch(() => setNotice("LoadLink could not read your plan right now.")).finally(() => setLoading(false));
  }, []);

  async function manageBilling() {
    if (busy) return;
    setBusy(true); setNotice("");
    try {
      const response = await getPaystackManagementLink();
      window.location.assign(response.link);
    } catch {
      setNotice("Plan management is not available right now. Try again shortly or contact LoadLink support.");
      setBusy(false);
    }
  }

  const plan = state?.plan === "dealer" && entitledStates.has(String(state.plan_state)) ? "dealer" : state?.plan === "pro" && entitledStates.has(String(state.plan_state)) ? "pro" : null;
  const planName = plan === "dealer" ? "Dealer" : plan === "pro" ? "Pro" : "Standard";
  const status = planStateLabel(state?.plan_state);
  const periodEnd = dateLabel(state?.current_period_end);
  const page = darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4efe3] text-black";
  const surface = darkMode ? "border-white/12 bg-white/[.055]" : "border-black/10 bg-white/[.72]";
  const muted = darkMode ? "text-white/52" : "text-black/52";
  const subtle = darkMode ? "border-white/10 bg-black/25" : "border-black/8 bg-black/[.025]";
  const periodTitle = String(state?.plan_state) === "cancelled" ? "Plan ending" : "Current period ends";

  const information = useMemo(() => [
    { label: "Plan", value: planName },
    { label: "Status", value: status },
    { label: periodTitle, value: periodEnd },
    { label: "Payment", value: state?.payment_status ? planStateLabel(state.payment_status) : "No payment issue" },
  ], [periodEnd, periodTitle, planName, state?.payment_status, status]);

  if (loading) return <main className={page}><LoadLinkLoading /></main>;

  return <main className={page} data-loadlink-plan-manage="complete-20260823">
    <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
    <section className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6 md:pt-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/packages" className={`inline-flex min-h-10 items-center rounded-full border px-4 text-xs font-black ${darkMode ? "border-white/12 bg-white/[.035]" : "border-black/10 bg-white/55"}`}>← Packages</Link>
        <span className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[.1em] ${state?.plan_state === "active" ? "border-[#f6b800]/45 bg-[#f6b800]/10 text-[#a77900]" : subtle}`}>{status}</span>
      </div>

      <div className="mt-6">
        <p className={`text-[10px] font-black uppercase tracking-[.14em] ${muted}`}>Your LoadLink plan</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-.055em] sm:text-6xl">{plan ? `${planName} plan` : "Manage plan"}</h1>
        <p className={`mt-3 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>See your plan status, period end, billing controls and support in one place. No package changes happen without you choosing them.</p>
      </div>

      {!state?.authenticated ? <div className={`mt-7 rounded-[28px] border p-6 ${surface}`}><h2 className="text-xl font-black">Sign in to manage your plan</h2><Link href="/login?returnTo=%2Fpackages%2Fmanage" className="mt-5 inline-flex h-11 items-center rounded-full bg-[#f6b800] px-5 text-sm font-black text-black">Sign in</Link></div> : <>
        <section className={`mt-7 overflow-hidden rounded-[30px] border backdrop-blur-2xl ${surface}`}>
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-7">
            <div><p className={`text-[10px] font-black uppercase tracking-[.12em] ${muted}`}>Current access</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em]">{planName}</h2><p className={`mt-2 text-sm font-semibold ${muted}`}>{periodTitle}: <strong className={darkMode ? "text-white" : "text-black"}>{periodEnd}</strong></p></div>
            {plan ? <button type="button" onClick={() => void manageBilling()} disabled={busy} className="min-h-12 rounded-full bg-[#f6b800] px-6 text-sm font-black text-black disabled:opacity-45">{busy ? "Opening billing…" : "Manage billing"}</button> : <Link href="/packages" className="inline-flex min-h-12 items-center rounded-full bg-[#f6b800] px-6 text-sm font-black text-black">Choose a plan</Link>}
          </div>
          <div className={`grid border-t sm:grid-cols-2 lg:grid-cols-4 ${darkMode ? "border-white/10" : "border-black/8"}`}>{information.map((item) => <div key={item.label} className={`min-w-0 border-b p-5 sm:border-b-0 sm:border-r ${darkMode ? "border-white/10" : "border-black/8"}`}><p className={`text-[9px] font-black uppercase tracking-[.12em] ${muted}`}>{item.label}</p><p className="mt-2 break-words text-sm font-black">{item.value}</p></div>)}</div>
        </section>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section className={`rounded-[26px] border p-6 backdrop-blur-2xl ${surface}`}>
            <p className={`text-[10px] font-black uppercase tracking-[.12em] ${muted}`}>Billing & account</p>
            <div className="mt-4 grid gap-2">
              <InfoRow label="Account" value={state.email || "Signed-in LoadLink account"} darkMode={darkMode} />
              <InfoRow label="Payment status" value={state.payment_status ? planStateLabel(state.payment_status) : "No payment issue"} darkMode={darkMode} />
              {state.payment_reference ? <InfoRow label="Latest reference" value={state.payment_reference} darkMode={darkMode} /> : null}
            </div>
            {plan ? <button type="button" onClick={() => void manageBilling()} disabled={busy} className={`mt-5 flex min-h-11 w-full items-center justify-center rounded-full border text-xs font-black ${darkMode ? "border-white/15" : "border-black/12"}`}>Open subscription controls</button> : null}
          </section>

          <section className={`rounded-[26px] border p-6 backdrop-blur-2xl ${surface}`}>
            <p className={`text-[10px] font-black uppercase tracking-[.12em] ${muted}`}>Plan actions</p>
            <div className="mt-4 grid gap-2">
              {plan === "dealer" ? <Link href="/dealer" className={`flex min-h-12 items-center justify-between rounded-2xl border px-4 text-sm font-black ${subtle}`}><span>Dealership Centre</span><span>→</span></Link> : null}
              <Link href="/packages" className={`flex min-h-12 items-center justify-between rounded-2xl border px-4 text-sm font-black ${subtle}`}><span>Compare packages</span><span>→</span></Link>
              <Link href="/help" className={`flex min-h-12 items-center justify-between rounded-2xl border px-4 text-sm font-black ${subtle}`}><span>Help & support</span><span>→</span></Link>
              {supportPhone ? <a href={`tel:${supportPhone.replace(/\s/g, "")}`} className="flex min-h-12 items-center justify-between rounded-2xl bg-[#f6b800] px-4 text-sm font-black text-black"><span>Call support</span><span>↗</span></a> : null}
            </div>
          </section>
        </div>
      </>}

      {notice ? <div role="status" className={`mt-4 rounded-2xl border px-4 py-3 text-xs font-bold ${surface}`}>{notice}</div> : null}
    </section>
  </main>;
}

function InfoRow({ label, value, darkMode }: { label: string; value: string; darkMode: boolean }) {
  return <div className={`flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 ${darkMode ? "border-white/10 bg-black/20" : "border-black/8 bg-black/[.02]"}`}><span className="text-xs font-semibold opacity-45">{label}</span><strong className="max-w-[65%] break-words text-right text-xs">{value}</strong></div>;
}
