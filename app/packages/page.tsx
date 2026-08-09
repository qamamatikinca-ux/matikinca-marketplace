"use client";

import AuthStatusButton from "@/components/AuthStatusButton";
import BusinessPlans from "@/components/BusinessPlans";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import PackageGuide from "@/components/PackageGuide";
import VehicleListingAccess from "@/components/VehicleListingAccess";
import SiteMenu from "@/components/SiteMenu";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function PackagesPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  return (
    <main className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4efe3] text-black"}>
      <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}><div className="grid h-20 grid-cols-[92px_1fr_52px] items-center px-4"><div className="flex items-center gap-2"><SiteMenu darkMode={darkMode} /><AuthStatusButton darkMode={darkMode} /></div><HomeLogoLink theme={darkMode ? "dark" : "light"} /><LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="ml-auto" /></div></header>
      <section className="mx-auto max-w-6xl px-5 pb-7 pt-10 md:px-6 md:pt-14"><h1 className="max-w-4xl text-5xl font-black tracking-[-.06em] md:text-7xl">Choose the access that earns its place.</h1><p className={`mt-4 max-w-2xl text-base font-semibold leading-7 ${darkMode ? "text-white/55" : "text-black/55"}`}>Job posting stays free. Add vehicle advertising, analytics or a full dealership presence only when it supports the way you work.</p><div className="mt-6 flex flex-wrap gap-3"><a href="#plan-guide" className="rounded-xl bg-[#f6b800] px-5 py-3 text-sm font-black text-black">Find my package</a><a href="#plans" className={`rounded-xl border px-5 py-3 text-sm font-black ${darkMode ? "border-white/15" : "border-black/10"}`}>Compare all packages</a></div></section>
      <section className="mx-auto max-w-6xl px-4 pb-8 md:px-6"><PackageGuide darkMode={darkMode} /></section>
      <div id="plans"><BusinessPlans darkMode={darkMode} /></div>
      <VehicleListingAccess darkMode={darkMode} onGranted={() => undefined} />
      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-6"><div className={`rounded-[26px] border p-6 ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}><h2 className="text-2xl font-black">Job posting stays free.</h2><p className={`mt-2 max-w-3xl text-sm font-semibold leading-6 ${darkMode ? "text-white/55" : "text-black/55"}`}>Posting logistics work does not require a subscription. Optional promotion is separate from vehicle-listing packages, so users only pay for the commercial tools they actually use.</p></div></section>
    </main>
  );
}
