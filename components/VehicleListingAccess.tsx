"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { isAuthenticatedUser, loginHref } from "@/lib/auth";
import { getVehicleListingAccess, type LoadLinkPlan, requestSubscription } from "@/lib/packageAccess";
import { supabase } from "@/lib/supabaseClient";

export default function VehicleListingAccess({
  darkMode,
  onGranted,
}: {
  darkMode: boolean;
  onGranted: (plan: LoadLinkPlan) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"manual" | "pro" | "dealer" | null>(null);
  const [message, setMessage] = useState("");
  const [schemaReady, setSchemaReady] = useState(true);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const access = await getVehicleListingAccess();
      setSchemaReady(access.schemaReady);
      if (access.allowed && access.plan) onGranted(access.plan);
    } catch {
      setMessage("Your current package could not be checked. Refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, [onGranted]);

  useEffect(() => { void check(); }, [check]);

  async function requireAccount() {
    const { data: { user } } = await supabase.auth.getUser();
    if (isAuthenticatedUser(user)) return true;
    window.location.assign(loginHref("/packages#activate-plan"));
    return false;
  }

  async function requestPlan(plan: "pro" | "dealer") {
    if (!(await requireAccount())) return;
    setBusy(plan);
    setMessage("");
    try {
      const result = await requestSubscription(plan);
      setMessage(`${plan === "dealer" ? "Dealer" : "Pro"} request ${result.reference} created for R${(result.amount_cents / 100).toFixed(2)}. Access activates after payment${plan === "dealer" ? " and dealership approval" : ""}.`);
    } catch {
      setMessage("The package request could not be created. Try again.");
    } finally {
      setBusy(null);
    }
  }

  const surface = darkMode ? "border-white/10 bg-[#0b0b0b] text-white" : "border-black/10 bg-white text-black";
  const muted = darkMode ? "text-white/55" : "text-black/55";

  return (
    <section id="activate-plan" className="mx-auto w-full max-w-6xl px-4 pb-10 md:px-6">
      <div className={`overflow-hidden rounded-[30px] border ${surface}`}>
        <div className="p-5 md:p-7">
          <h2 className="text-3xl font-black tracking-[-.045em] md:text-4xl">Activate or upgrade</h2>
          <p className={`mt-2 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>Choose the access you want. LoadLink creates the correct payment request and keeps the listing rules tied to that package.</p>

          {!schemaReady ? <div className="mt-5 rounded-xl border border-red-500/35 bg-red-500/10 p-4 text-sm font-bold">Package payments are temporarily unavailable. Please check again later.</div> : null}

          {loading ? <div className={`mt-6 h-40 animate-pulse rounded-2xl border ${darkMode ? "border-white/10 bg-white/[.03]" : "border-black/10 bg-black/[.03]"}`} /> : (
            <div className="mt-6 grid gap-3 lg:grid-cols-3">
              <article className={`rounded-[22px] border p-5 ${surface}`}>
                <div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-black">Manual listing</h3><p className={`mt-1 text-xs font-semibold ${muted}`}>One vehicle, only for the days you need.</p></div><strong className="text-xl">R15/day</strong></div>
                <p className={`mt-5 text-xs leading-5 ${muted}`}>R15 per vehicle for each active day. Check current payment availability on the packages page.</p>
                <Link href="/packages#manual-package" className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-[#f6b800] px-4 text-sm font-black text-black">View Manual pricing</Link>
              </article>

              <article className={`rounded-[22px] border p-5 ${surface}`}>
                <div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-black">Pro</h3><p className={`mt-1 text-xs font-semibold ${muted}`}>Regular vehicle listings, analytics and stronger visibility.</p></div><strong className="text-xl">R399/mo</strong></div>
                <ul className={`mt-5 space-y-2 text-xs font-semibold leading-5 ${muted}`}><li>15 photos per listing</li><li>Unlimited vehicle listings and messages</li><li>Listing analytics and featured visibility</li></ul>
                <button type="button" disabled={Boolean(busy) || !schemaReady} onClick={() => void requestPlan("pro")} className="mt-5 h-12 w-full rounded-xl bg-[#f6b800] px-4 text-sm font-black text-black disabled:opacity-45">{busy === "pro" ? "Creating request…" : "Request Pro"}</button>
              </article>

              <article className={`rounded-[22px] border p-5 ${darkMode ? "border-[#f6b800]/50 bg-[#10100d]" : "border-[#f6b800]/55 bg-[#fffaf0]"}`}>
                <div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-black">Dealer</h3><p className={`mt-1 text-xs font-semibold ${muted}`}>Your public showroom, inventory, leads and staff tools.</p></div><strong className="text-xl">R2,999/mo</strong></div>
                <ul className={`mt-5 space-y-2 text-xs font-semibold leading-5 ${muted}`}><li>Everything in Pro</li><li>Public dealership showroom</li><li>Leads, followers, updates and staff access</li></ul>
                <button type="button" disabled={Boolean(busy) || !schemaReady} onClick={() => void requestPlan("dealer")} className="mt-5 h-12 w-full rounded-xl bg-[#f6b800] px-4 text-sm font-black text-black disabled:opacity-45">{busy === "dealer" ? "Creating request…" : "Request Dealer"}</button>
                <Link href="/dealership/loadlink-commercial-centurion" className={`mt-2 flex h-11 items-center justify-center rounded-xl border text-xs font-black ${darkMode ? "border-white/15" : "border-black/10"}`}>View dealership example</Link>
              </article>
            </div>
          )}

          {message ? <p className={`mt-5 rounded-xl border p-4 text-sm font-bold leading-6 ${darkMode ? "border-white/10 bg-white/[.03]" : "border-black/10 bg-[#faf8f2]"}`}>{message}</p> : null}
          <button type="button" onClick={() => void check()} className={`mt-4 text-xs font-black underline underline-offset-4 ${muted}`}>Check current payment status</button>
        </div>
      </div>
    </section>
  );
}
