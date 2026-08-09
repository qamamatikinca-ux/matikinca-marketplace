"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { isAuthenticatedUser, loginHref } from "@/lib/auth";
import { requestManualListingPayment, requestSubscription } from "@/lib/packageAccess";
import { supabase } from "@/lib/supabaseClient";

export type BusinessPlanId = "manual" | "pro" | "dealer";

type Plan = {
  id: BusinessPlanId;
  name: string;
  price: string;
  billing: string;
  description: string;
  features: string[];
};

const plans: Plan[] = [
  {
    id: "manual",
    name: "Manual listing",
    price: "R15",
    billing: "per vehicle, per day",
    description: "Pay only when you need to advertise one vehicle.",
    features: ["One vehicle listing", "Up to 5 photos", "Standard search placement", "50 messages per day"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "R399",
    billing: "per month",
    description: "For operators who list regularly and want analytics and stronger visibility.",
    features: ["More active listings", "Up to 15 photos", "Listing analytics", "Stronger marketplace visibility", "Priority support"],
  },
  {
    id: "dealer",
    name: "Dealer",
    price: "R2 999",
    billing: "per month",
    description: "A complete public dealership presence with inventory, leads and staff tools.",
    features: ["Public dealership showroom", "Inventory slider and product pages", "Followers and dealership updates", "Lead management", "Staff access", "Dealer analytics"],
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
    <section id="plans" className={compact ? "" : `px-4 py-8 md:px-6 md:py-10 ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}>
      <div className="mx-auto max-w-6xl">
        {!compact ? <div className="mb-6 max-w-3xl"><h2 className="text-4xl font-black tracking-[-.045em] md:text-5xl">Compare packages</h2><p className={`mt-3 text-sm font-semibold leading-6 ${darkMode ? "text-white/55" : "text-black/55"}`}>Job posting stays free. Choose paid access only for vehicle advertising, analytics or dealership tools.</p></div> : null}
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const selected = selectedPlan === plan.id;
            const dealer = plan.id === "dealer";
            return (
              <article id={`${plan.id}-package`} key={plan.id} className={`rounded-[26px] border p-5 md:p-6 ${selected ? "border-[#f6b800] ring-2 ring-[#f6b800]/20" : dealer ? darkMode ? "border-[#f6b800]/45 bg-[#10100d]" : "border-[#f6b800]/55 bg-[#fffaf0]" : darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
                <div className="flex items-start justify-between gap-4"><div><h3 className="text-2xl font-black tracking-[-.035em]">{plan.name}</h3><div className="mt-3 flex items-end gap-2"><span className="text-4xl font-black tracking-[-.05em]">{plan.price}</span><span className={`pb-1 text-xs font-semibold ${darkMode ? "text-white/45" : "text-black/45"}`}>{plan.billing}</span></div></div>{dealer ? <span className="rounded-full bg-[#f6b800] px-3 py-1 text-[10px] font-black text-black">Dealership</span> : null}</div>
                <p className={`mt-4 min-h-12 text-sm font-semibold leading-6 ${darkMode ? "text-white/55" : "text-black/55"}`}>{plan.description}</p>
                <ul className="mt-5 space-y-3">{plan.features.map((feature) => <li key={feature} className="flex items-start gap-2 text-sm font-semibold"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f6b800] text-[10px] font-black text-black">✓</span>{feature}</li>)}</ul>

                {selectable ? (
                  <button type="button" onClick={() => onSelect?.(plan.id)} className={`mt-6 h-12 w-full rounded-xl text-sm font-black ${selected ? "bg-[#2f9f5b] text-white" : "bg-[#f6b800] text-black"}`}>{selected ? "Selected" : `Choose ${plan.name}`}</button>
                ) : enableRequests && plan.id === "manual" ? (
                  <div className="mt-6">
                    {!manualOpen ? <button type="button" onClick={() => setManualOpen(true)} className="h-12 w-full rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black">Choose Manual</button> : <div className={`rounded-2xl border p-4 ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-[#faf8f2]"}`}><div className="flex items-center justify-between gap-3"><label className="text-xs font-black">Days<input type="number" min={1} max={365} value={days} onChange={(event) => setDays(Math.max(1, Math.min(365, Number(event.target.value) || 1)))} className={`mt-2 h-11 w-full rounded-xl border px-3 text-base font-black outline-none focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-black" : "border-black/10 bg-white"}`} /></label><div className="text-right"><p className={`text-xs font-bold ${darkMode ? "text-white/45" : "text-black/45"}`}>Total</p><p className="mt-1 text-2xl font-black">R{total}</p></div></div><button type="button" disabled={Boolean(busy)} onClick={() => void requestManual()} className="mt-4 h-11 w-full rounded-xl bg-[#f6b800] text-sm font-black text-black disabled:opacity-45">{busy === "manual" ? "Creating request…" : "Request Manual"}</button><button type="button" onClick={() => setManualOpen(false)} className={`mt-3 w-full text-xs font-black underline underline-offset-4 ${darkMode ? "text-white/45" : "text-black/45"}`}>Cancel</button></div>}
                  </div>
                ) : enableRequests && plan.id === "pro" ? (
                  <button type="button" disabled={Boolean(busy)} onClick={() => void requestPlan("pro")} className="mt-6 h-12 w-full rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black disabled:opacity-45">{busy === "pro" ? "Creating request…" : "Request Pro"}</button>
                ) : enableRequests && plan.id === "dealer" ? (
                  <div className="mt-6 grid gap-2"><button type="button" disabled={Boolean(busy)} onClick={() => void requestPlan("dealer")} className="h-12 w-full rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black disabled:opacity-45">{busy === "dealer" ? "Creating request…" : "Request Dealer"}</button><Link href="/dealership/loadlink-commercial-centurion" className={`flex h-12 items-center justify-center rounded-xl border px-5 text-sm font-black ${darkMode ? "border-white/15" : "border-black/10"}`}>View dealership example</Link></div>
                ) : dealer ? (
                  <div className="mt-6 grid gap-2"><Link href="/packages#dealer-package" className="flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black">View Dealer</Link><Link href="/dealership/loadlink-commercial-centurion" className={`flex h-12 items-center justify-center rounded-xl border px-5 text-sm font-black ${darkMode ? "border-white/15" : "border-black/10"}`}>View dealership example</Link></div>
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
