"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import LoadLinkIcon from "@/components/LoadLinkIcon";
import { isAuthenticatedUser, loginHref } from "@/lib/auth";
import { getVehicleListingAccess, type PackageAccess } from "@/lib/packageAccess";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Bill = { id:string; item_type:string; item_code?:string|null; amount_cents:number; status:string; reference?:string|null; created_at:string };

const baseAccess: PackageAccess = {
  allowed: false,
  plan: null,
  source: null,
  activeListingLimit: 0,
  activeManualListings: 0,
  photoLimit: 0,
  dailyMessageLimit: 50,
  analyticsEnabled: false,
  featuredEnabled: false,
  schemaReady: true,
};

export default function PackageStatusPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<PackageAccess>(baseAccess);
  const [billing, setBilling] = useState<Bill[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isAuthenticatedUser(user)) { window.location.assign(loginHref("/account/packages")); return; }

      const [liveAccess, billRows] = await Promise.all([
        getVehicleListingAccess().catch(() => null),
        supabase.from("billing_history").select("*").order("created_at",{ascending:false}).limit(8),
      ]);

      if (liveAccess) setAccess(liveAccess);
      else setMessage("Your live package permissions could not be loaded. Refresh to try again.");
      if (billRows.error) setMessage((current) => current || "Some billing information could not be loaded. Refresh to try again.");
      setBilling((billRows.data||[]) as Bill[]);
      setLoading(false);
    })();
  }, []);

  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const currentPlan = access.plan === "dealer" ? "Dealer" : access.plan === "pro" ? "Pro" : access.plan === "manual" ? "Manual" : "Standard";
  const activePaidAccess = Boolean(access.plan && access.allowed);
  const messageLimit = access.dailyMessageLimit === null ? "Unlimited" : `${access.dailyMessageLimit || 50} / day`;
  const vehicleAccess = access.allowed ? "Active" : "Not active";
  const photoAllowance = access.allowed && access.photoLimit > 0 ? `${access.photoLimit} / listing` : "With a vehicle plan";
  const analytics = access.analyticsEnabled ? "Included" : "Not included";
  const featured = access.featuredEnabled ? "Included" : "Not included";
  const listingLimit = access.activeListingLimit === null ? "Unlimited" : access.activeListingLimit > 0 ? String(access.activeListingLimit) : "—";

  const planNote = currentPlan === "Dealer"
    ? "Your Dealer tools, dealership access and vehicle listing permissions are active."
    : currentPlan === "Pro"
      ? "Your Pro vehicle listing and performance tools are active."
      : currentPlan === "Manual"
        ? access.expiresAt ? `Your manual vehicle access is active until ${shortDate(access.expiresAt)}.` : "Your manual vehicle listing access is active."
        : "Job posting and standard messaging are available. Vehicle listing access is added only when you choose a vehicle plan.";

  const primaryHref = currentPlan === "Dealer" ? "/dealer" : currentPlan === "Pro" ? "/packages" : "/packages#plan-guide";
  const primaryLabel = currentPlan === "Dealer" ? "Manage dealership" : currentPlan === "Pro" ? "Manage or compare plan" : "Find my package";

  return <main className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4efe3] text-black"}>
    <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

    <section className="mx-auto max-w-4xl px-5 py-8 md:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-5xl font-black tracking-[-.055em]">Your access</h1><p className={`mt-2 max-w-xl text-sm font-semibold leading-6 ${muted}`}>Your current LoadLink permissions, based on the plan active on your account right now.</p></div>
        <Link href={primaryHref} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black"><span>{primaryLabel}</span><LoadLinkIcon name="chevronRight" size={17}/></Link>
      </div>

      {loading ? <div className={`mt-7 h-80 animate-pulse rounded-[28px] border ${surface}`}/> : <>
        <section className={`mt-7 overflow-hidden rounded-[30px] border ${surface}`}>
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className={`text-xs font-black ${muted}`}>Current plan</p><h2 className="mt-1 text-5xl font-black tracking-[-.055em]">{currentPlan}</h2><p className={`mt-3 max-w-xl text-sm font-semibold leading-6 ${muted}`}>{planNote}</p></div>
              <span className={`rounded-full px-4 py-2 text-xs font-black ${activePaidAccess ? "bg-[#f6b800] text-black" : darkMode ? "bg-white/10 text-white" : "bg-black/5 text-black/60"}`}>{activePaidAccess ? "Active" : "Base access"}</span>
            </div>

            <div className={`mt-7 divide-y rounded-2xl border ${darkMode ? "divide-white/10 border-white/10" : "divide-black/10 border-black/10"}`}>
              <AccessRow label="Messages" value={messageLimit} note={access.dailyMessageLimit === null ? "No daily message cap on this plan" : "Daily messaging allowance"}/>
              <AccessRow label="Vehicle listings" value={vehicleAccess} note={access.allowed ? `Live access from ${access.source === "subscription" ? "your subscription" : "manual access"}` : "Choose Manual, Pro or Dealer to list vehicles"}/>
              <AccessRow label="Active listing limit" value={listingLimit} note="Applies to the currently active vehicle access"/>
              <AccessRow label="Photos" value={photoAllowance} note="Per vehicle listing"/>
              <AccessRow label="Analytics" value={analytics} note={access.analyticsEnabled ? "Listing performance tools are available" : "Available with an eligible plan"}/>
              <AccessRow label="Featured tools" value={featured} note={access.featuredEnabled ? "Featured listing tools are enabled" : "Not enabled on your current access"}/>
            </div>

            {!access.schemaReady ? <p className="mt-4 rounded-xl border border-[#f6b800]/25 bg-[#f6b800]/10 px-4 py-3 text-xs font-bold">LoadLink could not verify the package-access service. No paid access is being assumed until it is verified.</p> : null}
          </div>
          <div className={`grid gap-2 border-t p-4 sm:grid-cols-2 ${darkMode ? "border-white/10" : "border-black/10"}`}>
            <Link href={currentPlan === "Dealer" ? "/dealer" : "/packages"} className="flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black">{currentPlan === "Dealer" ? "Manage dealership" : currentPlan === "Pro" ? "Compare plans" : "View packages"}</Link>
            <Link href="/list-your-vehicle" className={`flex h-12 items-center justify-center rounded-xl border px-5 text-sm font-black ${darkMode?"border-white/15":"border-black/10"}`}>List a vehicle</Link>
          </div>
        </section>

        <details className={`mt-5 overflow-hidden rounded-[24px] border ${surface}`}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5"><div><h2 className="text-xl font-black">Recent payments</h2><p className={`mt-1 text-xs font-semibold ${muted}`}>{billing.length ? `${billing.length} recent ${billing.length === 1 ? "entry" : "entries"}` : "No package payments yet"}</p></div><LoadLinkIcon name="chevronDown" size={20}/></summary>
          {billing.length ? <div className={`divide-y border-t ${darkMode ? "divide-white/10 border-white/10" : "divide-black/10 border-black/10"}`}>{billing.map((row)=><div key={row.id} className="grid gap-2 p-4 text-sm sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-black capitalize">{row.item_type.replaceAll("_"," ")}{row.item_code?` — ${row.item_code}`:""}</p><p className={`mt-1 text-xs ${muted}`}>{row.reference||"No reference"} · {shortDate(row.created_at)}</p></div><div className="sm:text-right"><strong>R{(row.amount_cents/100).toFixed(2)}</strong><p className={`mt-1 text-[10px] font-black uppercase ${row.status === "paid" ? "text-emerald-500" : muted}`}>{row.status}</p></div></div>)}</div> : null}
        </details>
      </>}

      {message?<p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold">{message}</p>:null}
    </section>
  </main>;
}

function AccessRow({label,value,note}:{label:string;value:string;note:string}) {
  return <div className="grid gap-1 px-4 py-4 sm:grid-cols-[150px_1fr_auto] sm:items-center sm:gap-4"><p className="text-xs font-black opacity-45">{label}</p><p className="text-xs font-semibold opacity-50">{note}</p><p className="text-lg font-black sm:text-right">{value}</p></div>;
}
function shortDate(value:string){return new Date(value).toLocaleDateString("en-ZA",{day:"numeric",month:"short",year:"numeric"})}
