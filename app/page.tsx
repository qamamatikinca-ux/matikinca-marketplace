"use client";

import HomeLogoLink from "@/components/HomeLogoLink";

import Link from "next/link";
import { lazy, Suspense, useEffect, useState } from "react";
import RequireAuthLink from "@/components/RequireAuthLink";
import { recordUserActivity, syncAccountState } from "@/lib/accountState";

import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import LoadLinkBoundary from "@/components/platform/LoadLinkBoundary";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import DealerInventorySlider from "@/components/platform/DealerInventorySlider";
import ProfessionalFooter from "@/components/platform/ProfessionalFooter";

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
  type: string;
  category: string;
  packageType: "basic" | "premium" | "pro";
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
    type: "Jobs portal",
    category: "Job",
    packageType: "premium",
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
    type: "Contracts portal",
    category: "Contract",
    packageType: "pro",
  },
  {
    title: "Driver Profile",
    buttonText: "Create or update your driver profile",
    images: [{ src: "/images/driver-profile-hero.jpg", position: "center center" }],
    href: "/driver-profile",
    type: "Driver profile portal",
    category: "Driver",
    packageType: "basic",
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
    type: "Truck owner portal",
    category: "Truck Hire",
    packageType: "basic",
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
  const [recentActivity, setRecentActivity] = useState<PortalCard[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    try {
      const savedActivity = localStorage.getItem("loadlink-recent-activity");

      if (savedActivity) {
        const parsedActivity = JSON.parse(savedActivity);

        if (Array.isArray(parsedActivity) && parsedActivity.length > 0) {
          const cleanedActivity: PortalCard[] = parsedActivity
            .map((item: Partial<PortalCard>) => {
              return portalCards.find((card) => card.title === item.title);
            })
            .filter((item): item is PortalCard => Boolean(item));

          setRecentActivity(cleanedActivity);
        }
      }
    } catch {
      try {
        localStorage.removeItem("loadlink-recent-activity");
      } catch {
        // Browser storage may be unavailable; continue without recent activity.
      }
      setRecentActivity([]);
    }
  }, []);

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

  function saveRecentActivity(card: PortalCard) {
    const updatedActivity = [
      card,
      ...recentActivity.filter((item) => item.title !== card.title),
    ].slice(0, 3);

    setRecentActivity(updatedActivity);

    try {
      localStorage.setItem(
        "loadlink-recent-activity",
        JSON.stringify(updatedActivity)
      );
      window.dispatchEvent(new Event("loadlink-account-state-changed"));
      recordUserActivity("portal_view", {
        entityType: "portal",
        entityId: card.href,
        metadata: { title: card.title, category: card.category },
      }).catch(() => undefined);
      syncAccountState().catch(() => undefined);
    } catch {
      console.log("Could not save recent activity");
    }
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

      {/* MAIN RECTANGLE PORTAL CARDS */}
      <section className="w-full">
        <div className="flex w-full flex-col gap-0">
          {portalCards.map((card) => {
            const activeImage = getActiveImage(card);

            return (
              <Link
                key={card.title}
                href={card.href}
                onClick={() => saveRecentActivity(card)}
                className="group relative block h-[52vh] min-h-[380px] w-full overflow-hidden md:h-[65vh]"
              >
                <img
                  src={activeImage.src}
                  alt={card.title}
                  style={{ objectPosition: activeImage.position }}
                  className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 group-hover:scale-[1.02]"
                />

                <div className="absolute inset-0 bg-black/45" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/35 to-black/75" />

                <div
                  className={`absolute inset-x-0 bottom-0 h-40 blur-3xl transition ${
                    darkMode ? "bg-[#5c4300]/20" : "bg-[#f6b800]/18"
                  }`}
                />

                <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-6 text-center">
                  <h2 className="text-5xl font-black leading-tight text-white md:text-7xl">
                    {card.title}
                  </h2>

                  <div
                    className={`mt-6 border px-8 py-4 text-base font-black uppercase tracking-wide transition md:text-lg ${
                      darkMode
                        ? "border-[#5c4300] bg-black/70 text-[#f6b800]"
                        : "border-[#f6b800] bg-black/70 text-[#f6b800]"
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

      <DealerInventorySlider darkMode={darkMode} />

      <LoadLinkBoundary name="logistics news"><Suspense fallback={null}><LogisticsNews darkMode={darkMode} /></Suspense></LoadLinkBoundary>


      {/* PROFESSIONAL FOOTER */}
      <ProfessionalFooter darkMode={darkMode} />
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
