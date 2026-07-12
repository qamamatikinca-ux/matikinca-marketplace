"use client";

import HomeLogoLink from "@/components/HomeLogoLink";

import Link from "next/link";
import { useEffect, useState } from "react"; import RecentActivityPanel from "@/components/RecentActivityPanel";
import MarketplaceDiscovery from "@/components/MarketplaceDiscovery";
import LogisticsNews from "@/components/LogisticsNews";
import AuthStatusButton from "@/components/AuthStatusButton";
import RequireAuthLink from "@/components/RequireAuthLink";
import { recordUserActivity, syncAccountState } from "@/lib/accountState";

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
      {
        src: "/images/jobs-1.jpg",
        position: "center center",
      },
      {
        src: "/images/jobs-2.jpg",
        position: "center center",
      },
      {
        src: "/images/jobs-3.jpg",
        position: "center center",
      },
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
      {
        src: "/images/contracts-1.jpg",
        position: "center center",
      },
      {
        src: "/images/contracts-2.jpg",
        position: "center center",
      },
      {
        src: "/images/contracts-3.jpg",
        position: "center center",
      },
    ],
    href: "/contracts",
    type: "Contracts portal",
    category: "Contract",
    packageType: "pro",
  },
  {
    title: "List Your Truck",
    buttonText: "List your truck",
    images: [
      {
        src: "/images/truck-1.jpg",
        position: "center center",
      },
      {
        src: "/images/truck-2.jpg",
        position: "center center",
      },
      {
        src: "/images/truck-3.jpg",
        position: "center center",
      },
    ],
    href: "/list-your-truck",
    type: "Truck owner portal",
    category: "Truck Hire",
    packageType: "basic",
  },
];

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [recentActivity, setRecentActivity] = useState<PortalCard[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const savedTheme = localStorage.getItem("loadlink-theme");

    if (savedTheme === "dark") {
      setDarkMode(true);
    }

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
      localStorage.removeItem("loadlink-recent-activity");
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
    const newMode = !darkMode;

    setDarkMode(newMode);
    localStorage.setItem("loadlink-theme", newMode ? "dark" : "light");
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
        <button
          className={`flex h-10 w-10 items-center justify-center text-3xl font-black ${
            darkMode ? "text-white" : "text-black"
          }`}
          aria-label="Open menu"
        >
          <MenuIcon />
        </button>

        <AuthStatusButton darkMode={darkMode} />
      </div>

      <HomeLogoLink logoClassName="loadlink-logo-dark-fix" />

      <button
        onClick={toggleDarkMode}
        aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        title={darkMode ? "Light mode" : "Dark mode"}
        className={`ml-auto flex h-10 w-10 items-center justify-center rounded-full border transition active:scale-[0.97] ${
          darkMode
            ? "border-yellow-400/70 bg-yellow-400 text-black shadow-[0_0_18px_rgba(246,184,0,0.22)]"
            : "border-black/10 bg-black text-[#f6b800] shadow-[0_8px_18px_rgba(0,0,0,0.10)]"
        }`}
      >
        {darkMode ? <HeaderSunIcon /> : <HeaderMoonIcon />}
      </button>
    </div>
  </header>

      <MarketplaceDiscovery darkMode={darkMode} />

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

      <RecentActivityPanel darkMode={darkMode} />

      {/* OUR MISSION SECTION */}
      <section
        className={`px-5 py-16 transition-colors duration-300 md:px-12 ${
          darkMode ? "bg-[#050505] text-white" : "bg-[#fff6dc] text-black"
        }`}
      >
        <div className="mx-auto max-w-5xl text-center">
          <p
            className={`mb-4 text-sm font-black uppercase tracking-[0.3em] ${
              darkMode ? "text-[#8a6400]" : "text-[#b98400]"
            }`}
          >
            Our Mission
          </p>

          <h2 className="text-4xl font-black leading-tight md:text-6xl">
            Building a smarter way to connect logistics opportunities.
          </h2>

          <p
            className={`mx-auto mt-6 max-w-3xl text-base font-semibold leading-8 md:text-lg ${
              darkMode ? "text-white/60" : "text-black/60"
            }`}
          >
            Mission information will be added here later.
          </p>
        </div>
      </section>

      <section className={`px-5 py-14 md:px-12 ${darkMode ? "bg-black text-white" : "bg-white text-black"}`}>
        <div className={`mx-auto max-w-5xl border p-6 md:p-8 ${darkMode ? "border-[#f6b800]/30 bg-[#0b0b0b]" : "border-[#d4a532] bg-[#fff6dc]"}`}>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#b88900]">Account verification</p>
          <div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div><h2 className="text-3xl font-black">Build trust with a verified profile</h2><p className={`mt-2 max-w-2xl text-sm leading-6 ${darkMode ? "text-white/60" : "text-black/60"}`}>Verify your cellphone number and identity. Review usually takes a few minutes when a reviewer is available.</p></div>
            <Link href="/verify" className="flex h-12 shrink-0 items-center justify-center bg-[#f6b800] px-6 font-black text-black">Start verification</Link>
          </div>
        </div>
      </section>

      <LogisticsNews darkMode={darkMode} />


      {/* FOOTER / FINAL SECTION */}
      <footer
        className={`px-5 py-16 transition-colors duration-300 md:px-12 ${
          darkMode ? "bg-black text-white" : "bg-white text-black"
        }`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex justify-center">
            <div className="relative flex items-center justify-center">
              <span
                className={`absolute -top-2 left-10 h-2 w-24 rounded-full ${
                  darkMode ? "bg-[#5c4300]" : "bg-[#f6b800]"
                }`}
              />

              <span
                className={`text-4xl font-black italic tracking-tight ${
                  darkMode ? "text-white" : "text-black"
                }`}
              >
                LOADLINK
              </span>

              <span
                className={`absolute -bottom-2 right-4 h-2 w-28 rounded-full ${
                  darkMode ? "bg-[#5c4300]" : "bg-[#f6b800]"
                }`}
              />
            </div>
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
                <RequireAuthLink href="/list-your-truck">List your truck</RequireAuthLink>
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


function MenuIcon() {
  return (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function HeaderSunIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.72 5.28l-1.56 1.56M6.84 17.16l-1.56 1.56M18.72 18.72l-1.56-1.56M6.84 6.84 5.28 5.28"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HeaderMoonIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path d="M20.2 14.1A8.7 8.7 0 0 1 9.9 3.8a8.7 8.7 0 1 0 10.3 10.3Z" fill="currentColor" />
    </svg>
  );
}

