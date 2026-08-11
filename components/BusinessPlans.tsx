"use client";

import { useEffect, useState } from "react";
import {
  getLoadLinkIntelligence,
  getPaystackManagementLink,
  requestLoadLinkPlan,
  startLoadLinkPayment,
  type LoadLinkIntelligenceState,
} from "@/lib/loadlinkIntelligence";

export type BusinessPlanId = "pro" | "dealer";
const entitled = new Set(["active", "trial", "trialing", "grace_period", "cancelled"]);
const plans = [
  {
    id: "pro" as const,
    name: "Pro",
    price: "R399",
    description: "For individual owners and operators who advertise vehicles regularly.",
    features: ["Unlimited vehicle listings", "Up to 15 photos per listing", "Listing analytics", "Unlimited messages", "Higher search visibility", "Priority support"],
  },
  {
    id: "dealer" as const,
    name: "Dealer",
    price: "R2 999",
    description: "For dealerships that need a showroom, sales workspace and team tools.",
    features: ["Everything in Pro", "Public dealership showroom", "Dealer Status", "Lead and customer workspace", "Quotes and follow-ups", "Team roles", "Dealer analytics", "Inventory and sales tools"],
  },
];

export default function BusinessPlans({
  darkMode = false,
  compact = false,
  selectable = false,
  selectedPlan = null,
  onSelect,
  enableRequests = false,
}: {
  darkMode?: boolean;
  compact?: boolean;
  selectable?: boolean;
  selectedPlan?: BusinessPlanId | null;
  onSelect?: (p: BusinessPlanId) => void;
  enableRequests?: boolean;
}) {
  const [state, setState] = useState<LoadLinkIntelligenceState | null>(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [compareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
    void getLoadLinkIntelligence().then(setState).catch(() => setState(null));
  }, []);

  const muted = darkMode ? "text-white/55" : "text-black/55";
  const internal = String(state?.email || "").toLowerCase() === "loadlinksouthafrica@gmail.com";
  const activePlan = state && entitled.has(String(state.plan_state)) && (state.plan === "pro" || state.plan === "dealer") ? state.plan : null;
  const showActiveDashboard = Boolean(enableRequests && !compact && !selectable && activePlan);
  const showCards = !showActiveDashboard || compareOpen;

  async function refresh() {
    const fresh = await getLoadLinkIntelligence();
    setState(fresh);
    return fresh;
  }

  async function act(plan: BusinessPlanId) {
    if (selectable) { onSelect?.(plan); return; }
    if (!enableRequests) return;
    setBusy(plan);
    setNotice("");
    try {
      const fresh = await refresh();
      if (!fresh.authenticated) {
        window.location.assign(`/login?returnTo=${encodeURIComponent("/packages#plans")}`);
        return;
      }
      if (["blocked", "suspended"].includes(fresh.account_status)) throw new Error(fresh.account_reason || "This account cannot request a plan right now.");

      const requestForPlan = fresh.plan_request_plan === plan;
      if (requestForPlan && ["approved_for_payment", "payment_pending", "payment_failed", "payment_syncing"].includes(String(fresh.plan_request_state)) && fresh.plan_request_id) {
        const payment = await startLoadLinkPayment(fresh.plan_request_id);
        window.location.assign(payment.authorization_url);
        return;
      }
      if (requestForPlan && fresh.plan_request_state === "under_review") {
        setNotice(`Your ${plan === "dealer" ? "Dealer" : "Pro"} request is already under review. You don’t need to submit it again.`);
        return;
      }
      if (fresh.plan === "dealer" && entitled.has(String(fresh.plan_state))) {
        if (plan === "dealer") window.location.assign("/dealer");
        else setNotice("Pro is already included in your Dealer plan.");
        return;
      }
      if (fresh.plan === plan && entitled.has(String(fresh.plan_state))) {
        await manage();
        return;
      }

      const result = await requestLoadLinkPlan(plan) as { message?: string } | null;
      setNotice(result?.message || "Your request has been received.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "LoadLink could not complete that request.");
    } finally {
      setBusy("");
    }
  }

  async function manage() {
    setBusy("manage");
    setNotice("");
    try {
      const response = await getPaystackManagementLink();
      window.location.assign(response.link);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Plan management is not available right now.");
    } finally {
      setBusy("");
    }
  }

  function renewalText() {
    if (!state?.current_period_end) return "Billing and renewal details are available in plan management.";
    const date = new Date(state.current_period_end);
    if (!Number.isFinite(date.getTime())) return "Billing and renewal details are available in plan management.";
    return `Current period ends ${new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(date)}.`;
  }

  return <section id="plans" className={compact ? "" : `px-4 pb-14 pt-6 md:px-6 ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}>
    <div className="mx-auto max-w-5xl">
      {showActiveDashboard ? <section className={`mb-5 overflow-hidden rounded-[26px] border ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
        <div className="p-5 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[.14em] ${muted}`}>Your current plan</p>
              <h2 className="mt-2 text-[34px] font-black tracking-[-.055em] md:text-[44px]">{activePlan === "dealer" ? "Dealer" : "Pro"}</h2>
              <p className={`mt-2 max-w-xl text-xs font-semibold leading-5 ${muted}`}>{activePlan === "dealer" ? "Your dealership plan is active. Manage billing or continue to your Dealer workspace." : "Your Pro plan is active. Manage billing, compare features or upgrade when you need dealership tools."}</p>
              <p className={`mt-2 text-[10px] font-semibold ${muted}`}>{renewalText()}</p>
            </div>
            <span className="rounded-full bg-[#f6b800] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-black">Active</span>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <button type="button" onClick={() => void manage()} disabled={busy === "manage"} className="h-12 rounded-xl bg-[#f6b800] px-4 text-sm font-black text-black disabled:opacity-45">{busy === "manage" ? "Opening…" : activePlan === "dealer" ? "Manage Dealer plan" : "Manage Pro plan"}</button>
            {activePlan === "dealer" ? <button type="button" onClick={() => window.location.assign("/dealer")} className={`h-12 rounded-xl border px-4 text-sm font-black ${darkMode ? "border-white/15" : "border-black/12"}`}>Open Dealer workspace</button> : <button type="button" onClick={() => void act("dealer")} disabled={busy === "dealer"} className={`h-12 rounded-xl border px-4 text-sm font-black ${darkMode ? "border-white/15" : "border-black/12"} disabled:opacity-45`}>{busy === "dealer" ? "Working…" : "Upgrade to Dealer"}</button>}
            <button type="button" onClick={() => setCompareOpen((value) => !value)} className={`h-12 rounded-xl border px-4 text-sm font-black ${darkMode ? "border-white/15" : "border-black/12"}`}>{compareOpen ? "Hide comparison" : "Compare plans"}</button>
          </div>
        </div>
      </section> : null}

      {!compact && !showActiveDashboard ? <div className="mb-5"><h2 className="text-[28px] font-black tracking-[-.05em] md:text-[38px]">Choose how you sell vehicles</h2><p className={`mt-2 max-w-xl text-xs font-semibold leading-5 ${muted}`}>Job posting stays free. Vehicle advertising uses Pro or Dealer.</p></div> : null}

      {showCards ? <div className="grid gap-3 lg:grid-cols-2">{plans.map((plan) => {
        const active = state?.plan === plan.id && entitled.has(String(state?.plan_state));
        const dealerIncludesPro = plan.id === "pro" && state?.plan === "dealer" && entitled.has(String(state?.plan_state));
        const requestForPlan = state?.plan_request_plan === plan.id;
        const requested = requestForPlan && state?.plan_request_state === "under_review" && Boolean(state?.plan_request_id);
        const pay = requestForPlan && ["approved_for_payment", "payment_pending", "payment_failed", "payment_syncing"].includes(String(state?.plan_request_state)) && Boolean(state?.plan_request_id);
        const selected = selectedPlan === plan.id;
        const upgrading = plan.id === "dealer" && state?.plan === "pro" && entitled.has(String(state?.plan_state)) && !requestForPlan;

        return <article id={`${plan.id}-package`} key={plan.id} className={`rounded-[22px] border p-5 md:p-6 ${selected || active ? "border-[#f6b800]" : darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
          <div className="flex items-start justify-between gap-3"><div><h3 className="text-2xl font-black tracking-[-.04em]">{plan.name}</h3><p className={`mt-1 text-xs font-semibold leading-5 ${muted}`}>{plan.description}</p></div>{active ? <span className="text-[9px] font-black uppercase tracking-[.08em] opacity-50">Current plan</span> : null}</div>
          <div className="mt-5 flex items-baseline gap-2"><span className="text-[42px] font-black leading-none tracking-[-.055em]">{plan.price}</span><span className={`text-[15px] font-extrabold leading-none tracking-[-.02em] ${darkMode ? "text-white/68" : "text-black/62"}`}>/month</span></div>
          <div className="my-5 h-px bg-current/10" />
          <ul className="grid gap-2.5 sm:grid-cols-2">{plan.features.map((feature) => <li key={feature} className="flex gap-2 text-[11px] font-semibold"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f6b800]" />{feature}</li>)}</ul>
          {plan.id === "dealer" && !internal ? <button type="button" onClick={() => window.location.assign("/dealership/loadlink-test-dealership")} className="mt-5 text-[10px] font-black underline decoration-[#f6b800] decoration-2 underline-offset-4">View example dealership</button> : null}
          <button type="button" disabled={busy === plan.id || requested || dealerIncludesPro} onClick={() => active ? void manage() : void act(plan.id)} className={`mt-5 h-12 w-full rounded-xl text-sm font-black ${active || dealerIncludesPro ? darkMode ? "border border-white/12 bg-white/[.04]" : "border border-black/10 bg-black/[.03]" : "bg-[#f6b800] text-black"} disabled:opacity-45`}>
            {busy === plan.id || (active && busy === "manage") ? "Working…" : active ? `Manage ${plan.name} plan` : dealerIncludesPro ? "Included with Dealer" : pay ? "Continue payment" : requested ? "Under review" : upgrading ? "Upgrade to Dealer" : selectable && selected ? "Selected" : `Choose ${plan.name}`}
          </button>
        </article>;
      })}</div> : null}

      {notice ? <div role="status" className={`mt-4 rounded-[16px] border p-4 text-xs font-bold ${darkMode ? "border-white/10 bg-white/[.03]" : "border-black/10 bg-white"}`}>{notice}</div> : null}
    </div>
  </section>;
}
