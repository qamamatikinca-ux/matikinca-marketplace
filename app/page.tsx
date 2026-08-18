"use client";

import Link from "next/link";
import { lazy, Suspense, useEffect, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import LoadLinkBoundary from "@/components/platform/LoadLinkBoundary";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

const RecentActivityPanel = lazy(() => import("@/components/RecentActivityPanel"));
const MarketplaceDiscovery = lazy(() => import("@/components/MarketplaceDiscovery"));
const LogisticsNews = lazy(() => import("@/components/LogisticsNews"));

type PortalCard = {
  title: string;
  detail: string;
  href: string;
  images: string[];
};

const portalCards: PortalCard[] = [
  {
    title: "Jobs",
    detail: "Find transport and logistics work for trucks and mobile units.",
    href: "/jobs?portal=job",
    images: ["/images/jobs-1.jpg", "/images/jobs-2.jpg", "/images/jobs-3.jpg"],
  },
  {
    title: "Contracts",
    detail: "Browse longer-term logistics opportunities and recurring work.",
    href: "/contracts",
    images: ["/images/contracts-1.jpg", "/images/contracts-2.jpg", "/images/contracts-3.jpg"],
  },
  {
    title: "Vehicles & units",
    detail: "Browse commercial vehicles and mobile units or list your own.",
    href: "/list-your-vehicle#vehicle-marketplace",
    images: ["/images/truck-1.jpg", "/images/truck-2.jpg", "/images/truck-3.jpg"],
  },
  {
    title: "Drivers",
    detail: "Find approved driver profiles by experience, licence and location.",
    href: "/drivers",
    images: ["/images/driver-profile-hero.jpg"],
  },
];

const IMAGE_ROTATION_INTERVAL = 5 * 60 * 1000;

export default function Home() {
  return (
    <LoadLinkBoundary name="homepage" fallback={<HomeFallback />}>
      <HomeExperience />
    </LoadLinkBoundary>
  );
}

function HomeExperience() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setActiveImageIndex((value) => (value + 1) % 3), IMAGE_ROTATION_INTERVAL);
    return () => window.clearInterval(timer);
  }, []);

  const page = darkMode ? "bg-black text-white" : "bg-[#f4f0e7] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/55" : "text-black/55";

  return (
    <main className={`min-h-screen transition-colors duration-300 ${page}`}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className={`border-b ${darkMode ? "border-white/10" : "border-black/10"}`}>
        <LoadLinkBoundary name="marketplace search">
          <Suspense fallback={null}><MarketplaceDiscovery darkMode={darkMode} /></Suspense>
        </LoadLinkBoundary>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-7 sm:px-6 sm:py-9">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className={`text-[10px] font-black uppercase tracking-[.16em] ${muted}`}>LoadLink marketplace</p>
            <h1 className="mt-2 max-w-3xl text-[34px] font-black leading-[.98] tracking-[-.055em] sm:text-[48px]">Find the right logistics opportunity faster.</h1>
          </div>
          <Link href="/jobs" className="hidden min-h-11 items-center rounded-full border border-current/15 px-5 text-[11px] font-black sm:flex">Browse marketplace</Link>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {portalCards.map((card) => {
            const image = card.images[activeImageIndex % card.images.length];
            return (
              <Link key={card.title} href={card.href} className="group relative min-h-[285px] overflow-hidden rounded-[28px] bg-black sm:min-h-[330px]">
                <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15" />
                <div className="relative flex min-h-[285px] flex-col justify-end p-5 text-white sm:min-h-[330px] sm:p-7">
                  <h2 className="text-[30px] font-black tracking-[-.05em] sm:text-[38px]">{card.title}</h2>
                  <p className="mt-2 max-w-md text-[12px] font-semibold leading-5 text-white/72 sm:text-sm">{card.detail}</p>
                  <span className="mt-5 inline-flex w-fit min-h-10 items-center rounded-full bg-[#f6b800] px-4 text-[10px] font-black uppercase tracking-[.08em] text-black">Open</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 pb-7 sm:px-6 sm:pb-10">
        <div className={`grid overflow-hidden rounded-[24px] border sm:grid-cols-4 ${surface}`}>
          <TrustItem title="Identity checks" detail="Account and marketplace verification where required." />
          <TrustItem title="Reviewed listings" detail="Listings can be moderated before public marketplace visibility." />
          <TrustItem title="LoadLink messages" detail="Keep enquiries and logistics tools attached to the opportunity." />
          <TrustItem title="Report concerns" detail="Suspicious marketplace activity can be escalated to LoadLink." last />
        </div>
      </section>

      <LoadLinkBoundary name="recent activity">
        <Suspense fallback={null}><RecentActivityPanel darkMode={darkMode} /></Suspense>
      </LoadLinkBoundary>

      <section className="mx-auto max-w-[1200px] px-5 py-14 text-center sm:py-20">
        <p className={`text-[10px] font-black uppercase tracking-[.16em] ${muted}`}>Built for South African logistics</p>
        <h2 className="mx-auto mt-3 max-w-4xl text-[34px] font-black leading-[1.02] tracking-[-.055em] sm:text-[52px]">Jobs, contracts, commercial vehicles, drivers and business communication in one marketplace.</h2>
        <p className={`mx-auto mt-5 max-w-3xl text-sm font-semibold leading-7 sm:text-base ${muted}`}>LoadLink is designed to reduce the time between finding an opportunity and starting a real business conversation.</p>
      </section>

      <LoadLinkBoundary name="logistics news">
        <Suspense fallback={null}><LogisticsNews darkMode={darkMode} /></Suspense>
      </LoadLinkBoundary>

      <footer className={`border-t px-5 py-10 ${darkMode ? "border-white/10 bg-[#070707]" : "border-black/10 bg-white"}`}>
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.25fr_1fr_1fr_1fr]">
            <div>
              <img src={darkMode ? "/images/loadlink-logo-dark.png" : "/images/loadlink-logo-light.png"} alt="LoadLink" className="h-auto w-[180px] object-contain" />
              <p className={`mt-4 max-w-sm text-[11px] font-semibold leading-5 ${muted}`}>A South African logistics marketplace connecting work, equipment, professional drivers and direct business communication.</p>
              <Link href="/safety" className="mt-4 inline-flex min-h-10 items-center rounded-full border border-current/15 px-4 text-[10px] font-black">Safety Centre</Link>
            </div>
            <FooterGroup title="Marketplace" links={[["Jobs", "/jobs"], ["Contracts", "/contracts"], ["Vehicles & units", "/list-your-vehicle"], ["Drivers", "/drivers"]]} muted={muted} />
            <FooterGroup title="Support" links={[["Help centre", "/help"], ["Contact LoadLink", "/contact"], ["Messages", "/messages"], ["Packages", "/packages"]]} muted={muted} />
            <FooterGroup title="Legal & safety" links={[["Terms of Use", "/terms"], ["Privacy Policy", "/privacy"], ["Cookie Policy", "/cookies"], ["Marketplace Rules", "/marketplace-rules"], ["Safety Centre", "/safety"]]} muted={muted} />
          </div>
          <div className={`mt-9 flex flex-col gap-2 border-t pt-5 text-[10px] font-semibold sm:flex-row sm:items-center sm:justify-between ${darkMode ? "border-white/10 text-white/35" : "border-black/10 text-black/40"}`}>
            <span>© 2026 LoadLink</span>
            <span>South African logistics marketplace</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function TrustItem({ title, detail, last = false }: { title: string; detail: string; last?: boolean }) {
  return (
    <div className={`p-4 sm:p-5 ${last ? "" : "border-b border-current/10 sm:border-b-0 sm:border-r"}`}>
      <div className="text-[11px] font-black">{title}</div>
      <p className="mt-1.5 text-[9px] font-semibold leading-4 opacity-48">{detail}</p>
    </div>
  );
}

function FooterGroup({ title, links, muted }: { title: string; links: Array<[string, string]>; muted: string }) {
  return (
    <div>
      <h3 className="text-[11px] font-black uppercase tracking-[.12em]">{title}</h3>
      <div className={`mt-4 grid gap-3 text-[11px] font-semibold ${muted}`}>
        {links.map(([label, href]) => <Link key={href} href={href} className="hover:opacity-100">{label}</Link>)}
      </div>
    </div>
  );
}

function HomeFallback() {
  const links = [["Find jobs", "/jobs"], ["Find contracts", "/contracts"], ["Vehicles & units", "/list-your-vehicle"], ["Drivers", "/drivers"], ["Help centre", "/help"]] as const;
  return (
    <main className="min-h-screen bg-[#f4f0e7] px-5 py-10 text-black">
      <div className="mx-auto max-w-4xl">
        <header className="border-b border-black/10 pb-6 text-center">
          <img src="/images/loadlink-logo-light.png" alt="LoadLink" className="mx-auto h-14 w-auto object-contain" />
          <h1 className="mt-6 text-4xl font-black">LoadLink marketplace</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-black/60">The full marketplace experience could not initialise on this browser. Core LoadLink areas remain available below.</p>
        </header>
        <section className="mt-8 grid gap-3 sm:grid-cols-2">
          {links.map(([label, href]) => <Link key={href} href={href} className="flex min-h-20 items-center justify-between rounded-[20px] border border-black/10 bg-white px-5 py-4 text-lg font-black">{label}<span aria-hidden="true">→</span></Link>)}
        </section>
      </div>
    </main>
  );
}
