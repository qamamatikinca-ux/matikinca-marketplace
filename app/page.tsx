"use client";

import LoadLinkImage from "@/components/LoadLinkImage";

import LoadLinkIcon from "@/components/LoadLinkIcon";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import LoadLinkSiteFooter20260822 from "@/components/LoadLinkSiteFooter20260822";
import LoadLinkHomepagePortalGrid20260822 from "@/components/LoadLinkHomepagePortalGrid20260822";
import Link from "next/link";
import { lazy, Suspense } from "react";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import LoadLinkBoundary from "@/components/platform/LoadLinkBoundary";

const RecentActivityPanel = lazy(() => import("@/components/RecentActivityPanel"));
const MarketplaceDiscovery = lazy(() => import("@/components/MarketplaceDiscovery"));
const LogisticsNews = lazy(() => import("@/components/LogisticsNews"));

export default function Home() {
  return (
    <LoadLinkBoundary name="homepage" fallback={<HomeFallback />}>
      <HomeExperience />
    </LoadLinkBoundary>
  );
}

function HomeExperience() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();

  return (
    <main className={`min-h-screen transition-colors duration-300 ${darkMode ? "bg-black text-white" : "bg-[#fff6dc] text-black"}`}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <LoadLinkBoundary name="marketplace search">
        <Suspense fallback={null}>
          <MarketplaceDiscovery darkMode={darkMode} />
        </Suspense>
      </LoadLinkBoundary>

      <LoadLinkHomepagePortalGrid20260822 darkMode={darkMode} />

      <LoadLinkBoundary name="recent activity">
        <Suspense fallback={null}>
          <RecentActivityPanel darkMode={darkMode} />
        </Suspense>
      </LoadLinkBoundary>

      <section id="industry-insights" className="scroll-mt-24">
        <LoadLinkBoundary name="logistics news">
          <Suspense fallback={null}>
            <LogisticsNews darkMode={darkMode} />
          </Suspense>
        </LoadLinkBoundary>
      </section>

      <section id="our-mission" aria-labelledby="loadlink-mission-heading" className={`border-t px-5 py-14 md:px-12 md:py-20 ${darkMode ? "border-white/10 bg-[#0d0e0d] text-white" : "border-black/10 bg-[#f7f6f1] text-[#141715]"}`}>
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-12">
          <div>
            <p className={`text-[11px] font-bold uppercase tracking-[.14em] ${darkMode ? "text-[#f6b800]" : "text-[#926c00]"}`}>LoadLink</p>
            <h2 id="loadlink-mission-heading" className="mt-2 text-3xl font-bold tracking-[-.04em] md:text-4xl">Our mission</h2>
          </div>
          <div className="max-w-2xl">
            <p className="text-xl font-semibold leading-[1.55] tracking-[-.02em] md:text-2xl">Make it easier for the right people, vehicles and opportunities to find each other.</p>
            <p className={`mt-4 max-w-xl text-sm leading-7 ${darkMode ? "text-white/65" : "text-black/65"}`}>LoadLink connects South African transporters, professional drivers, dealerships and businesses in one place, with clear listings and direct communication.</p>
            <p className="mt-5 text-sm font-bold">Logistics Made Easier.</p>
          </div>
        </div>
      </section>

      <LoadLinkSiteFooter20260822 darkMode={darkMode} />
    </main>
  );
}

function HomeFallback() {
  const links = [
    ["Find jobs", "/jobs?portal=job"],
    ["View drivers", "/driver-portal"],
    ["Find contracts", "/contracts"],
    ["Browse vehicles", "/list-your-vehicle?view=marketplace#vehicle-marketplace"],
    ["Help Centre", "/help"],
  ] as const;

  return (
    <main className="min-h-screen bg-[#fff6dc] px-5 py-10 text-black">
      <div className="mx-auto max-w-4xl">
        <header className="border-b border-black/10 pb-6 text-center">
          <LoadLinkImage src="/images/loadlink-logo-light.png" alt="LoadLink" className="mx-auto h-14 w-auto object-contain" />
          <h1 className="mt-6 text-4xl font-black">LoadLink marketplace</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-black/60">LoadLink could not initialise the full homepage on this browser. The core marketplace portals remain available below.</p>
        </header>
        <section className="mt-8 grid gap-px border border-black/10 bg-black/10 sm:grid-cols-2">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="flex min-h-20 items-center justify-between bg-white px-5 py-4 text-lg font-black">
              {label}<span aria-hidden="true"><LoadLinkIcon name="chevronRight" size={18} className="inline-block shrink-0 align-middle" /></span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
