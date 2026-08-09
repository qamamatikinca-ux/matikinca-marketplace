"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import SiteMenu from "@/components/SiteMenu";
import { isAuthenticatedUser, loginHref } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Subscription = { id:string; plan_code:string; status:string; starts_at?:string|null; renews_at?:string|null; ends_at?:string|null; created_at:string };
type Access = { id:string; expires_at:string; consumed_at?:string|null; consumed_listing_id?:string|null };
type Bill = { id:string; item_type:string; item_code?:string|null; amount_cents:number; status:string; reference?:string|null; created_at:string };

export default function PackageStatusPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription|null>(null);
  const [access, setAccess] = useState<Access[]>([]);
  const [billing, setBilling] = useState<Bill[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isAuthenticatedUser(user)) { window.location.assign(loginHref("/account/packages")); return; }
      const [subs, accessRows, billRows] = await Promise.all([
        supabase.from("user_subscriptions").select("*").order("created_at",{ascending:false}).limit(1),
        supabase.from("listing_access_periods").select("*").order("created_at",{ascending:false}).limit(20),
        supabase.from("billing_history").select("*").order("created_at",{ascending:false}).limit(8),
      ]);
      const firstError = [subs.error, accessRows.error, billRows.error].find(Boolean);
      if (firstError) setMessage("Some access information could not be loaded. Refresh to try again.");
      setSubscription((subs.data?.[0] as Subscription|undefined)||null);
      setAccess((accessRows.data||[]) as Access[]);
      setBilling((billRows.data||[]) as Bill[]);
      setLoading(false);
    })();
  }, []);

  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const activeAccess = access.find((row)=>!row.consumed_at && new Date(row.expires_at)>new Date());
  const activeSubscription = subscription?.status === "active";
  const plan = activeSubscription ? subscription?.plan_code === "dealer" ? "Dealer" : "Pro" : activeAccess ? "Manual listing" : "Standard";
  const planNote = activeSubscription
    ? subscription?.plan_code === "dealer" ? "Your dealership and vehicle tools are active." : "Your Pro vehicle and analytics tools are active."
    : activeAccess ? `Manual vehicle access available until ${shortDate(activeAccess.expires_at)}.`
    : "Job posting and standard messaging remain available. Add vehicle access only when you need it.";
  const vehicleAccess = activeSubscription ? "Included" : activeAccess ? "Ready" : "Not active";
  const photoAllowance = activeSubscription ? "15 / listing" : activeAccess ? "5 / listing" : "With a vehicle plan";
  const analytics = activeSubscription ? "Included" : "Pro or Dealer";

  return <main className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4efe3] text-black"}>
    <header className={`sticky top-0 z-50 border-b ${darkMode?"border-white/10 bg-black":"border-black/10 bg-white"}`}>
      <div className="relative mx-auto flex h-20 max-w-6xl items-center px-4"><SiteMenu darkMode={darkMode}/><HomeLogoLink theme={darkMode?"dark":"light"} className="absolute left-1/2 -translate-x-1/2"/><LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="ml-auto"/></div>
    </header>

    <section className="mx-auto max-w-4xl px-5 py-8 md:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-5xl font-black tracking-[-.055em]">Your access</h1><p className={`mt-2 max-w-xl text-sm font-semibold leading-6 ${muted}`}>What you can use right now, and the next upgrade only if you need it.</p></div>
        <Link href="/packages#plan-guide" className="inline-flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black">Find my package</Link>
      </div>

      {loading ? <div className={`mt-7 h-80 animate-pulse rounded-[28px] border ${surface}`}/> : <>
        <section className={`mt-7 overflow-hidden rounded-[30px] border ${surface}`}>
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className={`text-xs font-black ${muted}`}>Current plan</p><h2 className="mt-1 text-5xl font-black tracking-[-.055em]">{plan}</h2><p className={`mt-3 max-w-xl text-sm font-semibold leading-6 ${muted}`}>{planNote}</p></div>
              <span className={`rounded-full px-4 py-2 text-xs font-black ${activeSubscription || activeAccess ? "bg-[#f6b800] text-black" : darkMode ? "bg-white/10 text-white" : "bg-black/5 text-black/60"}`}>{activeSubscription || activeAccess ? "Active" : "Base access"}</span>
            </div>

            <div className={`mt-7 divide-y rounded-2xl border ${darkMode ? "divide-white/10 border-white/10" : "divide-black/10 border-black/10"}`}>
              <AccessRow label="Messages" value={activeSubscription ? "Unlimited" : "50 / day"} note={activeSubscription ? "Included with your subscription" : "Standard allowance"}/>
              <AccessRow label="Vehicle listings" value={vehicleAccess} note={activeSubscription ? "Included in your plan" : activeAccess ? "Manual access is ready" : "Choose Manual, Pro or Dealer when you want to list"}/>
              <AccessRow label="Photos" value={photoAllowance} note="Per vehicle listing"/>
              <AccessRow label="Analytics" value={analytics} note={activeSubscription ? "Listing performance tools available" : "Upgrade only if you need performance data"}/>
            </div>
          </div>
          <div className={`grid gap-2 border-t p-4 sm:grid-cols-2 ${darkMode ? "border-white/10" : "border-black/10"}`}>
            <Link href="/packages" className="flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black">Compare packages</Link>
            <Link href="/list-your-vehicle" className={`flex h-12 items-center justify-center rounded-xl border px-5 text-sm font-black ${darkMode?"border-white/15":"border-black/10"}`}>List a vehicle</Link>
          </div>
        </section>

        <details className={`mt-5 overflow-hidden rounded-[24px] border ${surface}`}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5"><div><h2 className="text-xl font-black">Recent payments</h2><p className={`mt-1 text-xs font-semibold ${muted}`}>{billing.length ? `${billing.length} recent ${billing.length === 1 ? "entry" : "entries"}` : "No package payments yet"}</p></div><span className="text-xl">⌄</span></summary>
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
