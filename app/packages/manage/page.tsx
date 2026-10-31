"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import PlanNavigation from "@/components/PlanNavigation";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { getLoadLinkIntelligence, getPaystackManagementLink, type LoadLinkIntelligenceState } from "@/lib/loadlinkIntelligence";
import { getVehicleListingAccess, type PackageAccess } from "@/lib/packageAccess";
import { supabase } from "@/lib/supabaseClient";
import styles from "../PlanWorkspace.module.css";

const activeStates = new Set(["active", "trial", "trialing", "grace_period", "cancelled"]);
function statusText(status: string | null | undefined) {
  const key = String(status || "").toLowerCase();
  const names: Record<string,string> = {
    active: "Active", trial: "Trial", trialing: "Trial", grace_period: "Grace period",
    cancelled: "Ending", past_due: "Payment due", expired: "Expired",
    blocked: "Blocked", suspended: "Suspended", standard: "Standard access",
    under_review: "Under review",
  };
  return names[key] || (key ? key.replaceAll("_", " ") : "Unavailable");
}
function dateText(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(d);
}
function Info({ label, value }: { label: string; value: string }) {
  return <div className={styles.fact}><p className={styles.factLabel}>{label}</p><p className={styles.factValue}>{value}</p></div>;
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className={styles.dataRow}><span className={styles.dataLabel}>{label}</span><strong className={styles.dataValue}>{value}</strong></div>;
}
export default function ManagePackagePage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [state, setState] = useState<LoadLinkIntelligenceState | null>(null);
  const [access, setAccess] = useState<PackageAccess | null>(null);
  const [standardRules, setStandardRules] = useState<{ photos: number; dailyMessages: number | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setNotice("");
    try {
      const live = await getLoadLinkIntelligence();
      setState(live);
      if (live.authenticated) {
        const rules = await supabase.from("marketplace_plan_rules").select("listing_image_limit,daily_message_limit").eq("plan_code", "standard").maybeSingle();
        setStandardRules(!rules.error && rules.data ? { photos: rules.data.listing_image_limit, dailyMessages: rules.data.daily_message_limit } : null);
        try {
          const permissions = await getVehicleListingAccess();
          setAccess(permissions);
          if (!permissions.schemaReady) setNotice("Some listing permissions could not be verified. No additional access has been assumed.");
        } catch {
          setAccess(null);
          setNotice("Listing allowances could not be loaded. Please refresh.");
        }
      } else {
        setAccess(null);
        setStandardRules(null);
      }
    } catch {
      setState(null);
      setAccess(null);
      setStandardRules(null);
      setNotice("Unable to load your current plan. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function manageBilling() {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await getPaystackManagementLink();
      if (!response?.link) throw new Error("No management link returned");
      window.location.assign(response.link);
    } catch {
      setNotice("Subscription management is temporarily unavailable. No plan changes were made. Please try again or contact support.");
      setBusy(false);
    }
  }

  const planName = state?.plan === "dealer" ? "Dealer" : state?.plan === "pro" ? "Pro" : "Standard";
  const hasSubscription = state?.plan === "dealer" || state?.plan === "pro";
  const periodEnd = hasSubscription ? dateText(state?.current_period_end) : null;
  const active = hasSubscription && activeStates.has(String(state?.plan_state)) && Boolean(access?.allowed && access.source === "subscription");
  const status = hasSubscription ? statusText(state?.plan_state) : access?.source === "manual_credit" && access.allowed ? "Daily listing access" : "Standard access";
  const allowancesKnown = Boolean(access?.schemaReady);
  const photoCount = allowancesKnown ? access?.allowed ? String(access.photoLimit) : standardRules ? `${standardRules.photos} when activated` : "Not active" : "Unavailable";
  const limit = allowancesKnown
    ? access?.activeListingLimit === null ? "Unlimited" : String(access?.activeListingLimit ?? 0)
    : "Unavailable";
  const effectiveMessageLimit = access?.dailyMessageLimit === 0 && !access?.allowed ? standardRules?.dailyMessages : access?.dailyMessageLimit;
  const messageLimit = allowancesKnown
    ? effectiveMessageLimit === null ? "Unlimited" : typeof effectiveMessageLimit === "number" ? String(effectiveMessageLimit) + " / day" : "Unavailable"
    : "Unavailable";
  const paid = Boolean(hasSubscription && active);

  return <main className={styles.page} data-theme={darkMode ? "dark" : "light"} data-loadlink-plan-manage="20261031">
    <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
    <div className={styles.container}>
      <header>
        <p className={styles.eyebrow}>Your LoadLink account</p>
        <h1 className={styles.title}>Manage plan</h1>
        <p className={styles.subtitle}>Your plan, listing access and billing details in one place, based on the latest information available from LoadLink.</p>
        <PlanNavigation active="overview" />
      </header>

      {loading ? <div className={styles.panel}><div className={styles.panelBody} role="status">Checking your latest plan and permissions…</div></div> : !state ? (
        <div className={styles.panel}><div className={styles.panelBody}>
          <h2 className={styles.panelHeading}>We couldn't load your account</h2>
          <p className={styles.panelCopy}>Please try again. Your existing plan remains unchanged.</p>
          <div className={styles.buttonRow}><button type="button" className={styles.primary} onClick={() => void refresh()}>Try again</button></div>
        </div></div>
      ) : !state.authenticated ? (
        <div className={styles.panel}><div className={styles.panelBody}>
          <h2 className={styles.panelHeading}>Sign in to see your plan</h2>
          <p className={styles.panelCopy}>Your plan and payment details are only shown after you sign in.</p>
          <div className={styles.buttonRow}><Link href="/login?returnTo=%2Fpackages%2Fmanage" className={styles.primary}>Sign in</Link></div>
        </div></div>
      ) : <>
        <section className={styles.panel} aria-label="Current plan">
          <div className={styles.panelBody}>
            <div className={styles.panelTop}>
              <div>
                <p className={styles.eyebrow}>Current plan</p>
                <h2 className={styles.planName}>{planName}</h2>
                <p className={styles.panelCopy}>{hasSubscription ? "Subscription information from your account." : "Standard access. Paid vehicle days and upgrades are optional."}</p>
              </div>
              <span className={`${styles.status} ${paid ? styles.statusActive : ""}`}>{status}</span>
            </div>
            <div className={styles.buttonRow}>
              <Link href="/packages" className={styles.primary}>{hasSubscription ? "Compare packages" : "View packages"}</Link>
              {hasSubscription ? <button type="button" disabled={busy} onClick={() => void manageBilling()} className={styles.secondary}>{busy ? "Opening…" : "Manage subscription"}</button> : null}
              <button type="button" className={styles.secondary} onClick={() => void refresh()}>Refresh details</button>
            </div>
          </div>
          <div className={styles.grid}>
            <Info label="Plan status" value={status} />
            <Info label={hasSubscription ? String(state?.plan_state) === "cancelled" ? "Access ends" : "Current period ends" : "Billing cycle"} value={hasSubscription ? periodEnd || "Not provided" : "No subscription"} />
            <Info label="Payment status" value={state.payment_status ? statusText(state.payment_status) : "Not available"} />
            <Info label="Email" value={state.email || "Not available"} />
          </div>
        </section>

        <div className={styles.sectionGrid}>
          <section className={styles.panel}>
            <div className={styles.panelBody}>
              <h2 className={styles.panelHeading}>Your listing allowances</h2>
              <p className={styles.panelCopy}>Live access rules for your account.</p>
              <div style={{ marginTop: 14 }}>
                <Row label="Vehicle listing access" value={allowancesKnown ? access?.allowed ? "Available" : "Not active" : "Unavailable"} />
                <Row label="Active listing limit" value={limit} />
                <Row label="Photos per listing" value={photoCount} />
                <Row label="Messages" value={messageLimit} />
                <Row label="Analytics" value={allowancesKnown ? access?.analyticsEnabled ? "Available" : "Not included" : "Unavailable"} />
                {access?.source === "manual_credit" ? <Row label="Unused daily credits" value={String(access.manualCreditBalance)} /> : null}
              </div>
            </div>
          </section>
          <section className={styles.panel}>
            <div className={styles.panelBody}>
              <h2 className={styles.panelHeading}>Billing and support</h2>
              <p className={styles.panelCopy}>View recorded transactions and manage your options.</p>
              <div className={styles.buttonRow}>
                <Link href="/account/packages" className={styles.secondary}>Billing history</Link>
                <Link href="/help" className={styles.secondary}>Get support</Link>
                {state.plan === "dealer" && active ? <Link href="/dealer" className={styles.primary}>Dealership Centre</Link> : null}
              </div>
              {state.payment_reference ? <div style={{ marginTop: 18 }}><Row label="Latest payment reference" value={state.payment_reference} /></div> : null}
            </div>
          </section>
        </div>
      </>}
      {notice ? <p className={styles.message} role="status">{notice}</p> : null}
    </div>
  </main>;
}
