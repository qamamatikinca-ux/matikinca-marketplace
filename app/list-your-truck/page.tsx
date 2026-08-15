"use client";

import Link from "next/link";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import VehicleMarketplaceHub from "@/components/VehicleMarketplaceHub";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function ListYourTruckPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const page = darkMode ? "bg-black text-white" : "bg-[#fffaf0] text-black";

  return (
    <main className={`min-h-screen ${page}`} data-loadlink-vehicle-portal="three-choice-v1">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="relative min-h-[560px] overflow-hidden md:min-h-[650px]">
        <img
          src="/images/jobs/jobs-hero-fleet.jpg"
          alt="LoadLink trucks, trailers and mobile units"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/48 to-black/92" />

        <div className="relative mx-auto flex min-h-[560px] max-w-6xl flex-col justify-end px-5 pb-8 pt-24 text-center text-white md:min-h-[650px] md:pb-12">
          <h1 className="mx-auto max-w-4xl text-5xl font-black tracking-[-.055em] md:text-7xl">
            List, find and move with LoadLink
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/75 md:text-base">
            List a commercial vehicle, list a mobile unit, or browse approved vehicles and units already available on LoadLink.
          </p>

          <div className="mx-auto mt-7 grid w-full max-w-md gap-3">
            <Link
              href="/list-your-vehicle?entry=vehicle"
              className="flex min-h-14 items-center justify-center rounded-full bg-[#f6b800] px-6 text-sm font-black uppercase tracking-[.1em] text-black shadow-[0_12px_32px_rgba(0,0,0,.28)] transition active:scale-[.99]"
            >
              List vehicle
            </Link>

            <Link
              href="/list-your-vehicle?entry=mobile-unit"
              className="flex min-h-14 items-center justify-center rounded-full border border-white/55 bg-black/80 px-6 text-sm font-black uppercase tracking-[.1em] text-white shadow-[0_12px_32px_rgba(0,0,0,.24)] backdrop-blur transition active:scale-[.99]"
            >
              List mobile unit
            </Link>

            <a
              href="#vehicle-marketplace"
              className="flex min-h-14 items-center justify-center rounded-full border border-white/30 bg-white/[.08] px-6 text-center text-sm font-black uppercase tracking-[.09em] text-white shadow-[0_12px_32px_rgba(0,0,0,.18)] backdrop-blur transition active:scale-[.99]"
            >
              View available vehicles and units
            </a>
          </div>
        </div>
      </section>

      <VehicleMarketplaceHub darkMode={darkMode} />
    </main>
  );
}
