"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";

const plans = [
  {
    name: "Manual listing",
    price: "R15 per vehicle per day",
    description: "For private sellers and businesses listing occasionally.",
    benefits: ["One vehicle listing per payment", "Up to 5 photos", "50 messages per day", "Standard search visibility", "Edit and renew the listing"],
    limits: ["No analytics", "No featured placement", "No dealership page"],
  },
  {
    name: "Pro",
    price: "R399 per month",
    description: "For owner-operators and transport businesses that list regularly.",
    benefits: ["Unlimited active vehicle listings", "Up to 15 photos per listing", "Unlimited messages", "Full listing analytics", "Featured listing credits", "Higher search visibility", "Verified Business eligibility", "Priority support"],
    limits: ["Dealer page and staff tools not included"],
  },
  {
    name: "Dealer",
    price: "R2,999 per month",
    description: "For verified commercial dealerships that need a complete sales presence.",
    benefits: ["Everything in Pro", "Public dealership mini website", "Profile picture and cover image", "Followers and dealership updates", "Inventory grid and stock statuses", "Multiple staff accounts", "Lead-management dashboard", "Bulk stock uploads", "Featured Dealer placement", "Premium support"],
    limits: ["Activation requires dealership verification"],
  },
];

export default function PackagesPage() {
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => { queueMicrotask(() => setDarkMode(localStorage.getItem("loadlink-theme") === "dark")); }, []);
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b] text-white" : "border-black/10 bg-white text-black";
  const muted = darkMode ? "text-white/55" : "text-black/55";

  return (
    <main className={`min-h-screen ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}>
      <header className={`sticky top-0 z-40 border-b px-4 py-3 backdrop-blur-xl ${darkMode ? "border-white/10 bg-black/90" : "border-black/10 bg-[#f4efe3]/90"}`}>
        <div className="mx-auto grid max-w-6xl grid-cols-[40px_1fr_40px] items-center gap-3">
          <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f6b800] text-[#b88900]" aria-label="Back">‹</Link>
          <HomeLogoLink theme={darkMode ? "dark" : "light"} />
          <AuthStatusButton darkMode={darkMode} />
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-14 pt-12">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#b88900]">LoadLink packages</p>
        <h1 className="mt-3 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl">Choose the package that fits how you sell</h1>
        <p className={`mt-5 max-w-2xl text-base font-semibold leading-7 ${muted}`}>Posting logistics jobs is free after sign-in. Vehicle listings use paid manual access, Pro or the verified Dealer bundle.</p>

        <div className="mt-9 grid gap-5 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <article key={plan.name} className={`border p-6 ${index === 2 ? "border-[#f6b800]" : surface} ${index === 2 && !darkMode ? "bg-[#fff9e7]" : ""}`}>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#b88900]">{plan.name}</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">{plan.price}</h2>
              <p className={`mt-3 min-h-14 text-sm font-semibold leading-6 ${muted}`}>{plan.description}</p>
              <div className="mt-5 border-t border-current/10 pt-4">
                {plan.benefits.map((benefit) => <p key={benefit} className="mb-3 flex gap-3 text-sm font-bold"><span className="text-[#b88900]">✓</span><span>{benefit}</span></p>)}
              </div>
              <div className="mt-4 border-t border-current/10 pt-4">
                {plan.limits.map((limit) => <p key={limit} className={`mb-2 text-xs font-semibold ${muted}`}>{limit}</p>)}
              </div>
              <Link href="/list-your-truck" className={`mt-6 flex h-12 items-center justify-center border px-4 text-xs font-black uppercase tracking-wide ${index === 2 ? "border-[#f6b800] bg-black text-[#f6b800]" : "border-[#f6b800] bg-[#f6b800] text-black"}`}>{index === 0 ? "List manually" : index === 1 ? "Upgrade to Pro" : "Apply as a dealer"}</Link>
            </article>
          ))}
        </div>

        <section className={`mt-8 border p-6 ${surface}`}>
          <h2 className="text-2xl font-black">Free job posting</h2>
          <p className={`mt-2 text-sm font-semibold leading-6 ${muted}`}>Businesses may post jobs and opportunities for truck owners and mobile-unit owners free of charge. A signed-in account is still required to post or message.</p>
          <Link href="/jobs/list" className="mt-5 inline-flex rounded-full border border-[#f6b800] bg-[#f6b800] px-5 py-3 text-xs font-black uppercase tracking-wide text-black">Post a job</Link>
        </section>
      </section>
    </main>
  );
}
