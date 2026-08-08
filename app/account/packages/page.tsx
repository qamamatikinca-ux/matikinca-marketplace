"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import HomeLogoLink from "@/components/HomeLogoLink";
import SiteMenu from "@/components/SiteMenu";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import { isAuthenticatedUser, loginHref } from "@/lib/auth";
import { getVehicleListingAccess, type PackageAccess } from "@/lib/packageAccess";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Bill = {
  id: string;
  item_type: string;
  item_code?: string | null;
  amount_cents: number;
  status: string;
  reference?: string | null;
  created_at: string;
};

export default function PackageStatusPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<PackageAccess | null>(null);
  const [billing, setBilling] = useState<Bill[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isAuthenticatedUser(user)) {
        window.location.assign(loginHref("/account/packages"));
        return;
      }

      try {
        const [vehicleAccess, billRows] = await Promise.all([
          getVehicleListingAccess(),
          supabase.from("billing_history").select("id,item_type,item_code,amount_cents,status,reference,created_at").order("created_at", { ascending: false }).limit(20),
        ]);
        setAccess(vehicleAccess);
        setBilling((billRows.data || []) as Bill[]);
        if (billRows.error) setMessage(billRows.error.message);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not load your current access.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/52" : "text-black/52";
  const soft = darkMode ? "border-white/10 bg-white/[.035]" : "border-black/10 bg-black/[.025]";

  const plan = access?.plan || null;
  const planName = plan === "dealer" ? "Dealer" : plan === "pro" ? "Pro" : plan === "manual" ? "Manual listing" : "Standard";
  const premiumMessaging = plan === "pro" || plan === "dealer";
  const messaging = premiumMessaging ? "Unlimited" : "50 / day";
  const vehicleAccess = access?.allowed
    ? plan === "manual"
      ? "Manual listing active"
      : "Vehicle listing access"
    : "Not active";
  const photos = access?.allowed ? `${Math.max(0, access.photoLimit)} / listing` : "Unlock with a listing plan";
  const analytics = access?.analyticsEnabled ? "Advanced analytics" : "Standard insights";
  const visibility = access?.featuredEnabled ? "Featured eligible" : "Standard visibility";
  const expiry = access?.expiresAt ? formatDate(access.expiresAt) : premiumMessaging ? "Subscription managed in billing" : "No active listing expiry";

  const statusTone = access?.allowed || premiumMessaging
    ? "bg-emerald-500/12 text-emerald-500"
    : darkMode ? "bg-white/[.06] text-white/55" : "bg-black/[.05] text-black/55";

  const benefitRows = useMemo(() => [
    ["Messaging", messaging],
    ["Vehicle listings", vehicleAccess],
    ["Photos", photos],
    ["Analytics", analytics],
    ["Visibility", visibility],
  ], [messaging, vehicleAccess, photos, analytics, visibility]);

  return (
    <main className={`min-h-screen ${page}`}>
      <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
        <div className="relative mx-auto flex h-[72px] max-w-6xl items-center px-4 sm:px-5">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 sm:left-5"><SiteMenu darkMode={darkMode} /></div>
          <HomeLogoLink theme="auto" showGlow={false} className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center" logoClassName="w-[126px] sm:w-[142px]" />
          <LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="absolute right-4 top-1/2 -translate-y-1/2 sm:right-5" />
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-7 sm:px-5 md:px-8 md:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-[-.025em] md:text-3xl">Your access</h1>
            <p className={`mt-1.5 max-w-xl text-sm leading-6 ${muted}`}>A clear view of your current LoadLink plan, messaging and vehicle-listing access.</p>
          </div>
          {!loading ? <span className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${statusTone}`}>{access?.allowed || premiumMessaging ? "Active access" : "Standard account"}</span> : null}
        </div>

        {loading ? (
          <div className={`mt-6 rounded-2xl border p-5 text-sm font-medium ${surface} ${muted}`}>Checking your current access…</div>
        ) : (
          <>
            <section className={`mt-6 overflow-hidden rounded-[26px] border ${surface}`}>
              <div className="grid gap-0 md:grid-cols-[1.05fr_.95fr]">
                <div className="p-5 md:p-7">
                  <p className={`text-[10px] font-semibold uppercase tracking-[.12em] ${muted}`}>Current plan</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <h2 className="text-3xl font-bold tracking-[-.03em]">{planName}</h2>
                    {plan ? <span className="rounded-full bg-[#f6b800] px-2.5 py-1 text-[9px] font-semibold text-black">{plan === "manual" ? "Paid listing" : "Subscription"}</span> : null}
                  </div>
                  <p className={`mt-3 text-sm leading-6 ${muted}`}>{plan === "dealer" ? "Dealer tools, advanced analytics and unlimited daily messaging are enabled." : plan === "pro" ? "Pro analytics, vehicle listing access and unlimited daily messaging are enabled." : plan === "manual" ? "Your paid manual vehicle-listing access is active. Standard messaging remains 50 messages per day." : "You can browse, post jobs and use standard messaging. Vehicle listings require Manual, Pro or Dealer access."}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link href="/packages" className="rounded-xl bg-[#f6b800] px-4 py-2.5 text-[11px] font-semibold text-black">Compare plans</Link>
                    <Link href="/list-your-vehicle" className={`rounded-xl border px-4 py-2.5 text-[11px] font-semibold ${darkMode ? "border-white/15 text-white" : "border-black/12 text-black"}`}>{access?.allowed ? "List a vehicle" : "Unlock vehicle listing"}</Link>
                  </div>
                </div>

                <div className={`grid grid-cols-2 gap-px border-t md:border-l md:border-t-0 ${darkMode ? "border-white/10 bg-white/10" : "border-black/10 bg-black/10"}`}>
                  <AccessStat darkMode={darkMode} label="Messages" value={messaging} note={premiumMessaging ? "No daily cap" : "Standard account allowance"} />
                  <AccessStat darkMode={darkMode} label="Photos" value={access?.allowed ? String(Math.max(0, access.photoLimit)) : "0"} note={access?.allowed ? "Per vehicle listing" : "No active vehicle plan"} />
                  <AccessStat darkMode={darkMode} label="Vehicle access" value={access?.allowed ? "Active" : "Locked"} note={plan === "manual" ? "Manual access" : plan === "pro" || plan === "dealer" ? planName : "Choose a listing plan"} />
                  <AccessStat darkMode={darkMode} label="Analytics" value={access?.analyticsEnabled ? "Advanced" : "Standard"} note={access?.analyticsEnabled ? "Included" : "Upgrade for more"} />
                </div>
              </div>
            </section>

            <section className={`mt-4 rounded-2xl border p-4 md:p-5 ${surface}`}>
              <div className="flex items-center justify-between gap-3">
                <div><h2 className="text-base font-semibold">What you have now</h2><p className={`mt-1 text-xs ${muted}`}>These values come from LoadLink's current access rules.</p></div>
                <span className={`rounded-lg border px-2.5 py-1.5 text-[9px] font-semibold ${soft}`}>{expiry}</span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {benefitRows.map(([label, value]) => <div key={label} className={`rounded-xl border p-3 ${soft}`}><p className={`text-[9px] font-semibold uppercase tracking-[.08em] ${muted}`}>{label}</p><p className="mt-1.5 text-sm font-semibold leading-5">{value}</p></div>)}
              </div>
              {!access?.schemaReady ? <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-500">The package-access database function is not available yet, so vehicle-plan details may be incomplete until the package migration is installed.</p> : null}
            </section>

            <details className={`mt-4 overflow-hidden rounded-2xl border ${surface}`}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-sm font-semibold md:px-5"><span>Billing history</span><span className={`text-xs ${muted}`}>{billing.length ? `${billing.length} recent record${billing.length === 1 ? "" : "s"}` : "No payments yet"}</span></summary>
              <div className={`border-t ${darkMode ? "border-white/10" : "border-black/10"}`}>
                {billing.length ? billing.map((row) => (
                  <div key={row.id} className={`grid gap-2 border-b px-4 py-3 text-sm last:border-b-0 md:grid-cols-[1fr_auto_auto] md:items-center md:px-5 ${darkMode ? "border-white/10" : "border-black/10"}`}>
                    <div className="min-w-0"><p className="truncate font-semibold capitalize">{row.item_type.replaceAll("_", " ")}{row.item_code ? ` · ${row.item_code}` : ""}</p><p className={`mt-0.5 text-[10px] ${muted}`}>{row.reference || "No reference"} · {formatDate(row.created_at)}</p></div>
                    <strong className="text-sm">R{(row.amount_cents / 100).toFixed(2)}</strong>
                    <span className={`text-[9px] font-semibold uppercase ${row.status === "paid" ? "text-emerald-500" : muted}`}>{row.status}</span>
                  </div>
                )) : <p className={`px-4 py-5 text-sm ${muted}`}>No package payments are recorded on this account yet.</p>}
              </div>
            </details>
          </>
        )}

        {message ? <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-medium text-red-500">{message}</p> : null}
      </section>
    </main>
  );
}

function AccessStat({ darkMode, label, value, note }: { darkMode: boolean; label: string; value: string; note: string }) {
  return <div className={`${darkMode ? "bg-[#111]" : "bg-[#faf8f2]"} p-4 md:p-5`}><p className={`text-[9px] font-semibold uppercase tracking-[.08em] ${darkMode ? "text-white/45" : "text-black/45"}`}>{label}</p><p className="mt-1.5 text-xl font-bold">{value}</p><p className={`mt-1 text-[10px] font-medium ${darkMode ? "text-white/42" : "text-black/42"}`}>{note}</p></div>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
