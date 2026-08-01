"use client";

import AuthStatusButton from "@/components/AuthStatusButton";
import BusinessPlans from "@/components/BusinessPlans";
import HomeLogoLink from "@/components/HomeLogoLink";
import SiteMenu from "@/components/SiteMenu";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";

export default function PackagesPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  return (
    <main className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4efe3] text-black"}>
      <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
        <div className="grid h-20 grid-cols-[92px_1fr_52px] items-center px-4">
          <div className="flex items-center gap-2"><SiteMenu darkMode={darkMode} /><AuthStatusButton darkMode={darkMode} /></div>
          <HomeLogoLink theme={darkMode ? "dark" : "light"} />
          <LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="ml-auto" />
        </div>
      </header>
      <BusinessPlans darkMode={darkMode} />
      <section className={`px-4 pb-16 md:px-6 ${darkMode ? "bg-black" : "bg-[#f4efe3]"}`}>
        <div className={`mx-auto max-w-6xl rounded-[28px] border p-6 md:p-8 ${darkMode ? "border-white/10 bg-[#0d0d0d]" : "border-black/10 bg-white"}`}>
          <h2 className="text-3xl font-black tracking-[-0.04em]">Logistics job posts remain free.</h2>
          <p className={`mt-3 max-w-3xl text-sm leading-7 ${darkMode ? "text-white/55" : "text-black/55"}`}>Opportunity posters can publish logistics work at no cost. An optional R14 boost places one job on the homepage for seven days and does not create a subscription.</p>
        </div>
      </section>
    </main>
  );
}
