"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import VehicleMarketplaceHub from "@/components/VehicleMarketplaceHub";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { getVehicleListingAccess } from "@/lib/packageAccess";
import { getFreshAuthenticatedUser } from "@/lib/reliableSupabase";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import LegacyVehicleListingPage from "./LegacyVehicleListingPage";

type EntryMode = "vehicle" | "mobile-unit" | "";
type ListingPackage = "standard" | "pro" | "dealer";

function seedLegacyListingAccess(packageType: ListingPackage) {
  try {
    const key = "loadlink-vehicle-draft-v1";
    const current = JSON.parse(localStorage.getItem(key) || "null") || {};
    localStorage.setItem(
      key,
      JSON.stringify({
        ...current,
        // selectedPlan is retained only as a compatibility flag for the older form component.
        // The package guide is no longer part of the listing journey.
        selectedPlan: packageType === "dealer" ? "dealer" : "pro",
        packageType,
      }),
    );
  } catch {
    // The form must still open if storage is unavailable.
  }
}

export default function ListYourVehiclePage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [booted, setBooted] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>("");
  const [dealershipRoute, setDealershipRoute] = useState(false);
  const [entryReady, setEntryReady] = useState(false);

  const page = darkMode ? "bg-black text-white" : "bg-[#fffaf0] text-black";

  useEffect(() => {
    const url = new URL(window.location.href);
    const requested = url.searchParams.get("entry");
    const mode: EntryMode = requested === "vehicle" || requested === "mobile-unit" ? requested : "";

    setEntryMode(mode);

    // The base vehicle route is always the Drivers-style browse-or-post portal.
    // Old smart/dealer redirects must never bypass that choice screen.
    if (!mode) {
      setDealershipRoute(false);
      setEntryReady(false);

      let changed = false;
      for (const key of ["plan", "smart", "dealership"]) {
        if (url.searchParams.has(key)) {
          url.searchParams.delete(key);
          changed = true;
        }
      }
      if (changed) {
        const clean = `${url.pathname}${url.search ? url.search : ""}${url.hash}`;
        window.history.replaceState(window.history.state, "", clean);
      }
    } else {
      // Dealer-specific inventory is only allowed to take over after the user
      // explicitly chooses a posting route.
      setDealershipRoute(Boolean(url.searchParams.get("dealership")));
    }

    setBooted(true);
  }, []);

  useEffect(() => {
    if (!booted || dealershipRoute || !entryMode) return;
    let cancelled = false;

    async function prepareListingEntry() {
      const user = await getFreshAuthenticatedUser();
      if (!user) {
        const returnTo = `/list-your-vehicle?entry=${entryMode}`;
        window.location.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }

      let packageType: ListingPackage = "standard";
      try {
        const access = await getVehicleListingAccess();
        packageType = access.plan === "dealer" ? "dealer" : access.plan === "pro" ? "pro" : "standard";
      } catch {
        // Package access is checked again at submission. A temporary access-read failure
        // must never send the user back to a package guide or destroy their draft.
      }

      seedLegacyListingAccess(packageType);
      if (!cancelled) setEntryReady(true);
    }

    void prepareListingEntry();
    return () => {
      cancelled = true;
    };
  }, [booted, dealershipRoute, entryMode]);

  if (!booted) return <LoadLinkLoading />;

  // Dealer inventory can only open after an explicit posting choice.
  if (entryMode && dealershipRoute) return <LegacyVehicleListingPage />;

  if (!entryMode) {
    return (
      <main className={`min-h-screen ${page}`} data-loadlink-vehicle-portal="drivers-style-v3">
        <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

        <section className="relative flex min-h-[690px] w-full items-end overflow-hidden bg-black text-white md:min-h-[620px]">
          <img
            src="/images/jobs/jobs-hero-fleet.jpg"
            alt="LoadLink commercial trucks, trailers and mobile units"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/95" />

          <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-5 pb-8 pt-20 text-center sm:px-6 md:pb-12">
            <h1 className="mx-auto max-w-4xl text-[clamp(3rem,12.5vw,5.8rem)] font-black leading-[.94] tracking-[-.055em] text-white">
              List a vehicle or explore available units
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-[15px] font-semibold leading-7 text-white/78 md:text-base">
              Browse approved vehicles and mobile units or create your own LoadLink listing for a commercial vehicle or mobile unit.
            </p>

            <div className="mx-auto mt-7 grid w-full max-w-[640px] gap-3" aria-label="Vehicle marketplace options">
              <a
                href="#vehicle-marketplace"
                className="flex min-h-[58px] items-center justify-center rounded-full border border-[#f6b800] bg-[#f6b800] px-6 text-center text-[13px] font-black uppercase tracking-[.08em] text-black shadow-[0_14px_34px_rgba(0,0,0,.32)] transition active:scale-[.99] md:text-sm"
              >
                View available vehicles &amp; units
              </a>
              <Link
                href="/list-your-vehicle?entry=vehicle"
                className="flex min-h-[58px] items-center justify-center rounded-full border border-white/65 bg-black/78 px-6 text-center text-[13px] font-black uppercase tracking-[.08em] text-white shadow-[0_14px_34px_rgba(0,0,0,.28)] backdrop-blur-sm transition active:scale-[.99] md:text-sm"
              >
                List vehicle
              </Link>
              <Link
                href="/list-your-vehicle?entry=mobile-unit"
                className="flex min-h-[58px] items-center justify-center rounded-full border border-white/65 bg-black/78 px-6 text-center text-[13px] font-black uppercase tracking-[.08em] text-white shadow-[0_14px_34px_rgba(0,0,0,.28)] backdrop-blur-sm transition active:scale-[.99] md:text-sm"
              >
                List mobile unit
              </Link>
            </div>
          </div>
        </section>

        <div id="vehicle-marketplace" className="scroll-mt-20">
          <VehicleMarketplaceHub darkMode={darkMode} />
        </div>
      </main>
    );
  }

  if (!entryReady) {
    return (
      <main className={`min-h-screen ${page}`}>
        <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
        <LoadLinkLoading />
      </main>
    );
  }

  return (
    <div data-loadlink-vehicle-listing-shell="direct-no-plan-guide-v3">
      <LegacyVehicleListingPage />
      <style jsx global>{`
        [data-loadlink-vehicle-listing-shell="direct-no-plan-guide-v3"] main > section:first-of-type {
          display: none !important;
        }
        [data-loadlink-vehicle-listing-shell="direct-no-plan-guide-v3"] #plans {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
