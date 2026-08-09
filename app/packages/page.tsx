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

      <section className="mx-auto max-w-6xl px-5 pb-6 pt-8 md:px-6 md:pt-12">
        <div className={`rounded-[28px] border p-6 md:p-8 ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
          <p className={`text-[10px] font-black uppercase tracking-[.18em] ${darkMode ? "text-[#f6b800]" : "text-[#8b6800]"}`}>Packages</p>
          <div className="mt-3 grid gap-5 lg:grid-cols-[1fr_.7fr] lg:items-end">
            <div><h1 className="max-w-3xl text-4xl font-black tracking-[-.055em] md:text-6xl">Choose only what helps you work.</h1><p className={`mt-3 max-w-2xl text-sm font-semibold leading-6 md:text-base ${darkMode ? "text-white/55" : "text-black/55"}`}>Job posting stays free. Use the guide for one clear recommendation, then activate a paid option only when you actually need it.</p></div>
            <div className={`grid grid-cols-3 gap-2 rounded-2xl border p-2 ${darkMode ? "border-white/10 bg-white/[.03]" : "border-black/8 bg-[#faf8f2]"}`}><div className="rounded-xl p-3"><p className="text-xs font-black">Manual</p><p className={`mt-1 text-[10px] font-semibold ${darkMode ? "text-white/45" : "text-black/45"}`}>One-off listing</p></div><div className="rounded-xl p-3"><p className="text-xs font-black">Pro</p><p className={`mt-1 text-[10px] font-semibold ${darkMode ? "text-white/45" : "text-black/45"}`}>Operator tools</p></div><div className="rounded-xl p-3"><p className="text-xs font-black">Dealer</p><p className={`mt-1 text-[10px] font-semibold ${darkMode ? "text-white/45" : "text-black/45"}`}>Showroom access</p></div></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-5 md:px-6"><PackageGuide darkMode={darkMode} /></section>
      <BusinessPlans darkMode={darkMode} enableRequests />
    </main>
  );
}
