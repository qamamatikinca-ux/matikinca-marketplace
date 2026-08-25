"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import VehicleMarketplaceHub from "@/components/VehicleMarketplaceHub";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import LegacyVehicleListingPage from "./LegacyVehicleListingPage";

type EntryMode = "vehicle" | "mobile-unit" | "";

export default function ListYourVehiclePage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [booted, setBooted] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>("");
  const page = darkMode ? "bg-black text-white" : "bg-[#f5f1e8] text-black";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("entry");
    setEntryMode(requested === "vehicle" || requested === "mobile-unit" ? requested : "");
    setBooted(true);
  }, []);

  if (!booted) return <LoadLinkLoading />;

  // The listing engine already owns authentication, seller/dealership selection,
  // plan access, validation, uploads and submission. Do not wrap it in a DOM-driven
  // wizard: that was preventing the real form from opening on mobile Safari.
  if (entryMode) return <LegacyVehicleListingPage />;

  return (
    <main className={`min-h-screen ${page}`} data-loadlink-vehicle-portal="source-v9-working">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="relative isolate flex min-h-[500px] w-full items-end overflow-hidden bg-black text-white md:min-h-[610px]">
        <img
          src="/images/jobs/jobs-hero-fleet.jpg"
          alt="LoadLink commercial trucks, trailers and mobile units"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/52 to-black/95" />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-8 pt-14 text-left sm:px-7 md:pb-12 md:pt-24">
          <p className="text-[11px] font-extrabold uppercase tracking-[.08em] text-[#f6b800]">Commercial marketplace</p>
          <h1 className="mt-3 max-w-3xl text-[clamp(2.55rem,9.5vw,5rem)] font-black leading-[.96] tracking-[-.045em]">
            List your vehicle or mobile unit.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] font-medium leading-6 text-white/72 md:text-base">
            Create a verified LoadLink listing or browse commercial stock already available on the marketplace.
          </p>

          <div className="mt-7 grid w-full max-w-[620px] gap-3 sm:grid-cols-2">
            <Link
              href="/list-your-vehicle?entry=vehicle"
              className="flex min-h-[54px] items-center justify-between rounded-2xl bg-[#f6b800] px-5 text-sm font-black text-black shadow-[0_12px_32px_rgba(246,184,0,.18)] transition active:scale-[.99]"
            >
              <span>List vehicle</span><span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/list-your-vehicle?entry=mobile-unit"
              className="flex min-h-[54px] items-center justify-between rounded-2xl bg-[#f6b800] px-5 text-sm font-black text-black shadow-[0_12px_32px_rgba(246,184,0,.18)] transition active:scale-[.99]"
            >
              <span>List mobile unit</span><span aria-hidden="true">→</span>
            </Link>
          </div>

          <a href="#vehicle-marketplace" className="mt-3 inline-flex min-h-11 items-center gap-2 px-1 text-sm font-bold text-white/82">
            Browse marketplace <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>

      <div id="vehicle-marketplace" className="scroll-mt-20">
        <VehicleMarketplaceHub darkMode={darkMode} />
      </div>
    </main>
  );
}
