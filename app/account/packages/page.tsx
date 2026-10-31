"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import PlanNavigation from "@/components/PlanNavigation";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { supabase } from "@/lib/supabaseClient";
import { isAuthenticatedUser } from "@/lib/auth";
import styles from "../../packages/PlanWorkspace.module.css";

type Bill = {
  id: string; item_type: string; item_code: string | null; amount_cents: number;
  currency: string | null; status: string; reference: string | null; created_at: string;
};
function dateText(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(date);
}
function currencyText(amountCents: number, currency: string | null) {
  const iso = currency === "ZAR" || !currency ? "ZAR" : currency;
  try { return new Intl.NumberFormat("en-ZA", { style: "currency", currency: iso }).format(Number(amountCents) / 100); }
  catch { return `${iso} ${(Number(amountCents) / 100).toFixed(2)}`; }
}
function readable(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
export default function BillingHistoryPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [rows, setRows] = useState<Bill[]>([]);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!isAuthenticatedUser(user)) {
        setSignedIn(false);
        setRows([]);
        return;
      }
      setSignedIn(true);
      const { data, error: dbError } = await supabase
        .from("billing_history")
        .select("id,item_type,item_code,amount_cents,currency,status,reference,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (dbError) throw dbError;
      setRows((data || []) as Bill[]);
    } catch {
      setRows([]);
      setError("We could not load your billing history. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <main className={styles.page} data-theme={darkMode ? "dark" : "light"} data-loadlink-billing-history="20261031">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <div className={styles.container}>
        <header>
          <p className={styles.eyebrow}>Your LoadLink account</p>
          <h1 className={styles.title}>Billing history</h1>
          <p className={styles.subtitle}>Real transactions recorded for your account, with their current payment status.</p>
          <PlanNavigation active="history" />
        </header>

        <section className={styles.panel} aria-label="Recorded transactions">
          <div className={styles.panelBody}>
            <div className={styles.panelTop}>
              <div>
                <h2 className={styles.panelHeading}>Transactions</h2>
                <p className={styles.panelCopy}>{loading ? "Checking your billing records…" : signedIn ? rows.length ? `${rows.length} most recent entries` : "No transactions recorded yet" : "Sign in to view your transactions"}</p>
              </div>
              {signedIn ? <button type="button" onClick={() => void refresh()} disabled={loading} className={styles.secondary}>Refresh</button> : null}
            </div>
          </div>
          {loading ? <div className={styles.panelBody} role="status">Loading your payments…</div>
          : !signedIn ? <div className={styles.panelBody}><p className={styles.panelCopy}>Only the account owner can view their billing history.</p><div className={styles.buttonRow}><Link href="/login?returnTo=%2Faccount%2Fpackages" className={styles.primary}>Sign in</Link></div></div>
          : error ? <div className={styles.panelBody}><p role="alert">{error}</p><div className={styles.buttonRow}><button type="button" className={styles.primary} onClick={() => void refresh()}>Try again</button></div></div>
          : rows.length ? (
            <div style={{ overflowX: "auto" }}>
              <table className={styles.history}>
                <thead><tr><th scope="col">Transaction</th><th scope="col">Status</th><th scope="col">Amount</th></tr></thead>
                <tbody>{rows.map((bill) => (
                  <tr key={bill.id}>
                    <td>
                      <strong>{readable(bill.item_code || bill.item_type)}</strong>
                      <small>{dateText(bill.created_at)}</small>
                      {bill.reference ? <small>Ref: {bill.reference}</small> : null}
                    </td>
                    <td>{readable(bill.status)}</td>
                    <td><strong>{currencyText(bill.amount_cents,bill.currency)}</strong></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <div className={styles.panelBody}><div className={styles.empty}>No billing records are available for your account yet. When a payment is recorded, it will appear here.</div></div>}
        </section>
        <div className={styles.buttonRow}><Link href="/packages/manage" className={styles.secondary}>Back to plan overview</Link><Link href="/help" className={styles.secondary}>Billing support</Link></div>
      </div>
    </main>
  );
}
