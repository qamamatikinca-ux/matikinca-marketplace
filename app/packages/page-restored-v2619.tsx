"use client";

import BusinessPlans from "@/components/BusinessPlans";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import PackageGuide from "@/components/PackageGuide";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function PackagesPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();

  return (
    <main data-loadlink-packages-page="restored-v2619" className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4efe3] text-black"}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <section className="mx-auto max-w-6xl px-4 pb-4 pt-6 md:px-6 md:pt-9">
        <PackageGuide darkMode={darkMode} />
      </section>
      <BusinessPlans darkMode={darkMode} enableRequests />
    </main>
  );
}
