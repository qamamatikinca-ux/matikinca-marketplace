"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { getLoadLinkIntelligence, getPaystackManagementLink, loadLinkHumanError, type LoadLinkIntelligenceState } from "@/lib/loadlinkIntelligence";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function ManagePackagePage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [state, setState] = useState<LoadLinkIntelligenceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void getLoadLinkIntelligence().then((fresh) => {
      if (!active) return;
      if (!fresh.authenticated) {
        window.location.replace(`/login?returnTo=${encodeURIComponent("/packages/manage")}`);
        return;
      }
      setState(fresh);
      setLoading(false);
    }).catch((error) => {
      if (!active) return;
      setNotice(loadLinkHumanError(error, "LoadLink could not read your plan right now."));
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function openBilling() {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await getPaystackManagementLink();
      window.location.assign(response.link);
    } catch (error) {
      setNotice(loadLinkHumanError(error, "Plan management is not available right now."));
    } finally {
      setBusy(false);
    }
  }

  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const card = darkMode ? "border-white/10 bg-white/[.045]" : "border-black/10 bg-white/72";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const plan = state?.plan === "dealer" ? "Dealer" : state?.plan === "pro" ? "Pro" : "LoadLink";

  if (loading) return <main className={`min-h-screen ${page}`}><LoadLinkLoading /></main>;

  return (
    <main className={`min-h-screen ${page}`} data-loadlink-plan-management="true">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <section className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6">
        <Link href="/packages" className={`text-xs font-black ${muted}`}>← Packages</Link>
        <h1 className="mt-5 text-4xl font-black tracking-[-.05em] sm:text-5xl">Manage {plan}</h1>
        <p className={`mt-3 max-w-xl text-sm font-semibold leading-6 ${muted}`}>Choose what you want to manage. LoadLink keeps billing separate from your operational workspace.</p>

        {notice ? <div className={`mt-6 rounded-2xl border p-4 text-sm font-semibold ${card}`}>{notice}</div> : null}

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => void openBilling()} disabled={busy} className={`min-h-40 rounded-[24px] border p-5 text-left transition active:scale-[.99] disabled:opacity-55 ${card}`}>
            <span className="text-[11px] font-black uppercase tracking-[.12em] opacity-45">Billing</span>
            <strong className="mt-3 block text-2xl font-black tracking-[-.035em]">Manage plan</strong>
            <span className={`mt-2 block text-sm font-semibold leading-6 ${muted}`}>Update the billing method, subscription or payment details for this plan.</span>
          </button>

          {state?.plan === "dealer" ? (
            <Link href="/dealer" className={`min-h-40 rounded-[24px] border p-5 transition active:scale-[.99] ${card}`}>
              <span className="text-[11px] font-black uppercase tracking-[.12em] opacity-45">Workspace</span>
              <strong className="mt-3 block text-2xl font-black tracking-[-.035em]">Go to Dealership Centre</strong>
              <span className={`mt-2 block text-sm font-semibold leading-6 ${muted}`}>Open inventory, leads, showroom updates, analytics and dealership tools.</span>
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
