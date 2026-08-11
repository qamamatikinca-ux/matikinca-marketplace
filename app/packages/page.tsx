"use client";

import { useEffect, useState } from "react";
import BusinessPlans, { type LoadLinkPackageId } from "@/components/BusinessPlans";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import PackageGuide, { type PackageRecommendation } from "@/components/PackageGuide";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { getLoadLinkIntelligence, type LoadLinkIntelligenceState } from "@/lib/loadlinkIntelligence";

const entitled = new Set(["active", "trial", "trialing", "grace_period", "cancelled"]);

export default function PackagesPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [accountState, setAccountState] = useState<LoadLinkIntelligenceState | null | undefined>(undefined);
  const [recommendation, setRecommendation] = useState<PackageRecommendation | null>(null);
  const [showEveryOption, setShowEveryOption] = useState(false);

  useEffect(() => {
    void getLoadLinkIntelligence().then(setAccountState).catch(() => setAccountState(null));
  }, []);

  const dealerPlan = Boolean(accountState?.authenticated && accountState.plan === "dealer" && (entitled.has(String(accountState.plan_state)) || accountState.capabilities?.dealer_tools || accountState.dealer_profile_id));
  const proPlan = Boolean(accountState?.authenticated && accountState.plan === "pro" && (entitled.has(String(accountState.plan_state)) || accountState.capabilities?.analytics));
  const hasPaidPlan = dealerPlan || proPlan;

  function completeQuestions(plan: PackageRecommendation) {
    setRecommendation(plan);
    setShowEveryOption(false);
    window.setTimeout(() => document.getElementById("package-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 20);
  }

  function restartQuestions() {
    setRecommendation(null);
    setShowEveryOption(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main data-loadlink-packages-page="v275" className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4efe3] text-black"}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      {accountState === undefined ? (
        <section className="mx-auto max-w-5xl px-4 py-8 md:px-6"><div className={`h-32 animate-pulse rounded-[24px] border ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`} /></section>
      ) : hasPaidPlan ? (
        <BusinessPlans darkMode={darkMode} enableRequests />
      ) : !recommendation ? (
        <section className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10">
          <PackageGuide darkMode={darkMode} onComplete={completeQuestions} />
        </section>
      ) : (
        <section id="package-result" className="pb-10">
          <div className="mx-auto max-w-5xl px-4 pt-8 md:px-6 md:pt-10">
            {!showEveryOption ? (
              <div className={`rounded-[26px] border p-5 sm:p-7 ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
                <p className={`text-[10px] font-black uppercase tracking-[.12em] ${darkMode ? "text-white/45" : "text-black/45"}`}>Recommended for you</p>
                <h1 className="mt-2 text-[34px] font-black tracking-[-.055em]">{recommendation === "manual" ? "Manual" : recommendation === "dealer" ? "Dealer" : "Pro"}</h1>
                <p className={`mt-2 max-w-xl text-sm font-semibold leading-6 ${darkMode ? "text-white/55" : "text-black/55"}`}>{recommendation === "manual" ? "A simple pay-for-the-days-you-need option for occasional vehicle advertising." : recommendation === "pro" ? "Best when you advertise vehicles regularly and want stronger listing tools without a dealership workspace." : "Best when you need a public showroom, dealership workflow, staff access, leads and sales tools."}</p>
              </div>
            ) : (
              <div className="mb-2">
                <h1 className="text-[34px] font-black tracking-[-.055em]">All LoadLink options</h1>
                <p className={`mt-2 max-w-xl text-sm font-semibold leading-6 ${darkMode ? "text-white/55" : "text-black/55"}`}>Compare Manual, Pro and Dealer only because you chose to see the other options.</p>
              </div>
            )}
          </div>

          <BusinessPlans
            darkMode={darkMode}
            enableRequests
            visiblePlans={showEveryOption ? (["manual", "pro", "dealer"] as LoadLinkPackageId[]) : ([recommendation] as LoadLinkPackageId[])}
            showHeading={false}
          />

          <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 md:flex-row md:px-6">
            {!showEveryOption ? <button type="button" onClick={() => setShowEveryOption(true)} className="h-12 rounded-xl bg-black px-5 text-sm font-black text-white dark:bg-white dark:text-black">Compare every LoadLink option</button> : null}
            <button type="button" onClick={restartQuestions} className={`h-12 rounded-xl border px-5 text-sm font-black ${darkMode ? "border-white/15" : "border-black/12"}`}>Answer the questions again</button>
          </div>
        </section>
      )}
    </main>
  );
}
