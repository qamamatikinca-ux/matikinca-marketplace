"use client";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";

import Link from "next/link";
import HomeLogoLink from "@/components/HomeLogoLink";
import SiteMenu from "@/components/SiteMenu";
import AuthStatusButton from "@/components/AuthStatusButton";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import RequireAuthLink from "@/components/RequireAuthLink";
import DriversAvailableForWork from "@/components/phase2/DriversAvailableForWork";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function DriverPortalPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const page = darkMode ? "bg-black text-white" : "bg-[#fffaf0] text-black";

  return (
    <main className={`min-h-screen ${page}`}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="relative min-h-[520px] overflow-hidden md:min-h-[620px]">
        <img
          src="/images/driver-profile-hero.jpg"
          alt="Professional truck drivers"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/45 to-black/90" />

        <div className="relative mx-auto flex min-h-[520px] max-w-6xl flex-col justify-end px-5 pb-8 pt-24 text-center text-white md:min-h-[620px] md:pb-12">
          <h1 className="mx-auto max-w-4xl text-5xl font-black tracking-[-.055em] md:text-7xl">
            Find a driver or build your profile
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/75 md:text-base">
            Browse approved drivers who are available for work or create your own professional LoadLink driver profile.
          </p>

          <div className="mx-auto mt-6 grid w-full max-w-md gap-3">
            <Link
              href="/drivers"
              className="flex min-h-14 items-center justify-center rounded-full bg-[#f6b800] px-6 text-sm font-black uppercase tracking-[.1em] text-black shadow-[0_12px_32px_rgba(0,0,0,.28)] transition active:scale-[.99]"
            >
              View available drivers
            </Link>
            <RequireAuthLink
              href="/driver-profile"
              className="flex min-h-14 items-center justify-center rounded-full border border-white/55 bg-black/80 px-6 text-sm font-black uppercase tracking-[.1em] text-white shadow-[0_12px_32px_rgba(0,0,0,.24)] backdrop-blur transition active:scale-[.99]"
            >
              Create driver profile
            </RequireAuthLink>
          </div>
        </div>
      </section>

      <DriversAvailableForWork darkMode={darkMode} showHero={false} />
    </main>
  );
}
