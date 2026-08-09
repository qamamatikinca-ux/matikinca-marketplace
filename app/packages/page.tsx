"use client";

import AuthStatusButton from "@/components/AuthStatusButton";
import BusinessPlans from "@/components/BusinessPlans";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import PackageGuide from "@/components/PackageGuide";
import SiteMenu from "@/components/SiteMenu";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function PackagesPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();

  return (
    <main data-loadlink-packages-page="v2619" className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4efe3] text-black"}>
      <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black/95" : "border-black/10 bg-white/95"}`}>
        <div className="grid h-20 grid-cols-[92px_1fr_52px] items-center px-4 backdrop-blur-md">
          <div className="flex items-center gap-2"><SiteMenu darkMode={darkMode} /><AuthStatusButton darkMode={darkMode} /></div>
          <HomeLogoLink theme={darkMode ? "dark" : "light"} />
          <LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="ml-auto" />
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-4 pt-6 md:px-6 md:pt-9">
        <PackageGuide darkMode={darkMode} />
      </section>
      <BusinessPlans darkMode={darkMode} enableRequests />
    </main>
  );
}
