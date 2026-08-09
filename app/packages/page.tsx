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
    <main className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4efe3] text-black"}>
      <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}><div className="grid h-20 grid-cols-[92px_1fr_52px] items-center px-4"><div className="flex items-center gap-2"><SiteMenu darkMode={darkMode} /><AuthStatusButton darkMode={darkMode} /></div><HomeLogoLink theme={darkMode ? "dark" : "light"} /><LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="ml-auto" /></div></header>

      <section className="mx-auto max-w-6xl px-5 pb-6 pt-10 md:px-6 md:pt-14">
        <h1 className="max-w-4xl text-5xl font-black tracking-[-.06em] md:text-7xl">Packages that fit the way you work.</h1>
        <p className={`mt-4 max-w-2xl text-base font-semibold leading-7 ${darkMode ? "text-white/55" : "text-black/55"}`}>Job posting stays free. Use the Plan Guide first, then choose vehicle advertising, Pro tools or dealership access only if you need them.</p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-5 md:px-6"><PackageGuide darkMode={darkMode} /></section>
      <BusinessPlans darkMode={darkMode} enableRequests />
    </main>
  );
}
