"use client";

import Link from "next/link";

type Plan = {
  id: "manual" | "pro" | "dealer";
  name: string;
  price: string;
  billing: string;
  description: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
};

const plans: Plan[] = [
  {
    id: "manual",
    name: "Manual listing",
    price: "R15",
    billing: "per vehicle, per day",
    description: "A simple pay-as-you-go option for private sellers and occasional listings.",
    features: ["One vehicle listing", "Up to 5 vehicle photos", "50 chat messages per day", "Standard search placement"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "Monthly",
    billing: "subscription",
    description: "For active operators who need stronger visibility and listing performance data.",
    features: ["More active listings", "Up to 15 photos per vehicle", "Listing analytics", "Higher search visibility", "Priority support"],
    highlight: true,
    badge: "Best for operators",
  },
  {
    id: "dealer",
    name: "Dealer",
    price: "R2 999",
    billing: "per month",
    description: "A complete branded dealership showroom with inventory and lead-management tools.",
    features: ["Daily listing fees included", "Public dealership profile", "Inventory showroom", "Followers and updates", "Lead and staff management", "Dealer analytics"],
    badge: "Full dealership",
  },
];

export default function BusinessPlans({ darkMode = false, compact = false }: { darkMode?: boolean; compact?: boolean }) {
  return (
    <section className={compact ? "" : `px-4 py-10 md:px-6 ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}>
      <div className="mx-auto max-w-6xl">
        {!compact ? (
          <div className="mb-7 max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#b88900]">LoadLink packages</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] md:text-6xl">Choose the level that matches how you sell.</h2>
            <p className={`mt-4 max-w-2xl text-sm leading-7 md:text-base ${darkMode ? "text-white/60" : "text-black/60"}`}>Job posting remains free. Vehicle sellers choose Manual, Pro or Dealer depending on how many vehicles they need to market.</p>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`relative overflow-hidden rounded-[28px] border p-5 md:p-6 ${
                plan.highlight
                  ? "border-[#f6b800] bg-black text-white shadow-[0_20px_60px_rgba(184,137,0,.18)]"
                  : darkMode
                    ? "border-white/10 bg-[#0d0d0d] text-white"
                    : "border-black/10 bg-white text-black"
              }`}
            >
              {plan.badge ? <span className={`inline-flex rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${plan.highlight ? "bg-[#f6b800] text-black" : "bg-[#f6b800]/15 text-[#9a7100]"}`}>{plan.badge}</span> : null}
              <h3 className="mt-4 text-2xl font-black tracking-[-0.035em]">{plan.name}</h3>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-4xl font-black tracking-[-0.05em]">{plan.price}</span>
                <span className={`pb-1 text-xs font-bold ${plan.highlight ? "text-white/50" : darkMode ? "text-white/45" : "text-black/45"}`}>{plan.billing}</span>
              </div>
              <p className={`mt-4 min-h-16 text-sm leading-6 ${plan.highlight ? "text-white/65" : darkMode ? "text-white/55" : "text-black/55"}`}>{plan.description}</p>
              <div className={`my-5 h-px ${plan.highlight ? "bg-white/10" : darkMode ? "bg-white/10" : "bg-black/10"}`} />
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm font-semibold leading-5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f6b800] text-[11px] font-black text-black">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href={plan.id === "dealer" ? "/dealership/truckstore-centurion-demo" : "/list-your-truck"} className={`mt-6 flex h-12 items-center justify-center rounded-xl text-xs font-black uppercase tracking-[0.13em] ${plan.highlight ? "bg-[#f6b800] text-black" : "border border-[#f6b800] text-[#a87900]"}`}>
                {plan.id === "dealer" ? "View dealer example" : "Choose this option"}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
