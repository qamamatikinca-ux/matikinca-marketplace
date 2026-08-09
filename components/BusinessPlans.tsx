"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { isAuthenticatedUser, loginHref } from "@/lib/auth";
import { requestManualListingPayment, requestSubscription } from "@/lib/packageAccess";
import { supabase } from "@/lib/supabaseClient";

export type BusinessPlanId = "manual" | "pro" | "dealer";

type Plan = {
  id: BusinessPlanId;
  eyebrow: string;
  name: string;
  price: string;
  billing: string;
  description: string;
  features: string[];
  note: string;
};

const plans: Plan[] = [
  {
    id: "manual",
    eyebrow: "Occasional advertising",
    name: "Manual listing",
    price: "R15",
    billing: "per vehicle / day",
    description: "Simple one-off access when you only need to advertise a vehicle for a few days.",
    features: ["1 active vehicle listing", "Up to 5 photos", "Standard marketplace placement", "50 messages per day"],
    note: "No monthly subscription.",
  },
  {
    id: "pro",
    eyebrow: "Regular operators",
    name: "Pro",
    price: "R399",
    billing: "per month",
    description: "For operators who list regularly and need richer listings, analytics and stronger marketplace tools.",
    features: ["More active vehicle listings", "Up to 15 photos per listing", "Listing analytics", "Stronger visibility", "Priority support"],
    note: "Best value for frequent non-dealer advertising.",
  },
  {
    id: "dealer",
    eyebrow: "Dealership accounts",
    name: "Dealer",
    price: "R2 999",
    billing: "per month",
    description: "A dealership sales workspace with a public showroom, inventory, leads, staff and brand tools.",
    features: ["Public dealership showroom", "15 photos per vehicle", "Inventory slider + vehicle pages", "Lead management", "Staff access", "Dealer analytics + updates"],
    note: "Dealer listings never use the 5-photo tier. Tailored Dealer-style access starts at R2 500/month.",
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
  onSelect?: (plan: BusinessPlanId) => void;
  enableRequests?: boolean;
}) {
  const [manualOpen, setManualOpen] = useState(false);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState<BusinessPlanId | null>(null);
  const [notice, setNotice] = useState("");
  const total = useMemo(() => Math.max(1, days) * 15, [days]);
  const muted = darkMode ? "text-white/55" : "text-black/55";

  async function requireAccount() {
    const { data: { user } } = await supabase.auth.getUser();
    if (isAuthenticatedUser(user)) return true;
    window.location.assign(loginHref("/packages#plans"));
    return false;
  }

  async function requestManual() {
    if (!(await requireAccount())) return;
    setBusy("manual");
    setNotice("");
    try {
      const result = await requestManualListingPayment(days);
      setNotice(`Manual listing request ${result.reference} created for R${(result.amount_cents / 100).toFixed(2)}. Access activates after payment is confirmed.`);
    } catch {
      setNotice("The Manual listing request could not be created. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function requestPlan(plan: "pro" | "dealer") {
    if (!(await requireAccount())) return;
    setBusy(plan);
    setNotice("");
    try {
      const result = await requestSubscription(plan);
      setNotice(`${plan === "dealer" ? "Dealer" : "Pro"} request ${result.reference} created for R${(result.amount_cents / 100).toFixed(2)}. Access activates after payment${plan === "dealer" ? " and dealership approval" : ""}.`);
    } catch {
      setNotice("The package request could not be created. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      id="plans"
      data-loadlink-business-plans="v2619"
      className={compact ? "" : `px-4 pb-12 pt-7 md:px-6 md:pb-16 md:pt-10 ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}
    >
      <div className="mx-auto max-w-6xl">
        {!compact ? (
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#f6b800]" /><p className={`text-[10px] font-black uppercase tracking-[.18em] ${muted}`}>Package pricing</p></div>
              <h2 className="mt-3 text-4xl font-black tracking-[-.055em] md:text-5xl">Compare without the clutter.</h2>
              <p className={`mt-3 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>Job posting stays free. These packages are for vehicle advertising and business tools.</p>
            </div>
            <p className={`max-w-sm text-xs font-semibold leading-5 ${muted}`}>Dealer is a commercial package: R2 999/month standard, 15 photos per vehicle, public showroom and dealership tools.</p>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const selected = selectedPlan === plan.id;
            const dealer = plan.id === "dealer";
            const card = selected
              ? "border-[#f6b800] ring-2 ring-[#f6b800]/20"
              : dealer
                ? darkMode ? "border-[#f6b800]/55 bg-[#11100b]" : "border-[#d49b00]/55 bg-[#fff9e9]"
                : darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";

            return (
              <article id={`${plan.id}-package`} key={plan.id} className={`relative overflow-hidden rounded-[26px] border p-5 md:p-6 ${card}`}>
                {dealer ? <div className="absolute inset-x-0 top-0 h-1 bg-[#f6b800]" /> : null}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className={`text-[9px] font-black uppercase tracking-[.16em] ${dealer ? "text-[#c89200]" : muted}`}>{plan.eyebrow}</p>
                    <h3 className="mt-2 text-2xl font-black tracking-[-.035em]">{plan.name}</h3>
                  </div>
                  {dealer ? <span className="rounded-full bg-[#f6b800] px-3 py-1 text-[9px] font-black uppercase tracking-[.08em] text-black">Dealer</span> : null}
                </div>

                <div className="mt-5 flex flex-wrap items-end gap-2">
                  <span className="text-[2.65rem] font-black leading-none tracking-[-.055em]">{plan.price}</span>
                  <span className={`pb-1 text-xs font-bold ${muted}`}>{plan.billing}</span>
                </div>
                <p className={`mt-4 min-h-[72px] text-sm font-semibold leading-6 ${muted}`}>{plan.description}</p>

                <div className={`my-5 h-px ${darkMode ? "bg-white/10" : "bg-black/8"}`} />
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm font-semibold">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f6b800] text-[10px] font-black text-black">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <p className={`mt-5 rounded-xl border px-3 py-2.5 text-[11px] font-bold leading-5 ${darkMode ? "border-white/10 bg-white/[.03] text-white/50" : "border-black/8 bg-black/[.025] text-black/50"}`}>{plan.note}</p>

                {selectable ? (
                  <button type="button" onClick={() => onSelect?.(plan.id)} className={`mt-6 h-12 w-full rounded-xl text-sm font-black ${selected ? "bg-[#2f9f5b] text-white" : "bg-[#f6b800] text-black"}`}>{selected ? "Selected" : `Choose ${plan.name}`}</button>
                ) : enableRequests && plan.id === "manual" ? (
                  <div className="mt-6">
                    {!manualOpen ? (
                      <button type="button" onClick={() => setManualOpen(true)} className="h-12 w-full rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black">Choose Manual</button>
                    ) : (
                      <div className={`rounded-2xl border p-4 ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-[#faf8f2]"}`}>
                        <div className="flex items-end justify-between gap-4">
                          <label className="min-w-0 flex-1 text-xs font-black">Days
                            <input type="number" min={1} max={365} value={days} onChange={(event) => setDays(Math.max(1, Math.min(365, Number(event.target.value) || 1)))} className={`mt-2 h-11 w-full rounded-xl border px-3 text-base font-black outline-none focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-black" : "border-black/10 bg-white"}`} />
                          </label>
                          <div className="text-right"><p className={`text-[10px] font-bold uppercase ${muted}`}>Total</p><p className="mt-1 text-2xl font-black">R{total}</p></div>
                        </div>
                        <button type="button" disabled={Boolean(busy)} onClick={() => void requestManual()} className="mt-4 h-11 w-full rounded-xl bg-[#f6b800] text-sm font-black text-black disabled:opacity-45">{busy === "manual" ? "Creating request…" : "Request Manual"}</button>
                        <button type="button" onClick={() => setManualOpen(false)} className={`mt-3 w-full text-xs font-black underline decoration-[#f6b800] decoration-2 underline-offset-4 ${muted}`}>Cancel</button>
                      </div>
                    )}
                  </div>
                ) : enableRequests && plan.id === "pro" ? (
                  <button type="button" disabled={Boolean(busy)} onClick={() => void requestPlan("pro")} className="mt-6 h-12 w-full rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black disabled:opacity-45">{busy === "pro" ? "Creating request…" : "Request Pro"}</button>
                ) : enableRequests && plan.id === "dealer" ? (
                  <div className="mt-6 grid gap-2">
                    <button type="button" disabled={Boolean(busy)} onClick={() => void requestPlan("dealer")} className="h-12 w-full rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black disabled:opacity-45">{busy === "dealer" ? "Creating request…" : "Request Dealer"}</button>
                    <Link href="/dealership/loadlink-commercial-centurion" className={`flex h-12 items-center justify-center rounded-xl border px-5 text-sm font-black ${darkMode ? "border-white/15" : "border-black/10"}`}>View dealership example</Link>
                  </div>
                ) : dealer ? (
                  <div className="mt-6 grid gap-2">
                    <Link href="/packages#dealer-package" className="flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black">View Dealer</Link>
                    <Link href="/dealership/loadlink-commercial-centurion" className={`flex h-12 items-center justify-center rounded-xl border px-5 text-sm font-black ${darkMode ? "border-white/15" : "border-black/10"}`}>View dealership example</Link>
                  </div>
                ) : (
                  <Link href={`/packages#${plan.id}-package`} className="mt-6 flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black">View {plan.name}</Link>
                )}
              </article>
            );
          })}
        </div>

        {enableRequests && notice ? <div className={`mt-5 rounded-2xl border p-4 text-sm font-bold leading-6 ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>{notice}</div> : null}
      </div>
    </section>
  );
}
