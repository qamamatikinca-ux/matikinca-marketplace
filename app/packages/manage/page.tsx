"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { getLoadLinkIntelligence, getPaystackManagementLink, type LoadLinkIntelligenceState } from "@/lib/loadlinkIntelligence";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

const entitledStates = new Set(["active", "trial", "trialing", "grace_period", "cancelled"]);

export default function ManagePackagePage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [state, setState] = useState<LoadLinkIntelligenceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void getLoadLinkIntelligence().then(setState).catch(() => setNotice("LoadLink could not read your plan right now.")).finally(() => setLoading(false));
  }, []);

  async function manageBilling() {
    if (busy) return;
    setBusy(true); setNotice("");
    try {
      const response = await getPaystackManagementLink();
      window.location.assign(response.link);
    } catch {
      setNotice("Plan management is not available right now. Try again shortly.");
      setBusy(false);
    }
  }

  const plan = state?.plan === "dealer" && entitledStates.has(String(state.plan_state)) ? "dealer" : state?.plan === "pro" && entitledStates.has(String(state.plan_state)) ? "pro" : null;
  const page = darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4efe3] text-black";
  const surface = darkMode ? "border-white/12 bg-white/[.045]" : "border-black/10 bg-white/[.68]";
  const muted = darkMode ? "text-white/52" : "text-black/52";

  if (loading) return <main className={page}><LoadLinkLoading /></main>;

  return (
    <main className={page} data-loadlink-plan-manage="20260823">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <section className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 md:pt-12">
        <Link href="/packages" className={`text-xs font-black underline underline-offset-4 ${muted}`}>Back to packages</Link>
        <h1 className="mt-5 text-4xl font-black tracking-[-.055em] sm:text-5xl">{plan === "dealer" ? "Manage Dealer" : plan === "pro" ? "Manage Pro" : "Manage plan"}</h1>
        <p className={`mt-3 max-w-xl text-sm font-semibold leading-6 ${muted}`}>{plan === "dealer" ? "Choose whether you want to manage billing or open the dealership workspace." : "Plan billing and subscription controls stay here, separate from marketplace tools."}</p>

        {!state?.authenticated ? (
          <div className={`mt-7 rounded-[26px] border p-6 ${surface}`}><h2 className="text-xl font-black">Sign in to manage your plan</h2><Link href="/login?returnTo=%2Fpackages%2Fmanage" className={darkMode ? "mt-5 inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-black text-black" : "mt-5 inline-flex h-11 items-center rounded-full bg-black px-5 text-sm font-black text-white"}>Sign in</Link></div>
        ) : plan === "dealer" ? (
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <button type="button" onClick={() => void manageBilling()} disabled={busy} className={`min-h-[180px] rounded-[28px] border p-6 text-left backdrop-blur-2xl transition active:scale-[.99] disabled:opacity-45 ${surface}`}>
              <span className={`text-[10px] font-black uppercase tracking-[.12em] ${muted}`}>Billing</span><span className="mt-3 block text-2xl font-black">Manage plan</span><span className={`mt-2 block text-sm font-semibold leading-6 ${muted}`}>Open subscription and billing controls for the Dealer plan.</span><span className="mt-6 block text-xs font-black">{busy ? "Opening…" : "Continue →"}</span>
            </button>
            <Link href="/dealer" className={`min-h-[180px] rounded-[28px] border p-6 backdrop-blur-2xl transition active:scale-[.99] ${surface}`}>
              <span className={`text-[10px] font-black uppercase tracking-[.12em] ${muted}`}>Workspace</span><span className="mt-3 block text-2xl font-black">Go to dealership centre</span><span className={`mt-2 block text-sm font-semibold leading-6 ${muted}`}>Manage showroom, stock, statuses, leads, messages and dealership operations.</span><span className="mt-6 block text-xs font-black">Open Dealer →</span>
            </Link>
          </div>
        ) : plan === "pro" ? (
          <div className={`mt-7 rounded-[28px] border p-6 backdrop-blur-2xl ${surface}`}><span className={`text-[10px] font-black uppercase tracking-[.12em] ${muted}`}>Pro</span><h2 className="mt-3 text-2xl font-black">Manage plan</h2><p className={`mt-2 text-sm font-semibold leading-6 ${muted}`}>Open your billing and subscription controls.</p><button type="button" onClick={() => void manageBilling()} disabled={busy} className={darkMode ? "mt-6 h-12 rounded-full bg-white px-6 text-sm font-black text-black disabled:opacity-45" : "mt-6 h-12 rounded-full bg-black px-6 text-sm font-black text-white disabled:opacity-45"}>{busy ? "Opening…" : "Manage plan"}</button></div>
        ) : (
          <div className={`mt-7 rounded-[28px] border p-6 ${surface}`}><h2 className="text-xl font-black">No active Pro or Dealer plan</h2><p className={`mt-2 text-sm font-semibold ${muted}`}>Choose a package before opening plan management.</p><Link href="/packages" className={darkMode ? "mt-5 inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-black text-black" : "mt-5 inline-flex h-11 items-center rounded-full bg-black px-5 text-sm font-black text-white"}>View packages</Link></div>
        )}
        {notice ? <div role="status" className={`mt-4 rounded-2xl border px-4 py-3 text-xs font-bold ${surface}`}>{notice}</div> : null}
      </section>
    </main>
  );
}
