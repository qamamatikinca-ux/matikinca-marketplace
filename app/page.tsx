"use client";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import Link from "next/link";
import { lazy, Suspense, useEffect, useState } from "react";
import RequireAuthLink from "@/components/RequireAuthLink";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import LoadLinkBoundary from "@/components/platform/LoadLinkBoundary";

const RecentActivityPanel = lazy(() => import("@/components/RecentActivityPanel"));
const MarketplaceDiscovery = lazy(() => import("@/components/MarketplaceDiscovery"));
const LogisticsNews = lazy(() => import("@/components/LogisticsNews"));

type PortalImage = { src: string; position: string };
type PortalCard = { title: string; buttonText: string; images: PortalImage[]; href: string };

const IMAGE_ROTATION_INTERVAL = 5 * 60 * 1000;

const portalCards: PortalCard[] = [
  {
    title: "Find Jobs",
    buttonText: "Find available jobs",
    images: [
      { src: "/images/jobs-1.jpg", position: "center center" },
      { src: "/images/jobs-2.jpg", position: "center center" },
      { src: "/images/jobs-3.jpg", position: "center center" },
    ],
    href: "/jobs",
  },
  {
    title: "Find Contracts",
    buttonText: "Find available contracts",
    images: [
      { src: "/images/contracts-1.jpg", position: "center center" },
      { src: "/images/contracts-2.jpg", position: "center center" },
      { src: "/images/contracts-3.jpg", position: "center center" },
    ],
    href: "/contracts",
  },
  {
    title: "Driver Profile",
    buttonText: "View drivers or create your profile",
    images: [{ src: "/images/driver-profile-hero.jpg", position: "center center" }],
    href: "/driver-portal",
  },
  {
    title: "List Your Vehicle",
    buttonText: "List your vehicle",
    images: [
      { src: "/images/truck-1.jpg", position: "center center" },
      { src: "/images/truck-2.jpg", position: "center center" },
      { src: "/images/truck-3.jpg", position: "center center" },
    ],
    href: "/list-your-vehicle",
  },
];

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
    const rotationTimer = window.setInterval(() => {
      setActiveImageIndex((currentIndex) => (currentIndex + 1) % 3);
    }, IMAGE_ROTATION_INTERVAL);
    return () => window.clearInterval(rotationTimer);
  }, []);

  function getActiveImage(card: PortalCard) {
    return card.images[activeImageIndex % card.images.length];
  }

  return (
    <main className={`min-h-screen transition-colors duration-300 ${darkMode ? "bg-black text-white" : "bg-[#fff6dc] text-black"}`}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <LoadLinkBoundary name="marketplace search">
        <Suspense fallback={null}><MarketplaceDiscovery darkMode={darkMode} /></Suspense>
      </LoadLinkBoundary>

      <section className="relative z-0 w-full" aria-label="LoadLink portals">
        <div className="flex w-full flex-col gap-0">
          {portalCards.map((card) => {
            const activeImage = getActiveImage(card);
            return (
              <Link key={card.title} href={card.href} aria-label={card.buttonText} className="group relative block h-[52vh] min-h-[380px] w-full overflow-hidden md:h-[65vh]">
                <img
                  src={activeImage.src}
                  alt=""
                  aria-hidden="true"
                  style={{ objectPosition: activeImage.position }}
                  className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-black/45" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/35 to-black/75" />
                <div
                  data-loadlink-portal-glow
                  className="pointer-events-none absolute inset-x-[3%] -bottom-12 h-56 transform-gpu"
                  style={{
                    background: darkMode
                      ? "radial-gradient(ellipse at 50% 72%, rgba(246,184,0,.21) 0%, rgba(92,67,0,.18) 40%, rgba(0,0,0,0) 76%)"
                      : "radial-gradient(ellipse at 50% 72%, rgba(246,184,0,.26) 0%, rgba(246,184,0,.16) 40%, rgba(246,184,0,0) 76%)",
                    filter: "blur(34px)",
                    transform: "translate3d(0,0,0)",
                    willChange: "transform, opacity",
                  }}
                />
                <div className="relative z-10 flex h-full w-full items-center justify-center px-5 text-center">
                  <div
                    className={`flex min-h-[82px] w-[min(82vw,560px)] items-center justify-center rounded-full border px-8 py-[18px] text-[18px] font-black uppercase leading-[1.15] tracking-[.045em] transition active:scale-[.99] md:min-h-[94px] md:w-[min(58vw,590px)] md:px-10 md:py-[22px] md:text-[20px] ${
                      darkMode ? "border-[#5c4300] bg-black/76 text-[#f6b800]" : "border-[#f6b800] bg-black/76 text-[#f6b800]"
                    }`}
                  >
                    {card.buttonText}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <LoadLinkBoundary name="recent activity"><Suspense fallback={null}><RecentActivityPanel darkMode={darkMode} /></Suspense></LoadLinkBoundary>

      <section className={`px-5 py-16 transition-colors duration-300 md:px-12 ${darkMode ? "bg-[#050505] text-white" : "bg-[#fff6dc] text-black"}`}>
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-4xl font-black leading-tight md:text-6xl">Building a smarter way to connect logistics opportunities.</h2>
          <p className={`mx-auto mt-6 max-w-3xl text-base font-semibold leading-8 md:text-lg ${darkMode ? "text-white/60" : "text-black/60"}`}>
            LoadLink brings verified logistics opportunities, commercial vehicles, professional drivers and direct business communication into one South African marketplace. Our goal is to make finding work, equipment and reliable industry partners faster and more transparent.
          </p>
        </div>
      </section>

      <LoadLinkBoundary name="logistics news"><Suspense fallback={null}><LogisticsNews darkMode={darkMode} /></Suspense></LoadLinkBoundary>

      <footer className={`px-5 py-16 transition-colors duration-300 md:px-12 ${darkMode ? "bg-black text-white" : "bg-white text-black"}`}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex justify-center">
            <Link href="/" aria-label="LoadLink home" className="block max-w-full outline-none">
              <img src={darkMode ? "/images/loadlink-logo-dark.png" : "/images/loadlink-logo-light.png"} alt="LoadLink" className="h-auto w-[min(78vw,430px)] object-contain" />
            </Link>
          </div>

          <div className={`divide-y border-y ${darkMode ? "divide-white/10 border-white/10" : "divide-black/10 border-black/10"}`}>
            <details open className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between text-2xl font-black">Company<span className="text-[#b98400] group-open:rotate-180">v</span></summary>
              <div className={`mt-6 grid gap-6 text-xl ${darkMode ? "text-white/70" : "text-black/75"}`}>
                <Link href="#">About LoadLink</Link><Link href="#">Contact us</Link><Link href="#">Work with LoadLink</Link><Link href="#">Feedback</Link><Link href="/help">Help & FAQ</Link><Link href="#">Industry insights</Link>
              </div>
            </details>
            <details className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between text-2xl font-black">Logistics<span className="text-[#b98400] group-open:rotate-180">v</span></summary>
              <div className={`mt-6 grid gap-6 text-xl ${darkMode ? "text-white/70" : "text-black/75"}`}>
                <Link href="/jobs">Find jobs</Link><Link href="/contracts">Find contracts</Link><RequireAuthLink href="/list-your-vehicle">List your vehicle</RequireAuthLink><Link href="#">Truck hire</Link><Link href="#">Available loads</Link>
              </div>
            </details>
            <details className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between text-2xl font-black">Services<span className="text-[#b98400] group-open:rotate-180">v</span></summary>
              <div className={`mt-6 grid gap-6 text-xl ${darkMode ? "text-white/70" : "text-black/75"}`}>
                <Link href="/packages">Packages</Link><Link href="#">Sponsored listings</Link><Link href="#">Business support</Link><Link href="#">Ratings & reviews</Link>
              </div>
            </details>
            <details className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between text-2xl font-black">Customers<span className="text-[#b98400] group-open:rotate-180">v</span></summary>
              <div className={`mt-6 grid gap-6 text-xl ${darkMode ? "text-white/70" : "text-black/75"}`}>
                <Link href="#">Safety & security</Link><Link href="#">Terms & conditions</Link><Link href="/help">Privacy and safety help</Link><Link href="#">Cookie policy</Link><Link href="/help">Help centre</Link>
              </div>
            </details>
          </div>

          <div className="mt-12">
            <h3 className="text-2xl font-black">Download the app</h3>
            <div className="mt-5 flex flex-nowrap items-center gap-3 overflow-x-auto pb-1">
              <Link href="#" aria-label="Download on the App Store"><img src="/images/app-store-badge.png" alt="Download on the App Store" className="h-10 w-auto object-contain" /></Link>
              <Link href="#" aria-label="Get it on Google Play"><img src="/images/google-play-badge.png" alt="Get it on Google Play" className="h-10 w-auto object-contain" /></Link>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-7">
            <Link href="#" className="flex h-11 w-11 items-center justify-center bg-[#f6b800] text-lg font-black text-black">f</Link>
            <Link href="#" className="flex h-11 w-11 items-center justify-center text-3xl font-black">X</Link>
            <Link href="#" className="flex h-11 w-11 items-center justify-center bg-red-600 text-sm font-black text-white">YT</Link>
            <Link href="#" className="flex h-11 w-11 items-center justify-center bg-[#f6b800] text-sm font-black text-black">IG</Link>
            <Link href="#" className="flex h-11 w-11 items-center justify-center bg-black text-sm font-black text-white">TT</Link>
            <Link href="#" className="flex h-11 w-11 items-center justify-center rounded bg-blue-700 text-sm font-black text-white">in</Link>
          </div>
          <p className={`mt-12 text-base font-semibold ${darkMode ? "text-white/45" : "text-black/50"}`}>© Copyright 2026 LoadLink</p>
        </div>
      </footer>
    </main>
  );
}

function HomeFallback() {
  const links = [["Find jobs", "/jobs"], ["Find contracts", "/contracts"], ["Driver profile", "/driver-profile"], ["Driver profiles", "/drivers"], ["Profile settings", "/account/settings"]] as const;
  return (
    <main className="min-h-screen bg-[#fff6dc] px-5 py-10 text-black">
      <div className="mx-auto max-w-4xl">
        <header className="border-b border-black/10 pb-6 text-center">
          <img src="/images/loadlink-logo-light.png" alt="LoadLink" className="mx-auto h-14 w-auto object-contain" />
          <h1 className="mt-6 text-4xl font-black">LoadLink marketplace</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-black/60">The main experience could not initialise on this browser, but every core LoadLink portal remains available below.</p>
        </header>
        <section className="mt-8 grid gap-3 sm:grid-cols-2">{links.map(([label, href]) => <Link key={href} href={href} className="flex min-h-20 items-center justify-between border border-black/10 bg-white px-5 py-4 text-lg font-black">{label}<span aria-hidden="true">→</span></Link>)}</section>
      </div>
    </main>
  );
}
