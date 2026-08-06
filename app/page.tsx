"use client";

import HomeLogoLink from "@/components/HomeLogoLink";

import Link from "next/link";
import { lazy, Suspense, useEffect, useState } from "react";
import RequireAuthLink from "@/components/RequireAuthLink";

import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import LoadLinkBoundary from "@/components/platform/LoadLinkBoundary";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";

const RecentActivityPanel = lazy(() => import("@/components/RecentActivityPanel"));
const MarketplaceDiscovery = lazy(() => import("@/components/MarketplaceDiscovery"));
const LogisticsNews = lazy(() => import("@/components/LogisticsNews"));
const AuthStatusButton = lazy(() => import("@/components/AuthStatusButton"));
const SiteMenu = lazy(() => import("@/components/SiteMenu"));
type PortalImage = {
  src: string;
  position: string;
};

type PortalCard = {
  title: string;
  buttonText: string;
  images: PortalImage[];
  href: string;
};

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

  function toggleDarkMode() {
    toggleTheme();
  }

  function getActiveImage(card: PortalCard) {
    return card.images[activeImageIndex % card.images.length];
  }


  return (
    <main
      className={`min-h-screen transition-colors duration-300 ${
        darkMode ? "bg-black text-white" : "bg-[#fff6dc] text-black"
      }`}
    >
  {/* TOP MENU */}
  <header
    className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
      darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"
    }`}
  >
    <div className="grid h-20 w-full grid-cols-[92px_1fr_52px] items-center px-4">
      <div className="flex items-center gap-2">
        <LoadLinkBoundary name="site menu">
          <Suspense fallback={<span className="h-10 w-10" aria-hidden="true" />}>
            <SiteMenu
              darkMode={darkMode}
              className={`text-3xl font-black ${darkMode ? "text-white" : "text-black"}`}
            />
          </Suspense>
        </LoadLinkBoundary>

        <LoadLinkBoundary name="account settings button">
          <Suspense fallback={<span className="h-10 w-10" aria-hidden="true" />}>
            <AuthStatusButton darkMode={darkMode} />
          </Suspense>
        </LoadLinkBoundary>
      </div>

      <HomeLogoLink theme={darkMode ? "dark" : "light"} logoClassName="loadlink-logo-dark-fix" />

      <LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleDarkMode} className="ml-auto" />
    </div>
  </header>

      <LoadLinkBoundary name="marketplace search"><Suspense fallback={null}><MarketplaceDiscovery darkMode={darkMode} /></Suspense></LoadLinkBoundary>

      {/* COMPACT HOMEPAGE QUICK LINKS */}
      <section
        data-loadlink-home-quick-links="compact"
        className={`loadlink-home-quick-links-compact border-y px-4 py-8 sm:px-5 md:px-10 md:py-10 ${
          darkMode
            ? "border-white/10 bg-[#050505] text-white"
            : "border-black/10 bg-[#fffaf0] text-black"
        }`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b88900]">Marketplace portals</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] sm:text-3xl md:text-4xl">Quick links</h2>
            </div>
            <p className={`hidden max-w-md text-right text-sm font-semibold leading-6 md:block ${darkMode ? "text-white/45" : "text-black/50"}`}>
              Move directly between jobs, contracts, drivers and vehicle listings.
            </p>
          </div>

          <div
            data-loadlink-swipe-dots="true"
            className="no-scrollbar mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3 touch-pan-x md:grid md:grid-cols-4 md:overflow-visible md:pb-0"
            aria-label="LoadLink quick links"
          >
            {portalCards.map((card) => {
              const activeImage = getActiveImage(card);
              return (
                <Link
                  key={card.title}
                  href={card.href}
                  className={`group relative block h-[205px] w-[74vw] max-w-[270px] shrink-0 snap-start overflow-hidden border sm:h-[220px] sm:w-[43vw] md:h-[255px] md:w-auto md:max-w-none ${
                    darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"
                  }`}
                >
                  <img
                    src={activeImage.src}
                    alt={card.title}
                    style={{ objectPosition: activeImage.position }}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/10" />
                  <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-5">
                    <h3 className="text-xl font-black leading-tight text-white sm:text-2xl">{card.title}</h3>
                    <span className="mt-3 inline-flex border border-[#f6b800] bg-black/70 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#f6b800] sm:text-[11px]">
                      {card.buttonText}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <LoadLinkBoundary name="recent activity"><Suspense fallback={null}><RecentActivityPanel darkMode={darkMode} /></Suspense></LoadLinkBoundary>

      {/* OUR MISSION SECTION */}
      <section
        className={`px-5 py-16 transition-colors duration-300 md:px-12 ${
          darkMode ? "bg-[#050505] text-white" : "bg-[#fff6dc] text-black"
        }`}
      >
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-4xl font-black leading-tight md:text-6xl">
            Building a smarter way to connect logistics opportunities.
          </h2>

          <p
            className={`mx-auto mt-6 max-w-3xl text-base font-semibold leading-8 md:text-lg ${
              darkMode ? "text-white/60" : "text-black/60"
            }`}
          >
            LoadLink brings verified logistics opportunities, commercial vehicles, professional drivers and direct business communication into one South African marketplace. Our goal is to make finding work, equipment and reliable industry partners faster and more transparent.
          </p>
        </div>
      </section>

      <LoadLinkBoundary name="logistics news"><Suspense fallback={null}><LogisticsNews darkMode={darkMode} /></Suspense></LoadLinkBoundary>


      {/* FOOTER / FINAL SECTION */}
      <footer
        className={`px-5 py-16 transition-colors duration-300 md:px-12 ${
          darkMode ? "bg-black text-white" : "bg-white text-black"
        }`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex justify-center">
            <Link href="/" aria-label="LoadLink home" className="block max-w-full outline-none">
              <img
                src={darkMode ? "/images/loadlink-logo-dark.png" : "/images/loadlink-logo-light.png"}
                alt="LoadLink"
                className="h-auto w-[min(78vw,430px)] object-contain"
              />
            </Link>
          </div>

          <div
            className={`divide-y border-y ${
              darkMode
                ? "divide-white/10 border-white/10"
                : "divide-black/10 border-black/10"
            }`}
          >
            <details open className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between text-2xl font-black">
                Company
                <span className="text-[#b98400] group-open:rotate-180">v</span>
              </summary>

              <div
                className={`mt-6 grid gap-6 text-xl ${
                  darkMode ? "text-white/70" : "text-black/75"
                }`}
              >
                <Link href="#">About LoadLink</Link>
                <Link href="#">Contact us</Link>
                <Link href="#">Work with LoadLink</Link>
                <Link href="#">Feedback</Link>
                <Link href="/help">Help & FAQ</Link>
                <Link href="#">Industry insights</Link>
              </div>
            </details>

            <details className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between text-2xl font-black">
                Logistics
                <span className="text-[#b98400] group-open:rotate-180">v</span>
              </summary>

              <div
                className={`mt-6 grid gap-6 text-xl ${
                  darkMode ? "text-white/70" : "text-black/75"
                }`}
              >
                <Link href="/jobs">Find jobs</Link>
                <Link href="/contracts">Find contracts</Link>
                <RequireAuthLink href="/list-your-vehicle">List your vehicle</RequireAuthLink>
                <Link href="#">Truck hire</Link>
                <Link href="#">Available loads</Link>
              </div>
            </details>

            <details className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between text-2xl font-black">
                Services
                <span className="text-[#b98400] group-open:rotate-180">v</span>
              </summary>

              <div
                className={`mt-6 grid gap-6 text-xl ${
                  darkMode ? "text-white/70" : "text-black/75"
                }`}
              >
                <Link href="#">Premium packages</Link>
                <Link href="#">Pro packages</Link>
                <Link href="#">Sponsored listings</Link>
                <Link href="#">Business support</Link>
                <Link href="#">Ratings & reviews</Link>
              </div>
            </details>

            <details className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between text-2xl font-black">
                Customers
                <span className="text-[#b98400] group-open:rotate-180">v</span>
              </summary>

              <div
                className={`mt-6 grid gap-6 text-xl ${
                  darkMode ? "text-white/70" : "text-black/75"
                }`}
              >
                <Link href="#">Safety & security</Link>
                <Link href="#">Terms & conditions</Link>
                <Link href="/help">Privacy and safety help</Link>
                <Link href="#">Cookie policy</Link>
                <Link href="#">Help centre</Link>
              </div>
            </details>
          </div>

          <div className="mt-12">
            <h3 className="text-2xl font-black">Download the app</h3>

            <div className="mt-5 flex flex-nowrap items-center gap-3 overflow-x-auto pb-1">
              <Link href="#" aria-label="Download on the App Store">
                <img
                  src="/images/app-store-badge.png"
                  alt="Download on the App Store"
                  className="h-10 w-auto object-contain"
                />
              </Link>

              <Link href="#" aria-label="Get it on Google Play">
                <img
                  src="/images/google-play-badge.png"
                  alt="Get it on Google Play"
                  className="h-10 w-auto object-contain"
                />
              </Link>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-7">
            <Link
              href="#"
              className="flex h-11 w-11 items-center justify-center bg-[#f6b800] text-lg font-black text-black"
            >
              f
            </Link>

            <Link
              href="#"
              className="flex h-11 w-11 items-center justify-center text-3xl font-black"
            >
              X
            </Link>

            <Link
              href="#"
              className="flex h-11 w-11 items-center justify-center bg-red-600 text-sm font-black text-white"
            >
              YT
            </Link>

            <Link
              href="#"
              className="flex h-11 w-11 items-center justify-center bg-[#f6b800] text-sm font-black text-black"
            >
              IG
            </Link>

            <Link
              href="#"
              className="flex h-11 w-11 items-center justify-center bg-black text-sm font-black text-white"
            >
              TT
            </Link>

            <Link
              href="#"
              className="flex h-11 w-11 items-center justify-center rounded bg-blue-700 text-sm font-black text-white"
            >
              in
            </Link>
          </div>

          <p
            className={`mt-12 text-base font-semibold ${
              darkMode ? "text-white/45" : "text-black/50"
            }`}
          >
            © Copyright 2026 LoadLink
          </p>
        </div>
      </footer>
</main>
  );
}


function HomeFallback() {
  const links = [
    ["Find jobs", "/jobs"],
    ["Find contracts", "/contracts"],
    ["Driver profile", "/driver-profile"],
    ["Driver profiles", "/drivers"],
    ["Profile settings", "/account/settings"],
  ] as const;

  return (
    <main className="min-h-screen bg-[#fff6dc] px-5 py-10 text-black">
      <div className="mx-auto max-w-4xl">
        <header className="border-b border-black/10 pb-6 text-center">
          <img src="/images/loadlink-logo-light.png" alt="LoadLink" className="mx-auto h-14 w-auto object-contain" />
          <h1 className="mt-6 text-4xl font-black">LoadLink marketplace</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-black/60">The main experience could not initialise on this browser, but every core LoadLink portal remains available below.</p>
        </header>
        <section className="mt-8 grid gap-3 sm:grid-cols-2">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="flex min-h-20 items-center justify-between border border-black/10 bg-white px-5 py-4 text-lg font-black">
              {label}<span aria-hidden="true">→</span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}


function MenuIcon() {
  return (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
