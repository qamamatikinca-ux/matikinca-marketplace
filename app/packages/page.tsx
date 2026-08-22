"use client";

import { useEffect, useMemo, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import {
  getManualCreditBalance,
  getManualListingProduct,
  startManualListingPayment,
  type ManualCreditBalance,
  type ManualListingProduct,
} from "@/lib/packageAccess";
import {
  getLoadLinkIntelligence,
  getPaystackManagementLink,
  loadLinkHumanError,
  requestLoadLinkPlan,
  startLoadLinkPayment,
  verifyReturnedLoadLinkPayment,
  type LoadLinkIntelligenceState,
} from "@/lib/loadlinkIntelligence";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type SubscriptionPlan = "pro" | "dealer";
type BusyAction = SubscriptionPlan | "manual" | "manage" | "verify" | "";

const entitledStates = new Set(["active", "trial", "trialing", "grace_period", "cancelled"]);
const paymentStates = new Set(["approved_for_payment", "payment_pending", "payment_failed", "payment_syncing"]);
const manualFallback: ManualListingProduct = {
  code: "manual_listing_credit",
  name: "Manual listing credit",
  unit_price_cents: 1500,
  currency: "ZAR",
  duration_days: 10,
  max_quantity: 100,
};

const planDetails = {
  pro: {
    name: "Pro",
    price: "R399",
    billing: "/ month",
    eyebrow: "Regular",
    description: "For individual owners and operators who advertise vehicles regularly.",
    features: ["Unlimited vehicle listings", "Up to 15 photos per listing", "Listing analytics", "Unlimited messages", "Higher search visibility", "Priority support"],
  },
  dealer: {
    name: "Dealer",
    price: "R2 999",
    billing: "/ month",
    eyebrow: "Dealership",
    description: "For dealerships that need a public showroom, inventory tools and a sales workspace.",
    features: ["Everything in Pro", "Public dealership showroom", "Dealer Status updates", "Lead and customer workspace", "Team roles", "Dealer analytics"],
  },
} as const;

function titleCasePlan(plan?: string | null) {
  if (plan === "dealer") return "Dealer";
  if (plan === "pro") return "Pro";
  if (plan === "manual") return "Manual";
  return "plan";
}

function money(cents: number) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 2 }).format(cents / 100);
}

export default function PackagesPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [state, setState] = useState<LoadLinkIntelligenceState | null>(null);
  const [manualProduct, setManualProduct] = useState<ManualListingProduct>(manualFallback);
  const [manualBalance, setManualBalance] = useState<ManualCreditBalance>({ available: 0, reserved: 0, consumed: 0 });
  const [manualQuantity, setManualQuantity] = useState(1);
  const [manualOpen, setManualOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<BusyAction>("");
  const [notice, setNotice] = useState("");

  const muted = darkMode ? "text-white/55" : "text-black/55";
  const surface = darkMode ? "border-white/10 bg-[#0a0a0a]" : "border-black/10 bg-white";
  const softSurface = darkMode ? "border-white/10 bg-white/[.035]" : "border-black/10 bg-black/[.025]";

  async function refreshAccount() {
    const fresh = await getLoadLinkIntelligence();
    setState(fresh);
    return fresh;
  }

  async function refreshManualBalance() {
    const fresh = await getManualCreditBalance();
    setManualBalance(fresh);
    return fresh;
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [freshState, product, credits] = await Promise.all([
          getLoadLinkIntelligence(),
          getManualListingProduct().catch(() => manualFallback),
          getManualCreditBalance().catch(() => ({ available: 0, reserved: 0, consumed: 0 })),
        ]);
        if (!mounted) return;
        setState(freshState);
        setManualProduct(product);
        setManualBalance(credits);
      } catch (error) {
        if (mounted) setNotice(loadLinkHumanError(error, "LoadLink could not read your package status right now."));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    const sync = () => void load();
    window.addEventListener("loadlink-account-state-changed", sync);
    return () => {
      mounted = false;
      window.removeEventListener("loadlink-account-state-changed", sync);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") !== "return") return;
    const reference = params.get("reference") || params.get("trxref") || "";
    if (!reference) {
      setNotice("LoadLink returned from checkout without a payment reference. Nothing has been activated.");
      return;
    }

    let active = true;
    async function verifyReturn() {
      setBusy("verify");
      setNotice("Confirming your payment…");
      try {
        const result = await verifyReturnedLoadLinkPayment(reference) as {
          payment_type?: string;
          result?: { quantity?: number; plan?: string };
        };
        if (!active) return;
        if (result.payment_type === "manual_listing_credit") {
          const quantity = Number(result.result?.quantity || 0);
          await refreshManualBalance();
          setNotice(quantity > 0 ? `Payment confirmed. ${quantity} Manual listing ${quantity === 1 ? "credit is" : "credits are"} ready to use.` : "Payment confirmed. Your Manual listing credits are ready to use.");
        } else {
          await refreshAccount();
          setNotice("Payment confirmed. Your LoadLink plan is active.");
        }
        window.history.replaceState({}, "", "/packages");
      } catch (error) {
        if (active) setNotice(loadLinkHumanError(error, "LoadLink is still confirming this payment. Refresh this page to try verification again."));
      } finally {
        if (active) setBusy("");
      }
    }
    void verifyReturn();
    return () => { active = false; };
  }, []);

  const activePlan: SubscriptionPlan | null =
    state?.plan === "dealer" && entitledStates.has(String(state.plan_state))
      ? "dealer"
      : state?.plan === "pro" && entitledStates.has(String(state.plan_state))
        ? "pro"
        : null;

  const pendingPlan: SubscriptionPlan | null =
    state?.plan_request_state === "under_review" && (state.plan_request_plan === "pro" || state.plan_request_plan === "dealer")
      ? state.plan_request_plan
      : null;

  const paymentPlan: SubscriptionPlan | null =
    paymentStates.has(String(state?.plan_request_state)) && (state?.plan_request_plan === "pro" || state?.plan_request_plan === "dealer")
      ? state.plan_request_plan
      : null;

  const manualTotalCents = useMemo(
    () => manualProduct.unit_price_cents * Math.max(1, Math.min(manualProduct.max_quantity, manualQuantity)),
    [manualProduct, manualQuantity],
  );
  const manualCovered = Boolean(activePlan);
  const manualDisabled = Boolean(busy || pendingPlan || manualCovered);

  async function managePlan() {
    if (busy) return;
    setBusy("manage");
    setNotice("");
    try {
      const response = await getPaystackManagementLink();
      window.location.assign(response.link);
    } catch (error) {
      setNotice(loadLinkHumanError(error, "Plan management is not available right now."));
    } finally {
      setBusy("");
    }
  }

  async function actSubscription(plan: SubscriptionPlan) {
    if (busy) return;
    setBusy(plan);
    setNotice("");
    try {
      const fresh = await refreshAccount();
      if (!fresh.authenticated) {
        window.location.assign(`/login?returnTo=${encodeURIComponent("/packages")}`);
        return;
      }
      if (["blocked", "suspended"].includes(String(fresh.account_status))) {
        setNotice(fresh.account_reason || "This account cannot request a plan right now.");
        return;
      }
      const freshPending = fresh.plan_request_state === "under_review" && (fresh.plan_request_plan === "pro" || fresh.plan_request_plan === "dealer")
        ? fresh.plan_request_plan
        : null;
      if (freshPending) {
        setNotice(freshPending === plan
          ? `Your ${titleCasePlan(plan)} request is already under review.`
          : `Your ${titleCasePlan(freshPending)} request is already under review. Finish that request before choosing another plan.`);
        return;
      }
      const sameRequest = fresh.plan_request_plan === plan && Boolean(fresh.plan_request_id);
      if (sameRequest && paymentStates.has(String(fresh.plan_request_state)) && fresh.plan_request_id) {
        const payment = await startLoadLinkPayment(fresh.plan_request_id);
        window.location.assign(payment.authorization_url);
        return;
      }
      if (fresh.plan === "dealer" && entitledStates.has(String(fresh.plan_state))) {
        if (plan === "dealer") await managePlan();
        else setNotice("Pro is already included in your Dealer plan.");
        return;
      }
      if (fresh.plan === plan && entitledStates.has(String(fresh.plan_state))) {
        await managePlan();
        return;
      }
      const result = (await requestLoadLinkPlan(plan)) as { message?: string } | null;
      setNotice(result?.message || "Your request has been received. LoadLink will notify you when it is ready.");
      await refreshAccount();
    } catch (error) {
      setNotice(loadLinkHumanError(error, "LoadLink could not submit that plan request right now."));
    } finally {
      setBusy("");
    }
  }

  async function payManual() {
    if (busy) return;
    setBusy("manual");
    setNotice("");
    try {
      const fresh = await refreshAccount();
      if (!fresh.authenticated) {
        window.location.assign(`/login?returnTo=${encodeURIComponent("/packages")}`);
        return;
      }
      if (["blocked", "suspended"].includes(String(fresh.account_status))) {
        setNotice(fresh.account_reason || "This account cannot start a payment right now.");
        return;
      }
      if (fresh.plan_request_state === "under_review") {
        setNotice(`Your ${titleCasePlan(fresh.plan_request_plan)} request is already under review. Finish that request before choosing Manual.`);
        return;
      }
      if ((fresh.plan === "pro" || fresh.plan === "dealer") && entitledStates.has(String(fresh.plan_state))) {
        setNotice(`Vehicle advertising is already included in your ${titleCasePlan(fresh.plan)} plan.`);
        return;
      }

      const product = await getManualListingProduct();
      setManualProduct(product);
      const quantity = Math.max(1, Math.min(product.max_quantity, manualQuantity));
      const expectedTotal = product.unit_price_cents * quantity;
      const payment = await startManualListingPayment(quantity);
      if (
        payment.quantity !== quantity ||
        payment.unit_price_cents !== product.unit_price_cents ||
        payment.duration_days !== product.duration_days ||
        payment.amount_cents !== expectedTotal ||
        payment.currency !== "ZAR"
      ) {
        throw new Error("LoadLink stopped checkout because the Manual listing total did not reconcile.");
      }
      window.location.assign(payment.authorization_url);
    } catch (error) {
      setNotice(loadLinkHumanError(error, "LoadLink could not start Manual payment right now."));
    } finally {
      setBusy("");
    }
  }

  function subscriptionButtonLabel(plan: SubscriptionPlan) {
    if (busy === plan || (busy === "manage" && activePlan === plan)) return "Working…";
    if (activePlan === plan) return `Manage ${titleCasePlan(plan)}`;
    if (activePlan === "dealer" && plan === "pro") return "Included with Dealer";
    if (pendingPlan === plan) return "Under review";
    if (pendingPlan && pendingPlan !== plan) return "Request already in review";
    if (paymentPlan === plan) return "Continue payment";
    if (activePlan === "pro" && plan === "dealer") return "Upgrade to Dealer";
    return `Choose ${titleCasePlan(plan)}`;
  }

  function subscriptionDisabled(plan: SubscriptionPlan) {
    if (Boolean(busy)) return true;
    if (activePlan === "dealer" && plan === "pro") return true;
    if (Boolean(pendingPlan)) return true;
    return false;
  }

  function changeManualQuantity(next: number) {
    setManualQuantity(Math.max(1, Math.min(manualProduct.max_quantity, Math.trunc(next) || 1)));
  }

  return (
    <main
      data-loadlink-packages-page="final-revision-20260822"
      className={darkMode ? "min-h-screen overflow-x-hidden bg-black text-white" : "min-h-screen overflow-x-hidden bg-[#f4efe3] text-black"}
    >
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <div className="mx-auto w-full max-w-6xl px-4 pb-[calc(48px+env(safe-area-inset-bottom))] pt-7 sm:px-6 md:pt-10">
        <header className="max-w-3xl">
          <p className={`text-[11px] font-black uppercase tracking-[.15em] ${muted}`}>LoadLink packages</p>
          <h1 className="mt-3 text-[38px] font-black leading-[.98] tracking-[-.055em] sm:text-[52px] md:text-[62px]">Pick the plan that fits how you work.</h1>
          <p className={`mt-4 max-w-2xl text-[14px] font-semibold leading-6 sm:text-[15px] ${muted}`}>
            Pay as you go for occasional vehicle listings, advertise regularly with Pro, or run a dealership workspace with Dealer.
          </p>
        </header>

        {loading ? (
          <section className={`mt-7 rounded-[24px] border p-5 ${softSurface}`} aria-label="Loading plan status">
            <div className="h-3 w-24 animate-pulse rounded-full bg-current/10" />
            <div className="mt-3 h-6 w-52 animate-pulse rounded-full bg-current/10" />
          </section>
        ) : pendingPlan ? (
          <section className={`mt-7 rounded-[24px] border p-5 sm:p-6 ${surface}`} aria-live="polite">
            <p className={`text-[10px] font-black uppercase tracking-[.14em] ${muted}`}>Request in review</p>
            <h2 className="mt-1 text-xl font-black tracking-[-.035em]">Your {titleCasePlan(pendingPlan)} request is already with LoadLink.</h2>
            <p className={`mt-2 text-xs font-semibold leading-5 ${muted}`}>You do not need to submit it again. This page will update when the request moves forward.</p>
          </section>
        ) : paymentPlan ? (
          <section className={`mt-7 rounded-[24px] border p-5 sm:p-6 ${surface}`} aria-live="polite">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className={`text-[10px] font-black uppercase tracking-[.14em] ${muted}`}>Ready for payment</p>
                <h2 className="mt-1 text-xl font-black tracking-[-.035em]">Your {titleCasePlan(paymentPlan)} request can continue.</h2>
              </div>
              <button type="button" onClick={() => void actSubscription(paymentPlan)} disabled={Boolean(busy)} className="h-12 rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black transition active:scale-[.99] disabled:opacity-45">Continue payment</button>
            </div>
          </section>
        ) : activePlan ? (
          <section className={`mt-7 rounded-[24px] border p-5 sm:p-6 ${surface}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className={`text-[10px] font-black uppercase tracking-[.14em] ${muted}`}>Current plan</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-.04em]">{titleCasePlan(activePlan)} is active</h2>
                <p className={`mt-1 text-xs font-semibold ${muted}`}>{activePlan === "dealer" ? "Your dealership tools and vehicle advertising are available." : "Your vehicle advertising and Pro tools are available."}</p>
              </div>
              <button type="button" onClick={() => void managePlan()} disabled={Boolean(busy)} className={`h-12 rounded-xl border px-5 text-sm font-black transition active:scale-[.99] disabled:opacity-45 ${darkMode ? "border-white/15" : "border-black/15"}`}>{busy === "manage" ? "Opening…" : "Manage plan"}</button>
            </div>
          </section>
        ) : null}

        {notice ? <div className={`mt-4 rounded-2xl border px-4 py-3 text-[12px] font-bold leading-5 ${softSurface}`} role="status" aria-live="polite">{notice}</div> : null}

        <section className="mt-8 grid gap-4 lg:grid-cols-3" aria-label="LoadLink plans">
          <article className={`flex min-w-0 flex-col rounded-[26px] border p-5 sm:p-6 ${surface}`}>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[.14em] ${muted}`}>Occasional</p>
              <h2 className="mt-2 text-[30px] font-black tracking-[-.05em]">Manual</h2>
              <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-[42px] font-black leading-none tracking-[-.06em]">{money(manualProduct.unit_price_cents).replace(",00", "")}</span>
                <span className={`text-xs font-extrabold ${muted}`}>per 10-day listing credit</span>
              </div>
              <p className={`mt-4 min-h-[60px] text-xs font-semibold leading-5 ${muted}`}>Pay only when you need to advertise. One credit activates one approved vehicle listing for {manualProduct.duration_days} days.</p>
            </div>

            <div className="my-5 h-px bg-current/10" />
            <ul className="grid gap-3">
              {["Up to 5 active Manual vehicle listings", "Up to 5 photos per listing", "Standard marketplace placement", "50 messages per day"].map((feature) => (
                <li key={feature} className="flex gap-3 text-[12px] font-semibold leading-5"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#f6b800]" /><span>{feature}</span></li>
              ))}
            </ul>

            {manualBalance.available > 0 ? (
              <div className={`mt-5 rounded-2xl border px-4 py-3 ${softSurface}`}>
                <p className="text-sm font-black">{manualBalance.available} credit{manualBalance.available === 1 ? "" : "s"} ready</p>
                <p className={`mt-1 text-[11px] font-semibold ${muted}`}>Your 10-day period starts when a listing is approved and goes live.</p>
                <button type="button" onClick={() => window.location.assign("/list-your-vehicle")} className="mt-3 text-[11px] font-black underline decoration-[#f6b800] decoration-2 underline-offset-4">List a vehicle</button>
              </div>
            ) : null}

            <div className="mt-auto pt-6">
              {!manualOpen ? (
                <button type="button" onClick={() => setManualOpen(true)} disabled={manualDisabled} className={`h-12 w-full rounded-xl text-sm font-black transition active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-45 ${darkMode ? "border border-white/15" : "border border-black/15"}`}>
                  {manualCovered ? `Included with ${titleCasePlan(activePlan)}` : pendingPlan ? "Request already in review" : "Buy Manual credits"}
                </button>
              ) : (
                <div className={`rounded-2xl border p-4 ${softSurface}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black">Manual listings</p>
                      <p className={`mt-1 text-[10px] font-semibold ${muted}`}>{money(manualProduct.unit_price_cents)} each · {manualProduct.duration_days} days each</p>
                    </div>
                    <div className="flex h-11 items-center overflow-hidden rounded-xl border border-current/15" aria-label="Manual listing quantity">
                      <button type="button" aria-label="Decrease quantity" onClick={() => changeManualQuantity(manualQuantity - 1)} disabled={manualQuantity <= 1 || Boolean(busy)} className="h-full w-11 text-lg font-black disabled:opacity-30">−</button>
                      <input aria-label="Manual listing quantity" type="number" inputMode="numeric" min={1} max={manualProduct.max_quantity} value={manualQuantity} onChange={(event) => changeManualQuantity(Number(event.target.value))} className={`h-full w-14 border-x border-current/15 bg-transparent text-center text-sm font-black outline-none ${darkMode ? "text-white" : "text-black"}`} />
                      <button type="button" aria-label="Increase quantity" onClick={() => changeManualQuantity(manualQuantity + 1)} disabled={manualQuantity >= manualProduct.max_quantity || Boolean(busy)} className="h-full w-11 text-lg font-black disabled:opacity-30">+</button>
                    </div>
                  </div>

                  <dl className="mt-4 grid gap-2 border-t border-current/10 pt-4 text-[11px] font-semibold">
                    <div className="flex justify-between gap-4"><dt className={muted}>Quantity</dt><dd className="font-black">{manualQuantity}</dd></div>
                    <div className="flex justify-between gap-4"><dt className={muted}>Price per listing</dt><dd className="font-black">{money(manualProduct.unit_price_cents)}</dd></div>
                    <div className="flex justify-between gap-4"><dt className={muted}>Duration</dt><dd className="font-black">{manualProduct.duration_days} days each</dd></div>
                    <div className="mt-1 flex justify-between gap-4 border-t border-current/10 pt-3"><dt className="font-black">Total</dt><dd className="text-base font-black">{money(manualTotalCents)}</dd></div>
                  </dl>

                  <p className={`mt-3 text-[10px] font-semibold leading-4 ${muted}`}>Each credit is separate. Buying 10 gives you 10 listing credits, not one 100-day listing. No bulk surcharge or hidden fee is added by LoadLink.</p>
                  <button type="button" onClick={() => void payManual()} disabled={busy === "manual" || busy === "verify"} className="mt-4 h-11 w-full rounded-xl bg-[#f6b800] text-sm font-black text-black transition active:scale-[.99] disabled:opacity-45">{busy === "manual" ? "Opening payment…" : `Continue to payment · ${money(manualTotalCents)}`}</button>
                  <button type="button" onClick={() => setManualOpen(false)} disabled={Boolean(busy)} className={`mt-3 w-full py-1 text-[11px] font-black ${muted}`}>Cancel</button>
                </div>
              )}
            </div>
          </article>

          {(["pro", "dealer"] as const).map((plan) => {
            const details = planDetails[plan];
            const isPro = plan === "pro";
            return (
              <article id={`${plan}-package`} key={plan} className={`relative flex min-w-0 flex-col rounded-[26px] border p-5 sm:p-6 ${isPro ? "border-[#f6b800]" : surface}`}>
                {isPro ? <span className="absolute right-5 top-5 rounded-full bg-[#f6b800] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.1em] text-black">Recommended</span> : null}
                <div className="pr-20"><p className={`text-[10px] font-black uppercase tracking-[.14em] ${muted}`}>{details.eyebrow}</p><h2 className="mt-2 text-[30px] font-black tracking-[-.05em]">{details.name}</h2></div>
                <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1"><span className="text-[42px] font-black leading-none tracking-[-.06em]">{details.price}</span><span className={`text-xs font-extrabold ${muted}`}>{details.billing}</span></div>
                <p className={`mt-4 min-h-[60px] text-xs font-semibold leading-5 ${muted}`}>{details.description}</p>
                <div className="my-5 h-px bg-current/10" />
                <ul className="grid gap-3">{details.features.map((feature) => <li key={feature} className="flex gap-3 text-[12px] font-semibold leading-5"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#f6b800]" /><span>{feature}</span></li>)}</ul>
                <div className="mt-auto pt-6"><button type="button" onClick={() => activePlan === plan ? void managePlan() : void actSubscription(plan)} disabled={subscriptionDisabled(plan)} className={`h-12 w-full rounded-xl text-sm font-black transition active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-45 ${isPro || (activePlan === "pro" && plan === "dealer") ? "bg-[#f6b800] text-black" : darkMode ? "border border-white/15" : "border border-black/15"}`}>{subscriptionButtonLabel(plan)}</button></div>
              </article>
            );
          })}
        </section>

        <section className={`mt-6 rounded-[24px] border p-5 sm:p-6 ${softSurface}`}>
          <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div><h2 className="text-lg font-black tracking-[-.035em]">Not sure which one fits?</h2><p className={`mt-1 text-xs font-semibold leading-5 ${muted}`}>Manual is pay-as-you-go. Pro is for regular owner-operators. Dealer is for a dealership, staff and a public showroom.</p></div>
            <button type="button" onClick={() => window.location.assign("/help")} className={`h-11 rounded-xl border px-4 text-xs font-black ${darkMode ? "border-white/15" : "border-black/15"}`}>Ask LoadLink support</button>
          </div>
        </section>
      </div>
    </main>
  );
}
