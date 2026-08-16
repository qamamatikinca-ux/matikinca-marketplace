"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import VehicleMarketplaceHub from "@/components/VehicleMarketplaceHub";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { requestManualListingPayment } from "@/lib/packageAccess";
import { getLoadLinkIntelligence, requestLoadLinkPlan, startLoadLinkPayment } from "@/lib/loadlinkIntelligence";
import { getFreshAuthenticatedUser } from "@/lib/reliableSupabase";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import LegacyVehicleListingPage from "./LegacyVehicleListingPage";

type EntryMode = "vehicle" | "mobile-unit" | "";
type ListingPackage = "standard" | "pro" | "dealer";

type AccessState = {
  checked: boolean;
  authenticated: boolean;
  canPost: boolean;
  packageType: ListingPackage;
  accountReason: string;
  requestState: string;
  requestPlan: string;
};

const initialAccess: AccessState = {
  checked: false,
  authenticated: false,
  canPost: false,
  packageType: "standard",
  accountReason: "",
  requestState: "",
  requestPlan: "",
};

function seedLegacyListingAccess(packageType: ListingPackage) {
  try {
    const key = "loadlink-vehicle-draft-v1";
    const current = JSON.parse(localStorage.getItem(key) || "null") || {};
    localStorage.setItem(
      key,
      JSON.stringify({
        ...current,
        // selectedPlan is only the legacy form's internal render gate. packageType remains the
        // source of truth for listing limits, placement and submission data.
        selectedPlan: packageType === "dealer" ? "dealer" : "pro",
        packageType,
      }),
    );
  } catch {
    // A blocked localStorage write should not destroy the listing route.
  }
}

export default function ListYourVehiclePage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [booted, setBooted] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>("");
  const [dealershipRoute, setDealershipRoute] = useState(false);
  const [access, setAccess] = useState<AccessState>(initialAccess);
  const [manualDays, setManualDays] = useState(7);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  const page = darkMode ? "bg-black text-white" : "bg-[#fffaf0] text-black";
  const muted = darkMode ? "text-white/58" : "text-black/58";
  const surface = darkMode ? "border-white/12 bg-[#0b0b0b]" : "border-black/10 bg-white";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("entry");
    setEntryMode(requested === "vehicle" || requested === "mobile-unit" ? requested : "");
    setDealershipRoute(Boolean(params.get("dealership")));
    setBooted(true);
  }, []);

  async function refreshAccess(mode: EntryMode) {
    if (!mode) return;
    setNotice("");
    try {
      const user = await getFreshAuthenticatedUser();
      if (!user) {
        const returnTo = `/list-your-vehicle?entry=${mode}`;
        window.location.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }

      const intelligence = await getLoadLinkIntelligence();
      const packageType: ListingPackage = intelligence.plan === "dealer" ? "dealer" : intelligence.plan === "pro" ? "pro" : "standard";
      const canPost = Boolean(intelligence.capabilities?.can_post_vehicle);

      if (canPost) seedLegacyListingAccess(packageType);

      setAccess({
        checked: true,
        authenticated: true,
        canPost,
        packageType,
        accountReason: String(intelligence.account_reason || ""),
        requestState: String(intelligence.plan_request_state || ""),
        requestPlan: String(intelligence.plan_request_plan || ""),
      });
    } catch (error) {
      setAccess((current) => ({ ...current, checked: true, authenticated: true }));
      setNotice(error instanceof Error ? error.message : "LoadLink could not check your listing access right now.");
    }
  }

  useEffect(() => {
    if (!booted || dealershipRoute || !entryMode) return;
    void refreshAccess(entryMode);
  }, [booted, dealershipRoute, entryMode]);

  async function chooseSubscription(plan: "pro" | "dealer") {
    if (busy) return;
    setBusy(plan);
    setNotice("");
    try {
      await requestLoadLinkPlan(plan);
      const fresh = await getLoadLinkIntelligence();
      const paymentReady = ["approved_for_payment", "payment_pending", "payment_failed", "payment_syncing"].includes(String(fresh.plan_request_state));
      if (paymentReady && fresh.plan_request_id) {
        const payment = await startLoadLinkPayment(fresh.plan_request_id);
        window.location.assign(payment.authorization_url);
        return;
      }
      setNotice(
        fresh.plan_request_state === "under_review"
          ? `Your ${plan === "dealer" ? "Dealer" : "Pro"} request is under review.`
          : "Your package request has been received.",
      );
      await refreshAccess(entryMode);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "LoadLink could not submit that package request.");
    } finally {
      setBusy("");
    }
  }

  async function chooseManual() {
    if (busy) return;
    setBusy("manual");
    setNotice("");
    try {
      const result = await requestManualListingPayment(manualDays);
      setNotice(`Manual listing request ${result.reference} created for R${(result.amount_cents / 100).toFixed(2)}.`);
      await refreshAccess(entryMode);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "LoadLink could not create the Manual listing request.");
    } finally {
      setBusy("");
    }
  }

  if (!booted) {
    return <LoadLinkLoading />;
  }

  // Dealership inventory routes keep their established dealer-specific listing behaviour.
  if (dealershipRoute) return <LegacyVehicleListingPage />;

  if (!entryMode) {
    return (
      <main className={`min-h-screen ${page}`} data-loadlink-vehicle-portal="drivers-style-v1">
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

            <div className="mx-auto mt-7 grid w-full max-w-[640px] gap-3">
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

  if (!access.checked) {
    return (
      <main className={`min-h-screen ${page}`}>
        <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
        <LoadLinkLoading />
      </main>
    );
  }

  if (!access.canPost) {
    return (
      <main className={`min-h-screen ${page}`} data-loadlink-listing-access="compact-v1">
        <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
        <section className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-6 md:py-12">
          <Link href="/list-your-vehicle" className={`text-xs font-black uppercase tracking-[.12em] ${muted}`}>← Back to vehicles</Link>
          <div className={`mt-5 rounded-[26px] border p-5 sm:p-7 ${surface}`}>
            <p className={`text-[10px] font-black uppercase tracking-[.14em] ${muted}`}>Listing access</p>
            <h1 className="mt-2 text-[34px] font-black leading-none tracking-[-.05em] sm:text-[44px]">Choose how you want to list.</h1>
            <p className={`mt-3 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>
              Your vehicle details are not started until access is ready. Pick one option and LoadLink will return you to the listing flow when it is active.
            </p>

            {access.accountReason ? <p className="mt-4 rounded-xl border border-current/10 px-4 py-3 text-xs font-bold">{access.accountReason}</p> : null}
            {notice ? <p className="mt-4 rounded-xl border border-current/10 px-4 py-3 text-xs font-bold" role="status">{notice}</p> : null}

            <div className="mt-6 grid gap-3">
              <div className={`rounded-2xl border p-4 ${darkMode ? "border-white/10" : "border-black/10"}`}>
                <div className="flex items-center justify-between gap-4">
                  <div><h2 className="text-lg font-black">Manual</h2><p className={`mt-1 text-xs font-semibold ${muted}`}>R15 per vehicle / day · up to 5 photos</p></div>
                  <label className="w-20 text-[10px] font-black uppercase tracking-[.08em]">Days<input type="number" min={1} max={365} value={manualDays} onChange={(event) => setManualDays(Math.max(1, Math.min(365, Number(event.target.value) || 1)))} className={`mt-1 h-10 w-full rounded-lg border px-2 text-base font-black outline-none ${darkMode ? "border-white/15 bg-black" : "border-black/10 bg-white"}`} /></label>
                </div>
                <button type="button" disabled={Boolean(busy)} onClick={() => void chooseManual()} className="mt-4 h-12 w-full rounded-xl bg-[#f6b800] text-sm font-black text-black disabled:opacity-45">{busy === "manual" ? "Working…" : "Choose Manual"}</button>
              </div>

              <button type="button" disabled={Boolean(busy)} onClick={() => void chooseSubscription("pro")} className={`min-h-16 rounded-2xl border px-5 text-left transition disabled:opacity-45 ${darkMode ? "border-white/15 bg-black" : "border-black/10 bg-white"}`}>
                <span className="block text-lg font-black">Pro · R399 / month</span><span className={`mt-1 block text-xs font-semibold ${muted}`}>{busy === "pro" ? "Working…" : "Regular vehicle advertising, up to 15 photos and Pro tools."}</span>
              </button>
              <button type="button" disabled={Boolean(busy)} onClick={() => void chooseSubscription("dealer")} className={`min-h-16 rounded-2xl border px-5 text-left transition disabled:opacity-45 ${darkMode ? "border-white/15 bg-black" : "border-black/10 bg-white"}`}>
                <span className="block text-lg font-black">Dealer · R2 999 / month</span><span className={`mt-1 block text-xs font-semibold ${muted}`}>{busy === "dealer" ? "Working…" : "Dealership inventory, showroom, team and sales tools."}</span>
              </button>
            </div>

            {(access.requestState || access.requestPlan) ? <p className={`mt-5 text-xs font-semibold ${muted}`}>Current request: {[access.requestPlan, access.requestState].filter(Boolean).join(" · ")}</p> : null}
          </div>
        </section>
      </main>
    );
  }

  return (
    <div data-loadlink-vehicle-listing-shell="direct-v1">
      <LegacyVehicleListingPage />
      <style jsx global>{`
        [data-loadlink-vehicle-listing-shell="direct-v1"] main > section:first-of-type {
          display: none !important;
        }
        [data-loadlink-vehicle-listing-shell="direct-v1"] #plans {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
