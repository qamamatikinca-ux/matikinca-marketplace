"use client";

import BusinessPlans from "@/components/BusinessPlans";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import PackageGuide, { type PackageRecommendation } from "@/components/PackageGuide";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function PackagesPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();

  function focusPlan(plan: PackageRecommendation) {
    window.setTimeout(() => {
      document.getElementById(`${plan}-package`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 30);
  }

  return (
    <main data-loadlink-packages-page="compare-restored" className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4efe3] text-black"}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <section className="mx-auto w-full max-w-6xl px-3 pb-3 pt-6 sm:px-5 md:px-6 md:pt-9">
        <PackageGuide darkMode={darkMode} onComplete={focusPlan} />
      </section>
      <BusinessPlans darkMode={darkMode} enableRequests />
    </main>
  );
}
