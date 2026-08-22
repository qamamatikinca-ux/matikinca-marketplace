"use client";

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

      <section className={`px-5 py-14 transition-colors duration-300 md:px-12 md:py-16 ${darkMode ? "bg-[#050505] text-white" : "bg-[#fff6dc] text-black"}`}>
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-4xl font-black leading-tight tracking-[-.045em] md:text-6xl">Building a smarter way to connect logistics opportunities.</h2>
          <p className={`mx-auto mt-6 max-w-3xl text-base font-semibold leading-8 md:text-lg ${darkMode ? "text-white/60" : "text-black/60"}`}>
            LoadLink brings verified logistics opportunities, commercial vehicles, professional drivers and direct business communication into one South African marketplace. Find the right work, equipment and industry partners without unnecessary friction.
          </p>
        </div>
      </section>

      <section id="industry-insights" className="scroll-mt-24">
        <LoadLinkBoundary name="logistics news">
          <Suspense fallback={null}>
            <LogisticsNews darkMode={darkMode} />
          </Suspense>
        </LoadLinkBoundary>
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
          <img src="/images/loadlink-logo-light.png" alt="LoadLink" className="mx-auto h-14 w-auto object-contain" />
          <h1 className="mt-6 text-4xl font-black">LoadLink marketplace</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-black/60">LoadLink could not initialise the full homepage on this browser. The core marketplace portals remain available below.</p>
        </header>
        <section className="mt-8 grid gap-px border border-black/10 bg-black/10 sm:grid-cols-2">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="flex min-h-20 items-center justify-between bg-white px-5 py-4 text-lg font-black">
              {label}<span aria-hidden="true">→</span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
