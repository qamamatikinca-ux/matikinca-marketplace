"use client";

import LoadLinkImage from "@/components/LoadLinkImage";

import LoadLinkIcon from "@/components/LoadLinkIcon";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import LoadLinkSiteFooter20260822 from "@/components/LoadLinkSiteFooter20260822";
import LoadLinkHomepagePortalGrid20260822 from "@/components/LoadLinkHomepagePortalGrid20260822";
import MarketplaceDiscovery from "@/components/MarketplaceDiscovery";
import GoogleOneTap from "@/components/GoogleOneTap";
import Link from "next/link";
import { lazy, Suspense } from "react";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import LoadLinkBoundary from "@/components/platform/LoadLinkBoundary";

const RecentActivityPanel = lazy(() => import("@/components/RecentActivityPanel"));
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
    <main data-loadlink-homepage="true" className={`min-h-screen transition-colors duration-300 ${darkMode ? "bg-black text-white" : "bg-[#f8f8f7] text-black"}`}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <GoogleOneTap />

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

      {/* Restore the original centred homepage treatment and the early LoadLink messaging.
          No decorative gold eyebrow labels, extra slogans, or invented company claims. */}
      <section
        aria-labelledby="loadlink-our-mission"
        className={`border-t px-5 py-14 transition-colors duration-300 md:px-12 md:py-20 ${darkMode ? "border-white/10 bg-[#050505] text-white" : "border-black/10 bg-[#f8f8f7] text-black"}`}
      >
        <div className="mx-auto max-w-5xl text-center">
          <div>
            <h2 id="loadlink-our-mission" className="text-[clamp(26px,5vw,40px)] font-bold leading-tight tracking-[-.04em]">
              Our Mission
            </h2>
            <p className="mx-auto mt-5 max-w-4xl text-[clamp(22px,4.3vw,34px)] font-semibold leading-[1.24] tracking-[-.035em]">
              Building a smarter way to connect logistics opportunities.
            </p>
            <p className={`mx-auto mt-5 max-w-3xl text-sm leading-7 md:text-base ${darkMode ? "text-white/65" : "text-black/65"}`}>
              LoadLink brings verified logistics opportunities, commercial vehicles, professional drivers and direct business communication into one South African marketplace. Our goal is to make finding work, equipment and reliable industry partners faster and more transparent.
            </p>
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
    <main className="min-h-screen bg-[#f8f8f7] px-5 py-10 text-black">
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
