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

type PortalImage = {
  src: string;
  position: string;
};

type PortalCard = {
  title: string;
  description: string;
  buttonText: string;
  images: PortalImage[];
  href: string;
};

const IMAGE_ROTATION_INTERVAL = 5 * 60 * 1000;

const portalCards: PortalCard[] = [
  {
    title: "Jobs",
    description: "Find transport and logistics work for trucks and mobile units.",
    buttonText: "Open",
    images: [
      { src: "/images/jobs-1.jpg", position: "center center" },
      { src: "/images/jobs-2.jpg", position: "center center" },
      { src: "/images/jobs-3.jpg", position: "center center" },
    ],
    href: "/jobs?portal=job",
  },
  {
    title: "Contracts",
    description: "Browse longer-term logistics opportunities and recurring work.",
    buttonText: "Open",
    images: [
      { src: "/images/contracts-1.jpg", position: "center center" },
      { src: "/images/contracts-2.jpg", position: "center center" },
      { src: "/images/contracts-3.jpg", position: "center center" },
    ],
    href: "/contracts",
  },
  {
    title: "Vehicles & units",
    description: "Browse commercial trucks, trailers and mobile units on LoadLink.",
    buttonText: "Open",
    images: [
      { src: "/images/truck-1.jpg", position: "center center" },
      { src: "/images/truck-2.jpg", position: "center center" },
      { src: "/images/truck-3.jpg", position: "center center" },
    ],
    href: "/list-your-vehicle?view=marketplace#vehicle-marketplace",
  },
  {
    title: "Drivers",
    description: "Browse approved drivers or manage your professional driver profile.",
    buttonText: "Open",
    images: [{ src: "/images/driver-profile-hero.jpg", position: "center center" }],
    href: "/driver-portal",
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
    <main
      className={`min-h-screen transition-colors duration-300 ${
        darkMode ? "bg-black text-white" : "bg-[#fff6dc] text-black"
      }`}
    >
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <LoadLinkBoundary name="marketplace search">
        <Suspense fallback={null}>
          <MarketplaceDiscovery darkMode={darkMode} />
        </Suspense>
      </LoadLinkBoundary>

      <section className="px-3 pb-7 pt-3 sm:px-5 md:px-8 md:pb-12 md:pt-5">
        <div className="mx-auto grid w-full max-w-7xl gap-3 sm:gap-4 md:grid-cols-2 md:gap-5">
          {portalCards.map((card) => {
            const activeImage = getActiveImage(card);

            return (
              <Link
                key={card.title}
                href={card.href}
                aria-label={`Open ${card.title}`}
                className={`group relative block h-[390px] overflow-hidden rounded-[28px] border shadow-[0_14px_38px_rgba(0,0,0,.11)] transition active:scale-[.995] sm:h-[460px] sm:rounded-[32px] md:h-[520px] lg:h-[560px] ${
                  darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"
                }`}
              >
                <img
                  src={activeImage.src}
                  alt={card.title}
                  style={{ objectPosition: activeImage.position }}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
                />

                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/90" />

                <div className="relative z-10 flex h-full w-full flex-col justify-end p-6 pb-7 text-left text-white sm:p-8 md:p-9">
                  <h2 className="max-w-[92%] text-[34px] font-black leading-[.96] tracking-[-.045em] sm:text-5xl md:text-5xl lg:text-6xl">
                    {card.title}
                  </h2>
                  <p className="mt-3 max-w-[34rem] text-sm font-semibold leading-6 text-white/80 sm:mt-4 sm:text-base sm:leading-7">
                    {card.description}
                  </p>
                  <span className="mt-5 inline-flex min-h-12 w-fit items-center justify-center rounded-full bg-[#f6b800] px-6 text-[13px] font-black uppercase tracking-[.08em] text-black shadow-[0_8px_20px_rgba(0,0,0,.2)] transition group-hover:translate-y-[-1px] sm:mt-6 sm:min-h-14 sm:px-7 sm:text-sm">
                    {card.buttonText}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <LoadLinkBoundary name="recent activity">
        <Suspense fallback={null}>
          <RecentActivityPanel darkMode={darkMode} />
        </Suspense>
      </LoadLinkBoundary>

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

      <LoadLinkBoundary name="logistics news">
        <Suspense fallback={null}>
          <LogisticsNews darkMode={darkMode} />
        </Suspense>
      </LoadLinkBoundary>

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
                <span className="opacity-35 transition group-open:rotate-180">v</span>
              </summary>

              <div
                className={`mt-6 grid gap-6 text-xl ${
                  darkMode ? "text-white/70" : "text-black/75"
                }`}
              >
                <Link href="#">About LoadLink</Link>
                <a href="mailto:loadlinksouthafrica@gmail.com">Contact support</a>
                <Link href="/help">Help & FAQ</Link>
                <Link href="/help">Feedback</Link>
                <Link href="#">Industry insights</Link>
              </div>
            </details>

            <details className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between text-2xl font-black">
                Logistics
                <span className="opacity-35 transition group-open:rotate-180">v</span>
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
                <span className="opacity-35 transition group-open:rotate-180">v</span>
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
                <span className="opacity-35 transition group-open:rotate-180">v</span>
              </summary>

              <div
                className={`mt-6 grid gap-6 text-xl ${
                  darkMode ? "text-white/70" : "text-black/75"
                }`}
              >
                <Link href="/legal#marketplace-safety-policy">Safety centre</Link>
                <Link href="/help">Report a problem</Link>
                <Link href="/help">Help centre</Link>
                <Link href="/legal#privacy-policy">Privacy & account safety</Link>
              </div>
            </details>

            <details className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between text-2xl font-black">
                Legal
                <span className="opacity-35 transition group-open:rotate-180">v</span>
              </summary>

              <div
                className={`mt-6 grid gap-6 text-xl ${
                  darkMode ? "text-white/70" : "text-black/75"
                }`}
              >
                <Link href="/legal#terms-of-use">Terms of Use</Link>
                <Link href="/legal#privacy-policy">Privacy Policy</Link>
                <Link href="/legal#marketplace-safety-policy">Marketplace & Safety Policy</Link>
                <Link href="/legal#refund-cancellation-policy">Refund & Cancellation Policy</Link>
                <Link href="/legal#cookie-policy">Cookie Policy</Link>
                <Link href="/legal#community-standards">Community Standards</Link>
              </div>
            </details>
          </div>

          <section className={`mt-10 border-t pt-8 ${darkMode ? "border-white/10" : "border-black/10"}`}>
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div className="max-w-4xl">
                <p className="text-xl font-black tracking-[-.025em]">Trade with confidence.</p>
                <p className={`mt-2 text-sm font-semibold leading-6 ${darkMode ? "text-white/58" : "text-black/58"}`}>
                  Verify the person, business, vehicle and documents before completing a transaction. LoadLink provides marketplace infrastructure and safety tools but does not automatically become a party to transactions between users.
                </p>
              </div>
              <Link
                href="/help"
                className={`inline-flex min-h-11 w-fit items-center justify-center rounded-full border px-5 text-sm font-black transition active:scale-[.98] ${darkMode ? "border-white/14 bg-white/[.035]" : "border-black/10 bg-black/[.025]"}`}
              >
                Report suspicious activity
              </Link>
            </div>
          </section>

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

          <div className="mt-12 flex flex-wrap items-center gap-3">
            {[
              ["f", "Facebook"],
              ["X", "X"],
              ["YT", "YouTube"],
              ["IG", "Instagram"],
              ["TT", "TikTok"],
              ["in", "LinkedIn"],
            ].map(([mark, label]) => (
              <Link
                key={label}
                href="#"
                aria-label={label}
                className={`flex h-11 min-w-11 items-center justify-center rounded-full border px-3 text-xs font-black backdrop-blur-xl transition active:scale-[.97] ${darkMode ? "border-white/12 bg-white/[.035] text-white/76" : "border-black/10 bg-black/[.025] text-black/70"}`}
              >
                {mark}
              </Link>
            ))}
          </div>

          <div
            className={`mt-12 border-t pt-7 ${darkMode ? "border-white/10 text-white/50" : "border-black/10 text-black/55"}`}
          >
            <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-bold">
              <Link href="/legal#terms-of-use">Terms</Link>
              <Link href="/legal#privacy-policy">Privacy</Link>
              <Link href="/legal#marketplace-safety-policy">Safety</Link>
              <Link href="/legal#refund-cancellation-policy">Refunds</Link>
              <Link href="/legal#cookie-policy">Cookies</Link>
            </div>
            <p className="mt-5 text-sm font-semibold">© 2026 LoadLink. All rights reserved. · South Africa</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function HomeFallback() {
  const links = [
    ["Find jobs", "/jobs"],
    ["Find contracts", "/contracts"],
    ["Browse vehicles", "/list-your-vehicle?view=marketplace#vehicle-marketplace"],
    ["View drivers", "/driver-portal"],
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