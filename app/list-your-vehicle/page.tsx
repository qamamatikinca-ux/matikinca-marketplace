"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import VehicleMarketplaceHub from "@/components/VehicleMarketplaceHub";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { getVehicleListingAccess } from "@/lib/packageAccess";
import { getLoadLinkIntelligence } from "@/lib/loadlinkIntelligence";
import { getFreshAuthenticatedUser } from "@/lib/reliableSupabase";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import LegacyVehicleListingPage from "./LegacyVehicleListingPage";

type EntryMode = "vehicle" | "mobile-unit" | "";
type ListingPackage = "standard" | "pro" | "dealer";
type DealerPostingGate = "review" | "setup" | "changes" | null;

const entitledPlanStates = new Set(["active", "trial", "trialing", "grace_period", "cancelled"]);

function seedLegacyListingAccess(packageType: ListingPackage) {
  try {
    const key = "loadlink-vehicle-draft-v1";
    const current = JSON.parse(localStorage.getItem(key) || "null") || {};
    localStorage.setItem(
      key,
      JSON.stringify({
        ...current,
        selectedPlan: packageType === "dealer" ? "dealer" : "pro",
        packageType,
      }),
    );
  } catch {
    // The form must still open if storage is unavailable.
  }
}

function openListingEntry(mode: Exclude<EntryMode, "">) {
  const destination = `/list-your-vehicle?entry=${encodeURIComponent(mode)}#listing-form`;
  window.location.assign(destination);
}

export default function ListYourVehiclePage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [booted, setBooted] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>("");
  const [dealershipRoute, setDealershipRoute] = useState(false);
  const [entryReady, setEntryReady] = useState(false);
  const [dealerPostingGate, setDealerPostingGate] = useState<DealerPostingGate>(null);

  const page = darkMode ? "bg-black text-white" : "bg-[#fffaf0] text-black";

  useEffect(() => {
    const url = new URL(window.location.href);
    const requested = url.searchParams.get("entry");
    const mode: EntryMode = requested === "vehicle" || requested === "mobile-unit" ? requested : "";

    setEntryMode(mode);
    setEntryReady(false);
    setDealerPostingGate(null);

    if (!mode) {
      setDealershipRoute(false);

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
        const returnTo = `/list-your-vehicle?entry=${entryMode}#listing-form`;
        window.location.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }

      let packageType: ListingPackage = "standard";
      try {
        const [access, intelligence] = await Promise.all([
          getVehicleListingAccess(),
          getLoadLinkIntelligence().catch(() => null),
        ]);

        packageType = access.plan === "dealer" ? "dealer" : access.plan === "pro" ? "pro" : "standard";

        if (
          intelligence?.plan === "dealer" &&
          entitledPlanStates.has(String(intelligence.plan_state)) &&
          !intelligence.dealer_ready
        ) {
          const gate: DealerPostingGate = !intelligence.dealer_profile_id
            ? "setup"
            : /rejected|changes/i.test(String(intelligence.dealer_status))
              ? "changes"
              : "review";

          seedLegacyListingAccess(packageType);
          if (!cancelled) {
            setDealerPostingGate(gate);
            setEntryReady(true);
          }
          return;
        }
      } catch {
        // Submission performs the authoritative entitlement check again.
      }

      seedLegacyListingAccess(packageType);
      if (!cancelled) {
        setDealerPostingGate(null);
        setEntryReady(true);
      }
    }

    void prepareListingEntry();
    return () => {
      cancelled = true;
    };
  }, [booted, dealershipRoute, entryMode]);

  useEffect(() => {
    if (!entryMode || !entryReady || dealerPostingGate) return;
    let cancelled = false;
    let timer = 0;
    let attempts = 0;

    const focusForm = () => {
      if (cancelled) return;
      const form = document.getElementById("listing-form");
      if (form) {
        form.scrollIntoView({ behavior: "smooth", block: "start" });
        const focusable = form.querySelector<HTMLElement>("input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])");
        window.setTimeout(() => focusable?.focus({ preventScroll: true }), 260);
        return;
      }
      attempts += 1;
      if (attempts < 8) timer = window.setTimeout(focusForm, 80);
    };

    timer = window.setTimeout(focusForm, 40);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [entryMode, entryReady, dealerPostingGate]);

  if (!booted) return <LoadLinkLoading />;

  if (entryMode && dealershipRoute) return <LegacyVehicleListingPage />;

  if (!entryMode) {
    return (
      <main className={`min-h-screen ${page}`} data-loadlink-vehicle-portal="drivers-style-v6">
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
              <button
                type="button"
                onClick={() => openListingEntry("vehicle")}
                className="flex min-h-[58px] items-center justify-center rounded-full border border-white/65 bg-black/78 px-6 text-center text-[13px] font-black uppercase tracking-[.08em] text-white shadow-[0_14px_34px_rgba(0,0,0,.28)] backdrop-blur-sm transition active:scale-[.99] md:text-sm"
              >
                List vehicle
              </button>
              <button
                type="button"
                onClick={() => openListingEntry("mobile-unit")}
                className="flex min-h-[58px] items-center justify-center rounded-full border border-white/65 bg-black/78 px-6 text-center text-[13px] font-black uppercase tracking-[.08em] text-white shadow-[0_14px_34px_rgba(0,0,0,.28)] backdrop-blur-sm transition active:scale-[.99] md:text-sm"
              >
                List mobile unit
              </button>
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

  if (dealerPostingGate) {
    const title =
      dealerPostingGate === "setup"
        ? "Set up your dealership before posting."
        : dealerPostingGate === "changes"
          ? "Your dealership needs changes before stock can go live."
          : "Your dealership is being reviewed.";
    const detail =
      dealerPostingGate === "setup"
        ? "Your Dealer plan is active. Complete the dealership information LoadLink needs before stock can be published."
        : dealerPostingGate === "changes"
          ? "Your Dealer plan remains active. Open Dealer to review the changes required before publishing stock."
          : "Your Dealer plan is active, but stock publishing stays locked until the dealership itself is approved in Control Centre.";

    return (
      <main className={`min-h-screen ${page}`} data-loadlink-dealer-posting-gate={dealerPostingGate}>
        <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
        <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 md:py-14">
          <div className={`rounded-[28px] border p-6 sm:p-8 ${darkMode ? "border-white/10 bg-[#080808]" : "border-black/10 bg-white"}`}>
            <p className={`text-[10px] font-black uppercase tracking-[.16em] ${darkMode ? "text-white/45" : "text-black/45"}`}>
              Posting status
            </p>
            <h1 className="mt-3 text-[38px] font-black leading-[1.02] tracking-[-.055em] sm:text-[48px]">{title}</h1>
            <p className={`mt-4 max-w-2xl text-sm font-semibold leading-6 ${darkMode ? "text-white/55" : "text-black/55"}`}>{detail}</p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Link
                href="/list-your-vehicle#vehicle-marketplace"
                className="flex min-h-[56px] items-center justify-center rounded-full bg-[#f6b800] px-5 text-center text-xs font-black uppercase tracking-[.09em] text-black"
              >
                View available vehicles &amp; units
              </Link>
              <Link
                href="/dealer"
                className={`flex min-h-[56px] items-center justify-center rounded-full border px-5 text-center text-xs font-black uppercase tracking-[.09em] ${darkMode ? "border-white/20 text-white" : "border-black/15 text-black"}`}
              >
                Open Dealer
              </Link>
            </div>

            <Link
              href="/list-your-vehicle"
              className={`mt-5 inline-flex text-xs font-black underline decoration-[#f6b800] decoration-2 underline-offset-4 ${darkMode ? "text-white/55" : "text-black/55"}`}
            >
              Back to vehicle options
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div id="listing-form" data-loadlink-vehicle-listing-shell="direct-no-plan-guide-v6" className="scroll-mt-20">
      <LegacyVehicleListingPage />
      <style jsx global>{`
        [data-loadlink-vehicle-listing-shell="direct-no-plan-guide-v6"] main > section:first-of-type {
          display: none !important;
        }
        [data-loadlink-vehicle-listing-shell="direct-no-plan-guide-v6"] #plans {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
