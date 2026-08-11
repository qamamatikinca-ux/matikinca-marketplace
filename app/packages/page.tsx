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
    <main data-loadlink-packages-page="v272" className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4efe3] text-black"}>
      <header className={`sticky top-0 z-50 h-[64px] border-b ${darkMode ? "border-white/10 bg-black/95" : "border-black/10 bg-white/95"}`}>
        <div className="relative mx-auto flex h-full max-w-[1500px] items-center px-3 backdrop-blur-md sm:px-5">
          <div className="flex items-center gap-1.5"><SiteMenu darkMode={darkMode} /><AuthStatusButton darkMode={darkMode} /></div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><HomeLogoLink theme={darkMode ? "dark" : "light"} /></div>
          <div className="ml-auto"><LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} /></div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-4 pt-6 md:px-6 md:pt-9">
        <PackageGuide darkMode={darkMode} />
      </section>
      <BusinessPlans darkMode={darkMode} enableRequests />
    </main>
  );
}
