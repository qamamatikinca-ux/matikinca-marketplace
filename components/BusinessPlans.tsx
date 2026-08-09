"use client";

import Link from "next/link";

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
    description: "Pay only when you need to advertise a vehicle.",
    features: ["One vehicle listing", "Up to 5 photos", "Standard search placement", "50 messages per day"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "R399",
    billing: "per month",
    description: "For operators who list regularly and need more control over performance.",
    features: ["More active listings", "Up to 15 photos", "Listing analytics", "Stronger marketplace visibility", "Priority support"],
  },
  {
    id: "dealer",
    name: "Dealer",
    price: "R2 999",
    billing: "per month",
    description: "A complete public dealership presence with inventory and lead tools.",
    features: ["Public dealership showroom", "Inventory slider and product pages", "Followers and dealership updates", "Lead management", "Staff access", "Dealer analytics"],
  },
];

export default function BusinessPlans({
  darkMode = false,
  compact = false,
  selectable = false,
  selectedPlan = null,
  onSelect,
}: {
  darkMode?: boolean;
  compact?: boolean;
  selectable?: boolean;
  selectedPlan?: BusinessPlanId | null;
  onSelect?: (plan: BusinessPlanId) => void;
}) {
  return (
    <section className={compact ? "" : `px-4 py-8 md:px-6 md:py-10 ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}>
      <div className="mx-auto max-w-6xl">
        {!compact ? <div className="mb-6 max-w-3xl"><h2 className="text-4xl font-black tracking-[-.045em] md:text-5xl">Choose how you want to sell</h2><p className={`mt-3 text-sm font-semibold leading-6 ${darkMode ? "text-white/55" : "text-black/55"}`}>Job posts stay free. Vehicle packages control photo limits, analytics and dealership tools.</p></div> : null}
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const selected = selectedPlan === plan.id;
            const dealer = plan.id === "dealer";
            return (
              <article id={dealer ? "dealer-package" : undefined} key={plan.id} className={`rounded-[26px] border p-5 md:p-6 ${selected ? "border-[#f6b800] ring-2 ring-[#f6b800]/20" : darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
                <div className="flex items-start justify-between gap-4"><div><h3 className="text-2xl font-black tracking-[-.035em]">{plan.name}</h3><div className="mt-3 flex items-end gap-2"><span className="text-4xl font-black tracking-[-.05em]">{plan.price}</span><span className={`pb-1 text-xs font-semibold ${darkMode ? "text-white/45" : "text-black/45"}`}>{plan.billing}</span></div></div>{dealer ? <span className="rounded-full bg-[#f6b800] px-3 py-1 text-[10px] font-black text-black">Dealership</span> : null}</div>
                <p className={`mt-4 min-h-12 text-sm font-semibold leading-6 ${darkMode ? "text-white/55" : "text-black/55"}`}>{plan.description}</p>
                <ul className="mt-5 space-y-3">{plan.features.map((feature) => <li key={feature} className="flex items-start gap-2 text-sm font-semibold"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f6b800] text-[10px] font-black text-black">✓</span>{feature}</li>)}</ul>
                {selectable ? <button type="button" onClick={() => onSelect?.(plan.id)} className={`mt-6 h-12 w-full rounded-xl text-sm font-black ${selected ? "bg-[#2f9f5b] text-white" : "bg-[#f6b800] text-black"}`}>{selected ? "Selected" : `Choose ${plan.name}`}</button> : dealer ? <div className="mt-6 grid gap-2"><Link href="/packages#activate-plan" className="flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black">Request Dealer</Link><Link href="/dealership/loadlink-commercial-centurion" className={`flex h-12 items-center justify-center rounded-xl border px-5 text-sm font-black ${darkMode ? "border-white/15" : "border-black/10"}`}>View dealership example</Link></div> : <Link href="/packages#activate-plan" className="mt-6 flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black">Activate {plan.name}</Link>}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
