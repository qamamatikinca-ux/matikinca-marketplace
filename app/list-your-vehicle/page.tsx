"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import VehicleMarketplaceHub from "@/components/VehicleMarketplaceHub";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import LoadLinkVehicleEntryBootstrap20260825 from "@/components/LoadLinkVehicleEntryBootstrap20260825";
import LoadLinkVehicleWizardController20260825 from "@/components/LoadLinkVehicleWizardController20260825";
import { getVehicleListingAccess } from "@/lib/packageAccess";
import { getLoadLinkIntelligence } from "@/lib/loadlinkIntelligence";
import { getFreshAuthenticatedUser } from "@/lib/reliableSupabase";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import LegacyVehicleListingPage from "./LegacyVehicleListingPage";

type EntryMode = "vehicle" | "mobile-unit" | "";
type ListingPackage = "standard" | "pro" | "dealer";
type DealerPostingGate = "review" | "setup" | "changes" | null;

const entitledPlanStates = new Set(["active", "trial", "trialing", "grace_period", "cancelled"]);

function seed(packageType: ListingPackage) {
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
  } catch {}
}

function openEntry(mode: Exclude<EntryMode, "">) {
  window.location.assign(`/list-your-vehicle?entry=${encodeURIComponent(mode)}#listing-form`);
}

export default function ListYourVehiclePage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [booted, setBooted] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>("");
  const [dealershipRoute, setDealershipRoute] = useState(false);
  const [entryReady, setEntryReady] = useState(false);
  const [dealerPostingGate, setDealerPostingGate] = useState<DealerPostingGate>(null);
  const page = darkMode ? "bg-black text-white" : "bg-[#f5f1e8] text-black";

  useEffect(() => {
    const url = new URL(window.location.href);
    const requested = url.searchParams.get("entry");
    const mode: EntryMode = requested === "vehicle" || requested === "mobile-unit" ? requested : "";
    setEntryMode(mode);
    setEntryReady(false);
    setDealerPostingGate(null);

    if (!mode) {
      setDealershipRoute(false);
      for (const key of ["plan", "smart", "dealership"]) url.searchParams.delete(key);
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    } else {
      setDealershipRoute(Boolean(url.searchParams.get("dealership")));
    }
    setBooted(true);
  }, []);

  useEffect(() => {
    if (!booted || dealershipRoute || !entryMode) return;
    let cancelled = false;

    async function prepare() {
      const user = await getFreshAuthenticatedUser();
      if (!user) {
        window.location.replace(`/login?returnTo=${encodeURIComponent(`/list-your-vehicle?entry=${entryMode}#listing-form`)}`);
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
          seed(packageType);
          if (!cancelled) {
            setDealerPostingGate(gate);
            setEntryReady(true);
          }
          return;
        }
      } catch {}

      seed(packageType);
      if (!cancelled) {
        setDealerPostingGate(null);
        setEntryReady(true);
      }
    }

    void prepare();
    return () => { cancelled = true; };
  }, [booted, dealershipRoute, entryMode]);

  useEffect(() => {
    if (!entryMode || !entryReady || dealerPostingGate) return;
    const timer = window.setTimeout(
      () => document.getElementById("listing-form")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      80,
    );
    return () => window.clearTimeout(timer);
  }, [entryMode, entryReady, dealerPostingGate]);

  if (!booted) return <LoadLinkLoading />;
  if (entryMode && dealershipRoute) return <LegacyVehicleListingPage />;

  if (!entryMode) {
    return (
      <main className={`min-h-screen ${page}`} data-loadlink-vehicle-portal="working-entry-v11">
        <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
        <section className="relative flex min-h-[600px] w-full items-end overflow-hidden bg-black text-white md:min-h-[620px]">
          <img src="/images/jobs/jobs-hero-fleet.jpg" alt="LoadLink commercial trucks, trailers and mobile units" className="absolute inset-0 h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/18 via-black/48 to-black/94" />
          <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-10 pt-20 text-center">
            <h1 className="mx-auto max-w-4xl text-[clamp(3rem,12vw,5.7rem)] font-black leading-[.94] tracking-[-.055em]">List your truck, trailer or mobile unit.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm font-semibold leading-7 text-white/72 md:text-base">Create a LoadLink listing in a guided flow, or browse commercial stock already on the marketplace.</p>
            <div className="mx-auto mt-7 grid w-full max-w-[650px] gap-2.5 sm:grid-cols-3">
              <button type="button" onClick={() => openEntry("vehicle")} className="min-h-[54px] rounded-full border border-[#f6b800] bg-[#f6b800] px-5 [font-family:inherit] text-xs font-black uppercase tracking-[.08em] text-black shadow-[0_12px_30px_rgba(246,184,0,.22)]">List vehicle</button>
              <button type="button" onClick={() => openEntry("mobile-unit")} className="min-h-[54px] rounded-full border border-[#f6b800] bg-[#f6b800] px-5 [font-family:inherit] text-xs font-black uppercase tracking-[.08em] text-black shadow-[0_12px_30px_rgba(246,184,0,.22)]">List mobile unit</button>
              <a href="#vehicle-marketplace" className="flex min-h-[54px] items-center justify-center rounded-full border border-[#f6b800] bg-black/58 px-5 text-xs font-black uppercase tracking-[.08em] text-[#f6b800]">Browse marketplace</a>
            </div>
          </div>
        </section>
        <div id="vehicle-marketplace" className="scroll-mt-20"><VehicleMarketplaceHub darkMode={darkMode} /></div>
      </main>
    );
  }

  if (!entryReady) {
    return <main className={`min-h-screen ${page}`}><LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} /><LoadLinkLoading /></main>;
  }

  if (dealerPostingGate) {
    const title = dealerPostingGate === "setup"
      ? "Set up your dealership before posting."
      : dealerPostingGate === "changes"
        ? "Your dealership needs changes before stock can go live."
        : "Your dealership is being reviewed.";
    const detail = dealerPostingGate === "setup"
      ? "Complete your dealership information before publishing stock."
      : dealerPostingGate === "changes"
        ? "Open Dealer to review the changes required before publishing stock."
        : "Stock publishing stays locked until the dealership is approved in Control Centre.";

    return (
      <main className={`min-h-screen ${page}`}>
        <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
        <section className="mx-auto w-full max-w-3xl px-4 py-10">
          <div className={`rounded-[24px] border p-6 ${darkMode ? "border-white/10 bg-[#080808]" : "border-black/10 bg-white"}`}>
            <p className="text-[10px] font-bold uppercase tracking-[.14em] opacity-45">Posting status</p>
            <h1 className="mt-3 text-[38px] font-black leading-[1.02] tracking-[-.055em]">{title}</h1>
            <p className="mt-4 text-sm font-semibold leading-6 opacity-55">{detail}</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Link href="/list-your-vehicle#vehicle-marketplace" className="flex min-h-[54px] items-center justify-center rounded-full bg-[#f6b800] px-5 text-xs font-black text-black">Browse marketplace</Link>
              <Link href="/dealer" className="flex min-h-[54px] items-center justify-center rounded-full border border-[#f6b800] px-5 text-xs font-black text-[#f6b800]">Open Dealer</Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={page} data-loadlink-vehicle-listing-shell="working-guided-flow-v11">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <LoadLinkVehicleEntryBootstrap20260825 mode={entryMode as "vehicle" | "mobile-unit"} />
      <LoadLinkVehicleWizardController20260825 darkMode={darkMode} listingKind={entryMode === "mobile-unit" ? "mobile-unit" : "vehicle"} />
      <div id="listing-form" className="scroll-mt-36"><LegacyVehicleListingPage /></div>
      <style jsx global>{`
        [data-loadlink-vehicle-listing-shell="working-guided-flow-v11"] #listing-form > main > header,
        [data-loadlink-vehicle-listing-shell="working-guided-flow-v11"] #listing-form > main > section:first-of-type,
        [data-loadlink-vehicle-listing-shell="working-guided-flow-v11"] #listing-form #plans,
        [data-loadlink-vehicle-listing-shell="working-guided-flow-v11"] #listing-form #vehicle-marketplace {
          display: none !important;
        }
        [data-loadlink-vehicle-listing-shell="working-guided-flow-v11"] #vehicle-listing-form {
          padding-bottom: max(118px, calc(env(safe-area-inset-bottom) + 94px)) !important;
        }
        [data-loadlink-vehicle-listing-shell="working-guided-flow-v11"] #vehicle-listing-form > section[hidden] {
          display: none !important;
        }
        [data-loadlink-vehicle-listing-shell="working-guided-flow-v11"] #vehicle-listing-form > section[data-loadlink-wizard-active="true"] {
          scroll-margin-top: 178px;
        }
        [data-loadlink-vehicle-listing-shell="working-guided-flow-v11"] #vehicle-listing-form > section[data-loadlink-wizard-step="1"] {
          border-radius: 24px !important;
          box-shadow: 0 18px 55px rgba(0,0,0,.08);
        }
        [data-loadlink-vehicle-listing-shell="working-guided-flow-v11"] #vehicle-listing-form > section[data-loadlink-wizard-step="1"] figure {
          display: none !important;
        }
        [data-loadlink-vehicle-listing-shell="working-guided-flow-v11"] input,
        [data-loadlink-vehicle-listing-shell="working-guided-flow-v11"] select,
        [data-loadlink-vehicle-listing-shell="working-guided-flow-v11"] textarea {
          font-size: 16px !important;
          font-family: inherit !important;
        }
        [data-loadlink-vehicle-listing-shell="working-guided-flow-v11"] select {
          -webkit-appearance: none !important;
          appearance: none !important;
          border-radius: 16px !important;
          padding-right: 3rem !important;
          background-image:
            linear-gradient(45deg, transparent 50%, currentColor 50%),
            linear-gradient(135deg, currentColor 50%, transparent 50%) !important;
          background-position:
            calc(100% - 18px) 50%,
            calc(100% - 13px) 50% !important;
          background-size: 5px 5px, 5px 5px !important;
          background-repeat: no-repeat !important;
        }
      `}</style>
    </main>
  );
}
