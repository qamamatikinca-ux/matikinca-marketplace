"use client";

import { useEffect, useState } from "react";
import BusinessPlans from "@/components/BusinessPlans";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import PackageGuide from "@/components/PackageGuide";
import SiteMenu from "@/components/SiteMenu";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { getLoadLinkIntelligence, type LoadLinkIntelligenceState } from "@/lib/loadlinkIntelligence";

export default function PackagesPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [accountState, setAccountState] = useState<LoadLinkIntelligenceState | null | undefined>(undefined);

  useEffect(() => {
    void getLoadLinkIntelligence().then(setAccountState).catch(() => setAccountState(null));
  }, []);

  const entitled = new Set(["active", "trial", "trialing", "grace_period", "cancelled"]);
  const hasPaidPlan = Boolean(accountState?.authenticated && (accountState.plan === "pro" || accountState.plan === "dealer") && entitled.has(String(accountState.plan_state)));

  return (
    <main data-loadlink-packages-page="v272" className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4efe3] text-black"}>
      <header className={`sticky top-0 z-50 h-[64px] border-b ${darkMode ? "border-white/10 bg-black/95" : "border-black/10 bg-white/95"}`}>
        <div className="relative mx-auto flex h-full max-w-[1500px] items-center px-3 backdrop-blur-md sm:px-5">
          <div className="flex items-center"><SiteMenu darkMode={darkMode} /></div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><HomeLogoLink theme={darkMode ? "dark" : "light"} /></div>
          <div className="ml-auto"><LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} /></div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-4 pt-6 md:px-6 md:pt-9">
        {accountState === undefined ? (
          <div className={`h-28 animate-pulse rounded-[24px] border ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`} />
        ) : hasPaidPlan && accountState ? (
          <div className={`rounded-[24px] border p-5 sm:p-7 ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
            <div className="text-[10px] font-black uppercase tracking-[.08em] opacity-35">Current plan</div>
            <h1 className="mt-2 text-[32px] font-black tracking-[-.05em]">{accountState.plan === "dealer" ? "Dealer" : "Pro"}</h1>
            <p className={`mt-2 max-w-xl text-sm font-semibold leading-6 ${darkMode ? "text-white/55" : "text-black/55"}`}>{accountState.plan === "dealer" ? "Your dealership plan is already active. Manage the plan or compare features below — there is no need to answer dealership questions again." : "Your Pro plan is already active. Manage it, compare features or upgrade below."}</p>
          </div>
        ) : (
          <PackageGuide darkMode={darkMode} />
        )}
      </section>
      <BusinessPlans darkMode={darkMode} enableRequests />
    </main>
  );
}
