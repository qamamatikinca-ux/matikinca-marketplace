"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getVehicleListingAccess, type LoadLinkPlan, requestManualListingPayment, requestSubscription } from "@/lib/packageAccess";

export default function VehicleListingAccess({
  darkMode,
  onGranted,
}: {
  darkMode: boolean;
  onGranted: (plan: LoadLinkPlan) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState<"manual" | "pro" | "dealer" | null>(null);
  const [message, setMessage] = useState("");
  const [schemaReady, setSchemaReady] = useState(true);
  const total = useMemo(() => days * 15, [days]);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const access = await getVehicleListingAccess();
      setSchemaReady(access.schemaReady);
      if (access.allowed && access.plan) onGranted(access.plan);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not check your listing access.");
    } finally {
      setLoading(false);
    }
  }, [onGranted]);

  useEffect(() => { void check(); }, [check]);

  async function requestManual() {
    setBusy("manual");
    setMessage("");
    try {
      const result = await requestManualListingPayment(days);
      setMessage(`Payment request ${result.reference} was created for R${(result.amount_cents / 100).toFixed(2)}. Your listing unlocks automatically as soon as the payment is marked paid.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create the payment request.");
    } finally {
      setBusy(null);
    }
  }

  async function requestPlan(plan: "pro" | "dealer") {
    setBusy(plan);
    setMessage("");
    try {
      const result = await requestSubscription(plan);
      setMessage(`${plan === "dealer" ? "Dealer" : "Pro"} request ${result.reference} was created. Access activates after payment${plan === "dealer" ? " and dealership approval" : ""}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create the upgrade request.");
    } finally {
      setBusy(null);
    }
  }

  const surface = darkMode ? "border-white/10 bg-[#0d0d0d] text-white" : "border-black/10 bg-white text-black";
  const muted = darkMode ? "text-white/55" : "text-black/55";

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <div className={`border p-5 md:p-7 ${surface}`}>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b88900]">Vehicle listing access</p>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] md:text-5xl">Choose how you want to list</h2>
        <p className={`mt-3 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>Job posts remain free. Vehicle listings require a paid manual listing, Pro subscription or approved Dealer bundle.</p>

        {!schemaReady ? (
          <div className="mt-6 border border-red-500/40 bg-red-500/10 p-4 text-sm font-bold leading-6">The package database migration has not been installed yet. Run <strong>LOADLINK-PACKAGES-DEALERSHIPS.sql</strong> in Supabase before accepting paid listings.</div>
        ) : null}

        {loading ? <div className={`mt-6 border p-5 text-sm font-bold ${muted}`}>Checking your current package…</div> : (
          <div className="mt-7 grid gap-4 lg:grid-cols-3">
            <article className={`border p-5 ${surface}`}>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#b88900]">Manual listing</p>
              <h3 className="mt-2 text-3xl font-black">R15 <span className="text-sm">per day</span></h3>
              <p className={`mt-3 text-sm leading-6 ${muted}`}>One vehicle listing, up to 5 photos, 50 messages per day and standard visibility.</p>
              <label className="mt-5 block text-xs font-black uppercase tracking-wide">Number of days
                <input type="number" min={1} max={365} value={days} onChange={(event) => setDays(Math.max(1, Math.min(365, Number(event.target.value) || 1)))} className={`mt-2 h-12 w-full border px-4 text-base font-black outline-none focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-black text-white" : "border-black/15 bg-[#faf8f2] text-black"}`} />
              </label>
              <div className="mt-3 flex items-center justify-between border-y border-current/10 py-3 text-sm font-bold"><span>Total</span><strong>R{total}</strong></div>
              <button type="button" disabled={Boolean(busy) || !schemaReady} onClick={() => void requestManual()} className="mt-5 h-12 w-full border border-[#f6b800] bg-[#f6b800] px-4 text-xs font-black uppercase tracking-wide text-black disabled:opacity-50">{busy === "manual" ? "Creating request…" : "Continue with manual"}</button>
            </article>

            <article className={`border p-5 ${surface}`}>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#b88900]">Pro</p>
              <h3 className="mt-2 text-3xl font-black">R399 <span className="text-sm">per month</span></h3>
              <p className={`mt-3 text-sm leading-6 ${muted}`}>Unlimited listings, 15 photos, unlimited messages, analytics, better visibility and featured credits.</p>
              <button type="button" disabled={Boolean(busy) || !schemaReady} onClick={() => void requestPlan("pro")} className="mt-5 h-12 w-full border border-[#f6b800] px-4 text-xs font-black uppercase tracking-wide text-[#b88900] disabled:opacity-50">{busy === "pro" ? "Creating request…" : "Request Pro"}</button>
            </article>

            <article className={`border border-[#f6b800] p-5 ${darkMode ? "bg-[#0d0d0d] text-white" : "bg-[#fff9e7] text-black"}`}>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#b88900]">Dealer</p>
              <h3 className="mt-2 text-3xl font-black">R2,999 <span className="text-sm">per month</span></h3>
              <p className={`mt-3 text-sm leading-6 ${muted}`}>Everything in Pro plus a public dealership page, followers, updates, staff access, inventory, leads and dealer promotion tools.</p>
              <button type="button" disabled={Boolean(busy) || !schemaReady} onClick={() => void requestPlan("dealer")} className="mt-5 h-12 w-full border border-[#f6b800] bg-black px-4 text-xs font-black uppercase tracking-wide text-[#f6b800] disabled:opacity-50">{busy === "dealer" ? "Creating request…" : "Apply for Dealer"}</button>
            </article>
          </div>
        )}

        {message ? <p className={`mt-5 border border-[#f6b800]/40 bg-[#f6b800]/10 p-4 text-sm font-bold leading-6 ${darkMode ? "text-white" : "text-black"}`}>{message}</p> : null}
        <div className="mt-5 flex flex-wrap gap-4 text-xs font-black uppercase tracking-wide"><button type="button" onClick={() => void check()} className="text-[#b88900]">Check payment status</button><Link href="/packages" className="text-[#b88900]">Compare all benefits</Link></div>
      </div>
    </section>
  );
}
