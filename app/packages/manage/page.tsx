"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import { getLoadLinkIntelligence, getPaystackManagementLink, loadLinkHumanError } from "@/lib/loadlinkIntelligence";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type ActivePlan = "pro" | "dealer" | null;
const entitled = new Set(["active", "trial", "trialing", "grace_period", "cancelled"]);

export default function ManagePackagePage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [plan, setPlan] = useState<ActivePlan>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void getLoadLinkIntelligence().then((state) => {
      if (!active) return;
      if (!state.authenticated) {
        window.location.replace(`/login?returnTo=${encodeURIComponent("/packages/manage")}`);
        return;
      }
      const current: ActivePlan = state.plan === "dealer" && entitled.has(String(state.plan_state)) ? "dealer" : state.plan === "pro" && entitled.has(String(state.plan_state)) ? "pro" : null;
      if (!current) {
        window.location.replace("/packages");
        return;
      }
      setPlan(current);
      setLoading(false);
    }).catch((error) => {
      if (!active) return;
      setNotice(loadLinkHumanError(error, "LoadLink could not read your plan right now."));
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function openPlanManagement() {
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
  const surface = darkMode ? "border-white/10 bg-white/[.035]" : "border-black/10 bg-white/78";
  const muted = darkMode ? "text-white/52" : "text-black/52";

  return (
    <main className={`min-h-screen ${page}`}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <section className="mx-auto max-w-2xl px-4 pb-16 pt-10 sm:px-6">
        <Link href="/packages" className={`text-xs font-black ${muted}`}>← Packages</Link>
        <h1 className="mt-6 text-4xl font-black tracking-[-.05em]">Manage {plan === "dealer" ? "Dealer" : "Pro"}</h1>
        <p className={`mt-3 max-w-xl text-sm font-semibold leading-6 ${muted}`}>{plan === "dealer" ? "Choose whether you want to manage billing or open the dealership workspace." : "Manage your Pro billing and subscription settings."}</p>

        {notice ? <div className={`mt-5 rounded-[18px] border px-4 py-3 text-xs font-bold ${surface}`}>{notice}</div> : null}

        {loading ? (
          <div className={`mt-7 h-28 animate-pulse rounded-[22px] border ${surface}`} />
        ) : (
          <div className={`mt-7 overflow-hidden rounded-[24px] border ${surface}`}>
            <button type="button" onClick={() => void openPlanManagement()} disabled={busy} className="flex w-full items-center justify-between border-b border-current/10 px-5 py-5 text-left disabled:opacity-50">
              <span><span className="block text-sm font-black">Manage plan</span><span className={`mt-1 block text-[11px] font-semibold ${muted}`}>Billing, payment method and subscription management.</span></span><span aria-hidden="true">→</span>
            </button>
            {plan === "dealer" ? (
              <Link href="/dealer" data-loadlink-scroll-top="true" className="flex w-full items-center justify-between px-5 py-5 text-left">
                <span><span className="block text-sm font-black">Go to dealership centre</span><span className={`mt-1 block text-[11px] font-semibold ${muted}`}>Open stock, leads, showroom, team and dealership activity.</span></span><span aria-hidden="true">→</span>
              </Link>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
