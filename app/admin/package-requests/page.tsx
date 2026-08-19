"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type QueueStatus = "all" | "pending_review" | "approved" | "rejected";
type RequestRow = {
  id: string;
  user_id: string;
  user_name?: string | null;
  user_email?: string | null;
  requested_features?: Record<string, unknown> | null;
  estimated_amount_cents: number;
  final_amount_cents?: number | null;
  recommended_plan?: string | null;
  status: string;
  admin_note?: string | null;
  created_at: string;
  reviewed_at?: string | null;
};

const statuses: QueueStatus[] = ["pending_review", "all", "approved", "rejected"];
const money = (value?: number | null) => `R${Math.max(0, Number(value || 0) / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function PackageRequestsPage() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [status, setStatus] = useState<QueueStatus>("pending_review");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      if (!isSupabaseConfigured) throw new Error("Supabase is not configured for this deployment.");
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sign in with an authorised LoadLink Control Centre account.");
      const result = await supabase.rpc("loadlink_admin_package_request_queue", { p_status: status, p_limit: 150, p_offset: 0 });
      if (result.error) throw result.error;
      setRows((result.data || []) as RequestRow[]);
    } catch (error) {
      setRows([]);
      setMessage(error instanceof Error ? error.message : "The package request queue could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  async function review(row: RequestRow, action: "approve" | "reject") {
    let note = "";
    let fulfilmentPlan: string | null = row.recommended_plan === "pro" || row.recommended_plan === "dealer" ? row.recommended_plan : null;
    let finalAmountCents: number | null = null;

    if (action === "reject") {
      note = window.prompt("Give the user a clear reason for rejection", row.admin_note || "")?.trim() || "";
      if (note.length < 5) {
        setMessage("A clear rejection reason is required.");
        return;
      }
    } else {
      if (!fulfilmentPlan) {
        const choice = window.prompt("This tailored request needs a base entitlement. Enter Pro or Dealer.", "pro")?.trim().toLowerCase() || "";
        if (choice !== "pro" && choice !== "dealer") {
          setMessage("Choose Pro or Dealer before approving this tailored request.");
          return;
        }
        fulfilmentPlan = choice;
      }
      const suggestedRand = Math.max(1, Math.round(Number(row.final_amount_cents || row.estimated_amount_cents || 0) / 100));
      const entered = window.prompt("Approved monthly amount in rand", String(suggestedRand));
      if (entered === null) return;
      const amountRand = Number(entered.replace(/[^0-9.]/g, ""));
      if (!Number.isFinite(amountRand) || amountRand <= 0) {
        setMessage("Enter a valid approved monthly amount.");
        return;
      }
      finalAmountCents = Math.round(amountRand * 100);
      note = window.prompt("Approval note (optional)", row.admin_note || "")?.trim() || "";
      if (!window.confirm(`Approve ${row.user_name || "this user"} for ${label(fulfilmentPlan)} at ${money(finalAmountCents)} per month?`)) return;
    }

    setBusyId(row.id);
    setMessage("");
    try {
      const result = await supabase.rpc("loadlink_admin_review_package_request", {
        p_request_id: row.id,
        p_action: action,
        p_final_amount_cents: finalAmountCents,
        p_admin_note: note || null,
        p_fulfilment_plan: fulfilmentPlan,
      });
      if (result.error) throw result.error;
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The package decision could not be saved.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f2eb] px-4 py-8 text-black sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9a7000]">LoadLink Control Centre</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.045em]">Package approvals</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-black/55">Review plan requests, resolve tailored requests to a real LoadLink entitlement and approve the exact payment amount before checkout can start.</p>
          </div>
          <Link href="/admin" className="self-start rounded-xl bg-black px-4 py-3 text-xs font-black text-white">Control Centre</Link>
        </header>

        <div className="mt-5 flex flex-wrap gap-2 rounded-[20px] border border-black/10 bg-white p-3">
          {statuses.map((option) => <button key={option} type="button" onClick={() => setStatus(option)} className={`rounded-full px-4 py-2 text-[11px] font-black ${status === option ? "bg-[#f6b800] text-black" : "bg-[#f6f4ee] text-black/60"}`}>{label(option)}</button>)}
        </div>

        {message ? <p className="mt-5 rounded-[18px] border border-red-500/25 bg-red-50 p-4 text-sm font-bold text-red-900">{message}</p> : null}
        {loading ? <div className="mt-8 rounded-[24px] border border-black/10 bg-white p-10 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-black/15 border-t-[#f6b800]" /><p className="mt-4 text-sm font-bold text-black/50">Loading package requests…</p></div> : null}
        {!loading && !message && rows.length === 0 ? <div className="mt-8 rounded-[24px] border border-black/10 bg-white p-9 text-center"><h2 className="text-2xl font-black">Queue clear</h2><p className="mt-2 text-sm font-semibold text-black/50">No package requests match this view.</p></div> : null}

        <div className="mt-6 grid gap-4">
          {rows.map((row) => <article key={row.id} className="rounded-[24px] border border-black/10 bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap gap-2"><span className="rounded-full bg-black px-3 py-1 text-[10px] font-black text-white">{label(row.status)}</span><span className="rounded-full bg-[#f6b800] px-3 py-1 text-[10px] font-black text-black">{label(row.recommended_plan || "tailored")}</span></div>
                <h2 className="mt-3 text-xl font-black">{row.user_name || "LoadLink user"}</h2>
                <p className="mt-1 text-xs font-semibold text-black/45">{row.user_email || row.user_id}</p>
                <p className="mt-1 text-xs font-semibold text-black/40">Submitted {new Date(row.created_at).toLocaleString("en-ZA")}</p>
              </div>
              <div className="sm:text-right"><p className="text-[10px] font-black uppercase tracking-[.12em] text-black/40">Estimate</p><p className="text-3xl font-black">{money(row.estimated_amount_cents)}</p>{row.final_amount_cents ? <p className="mt-1 text-xs font-black text-emerald-700">Approved {money(row.final_amount_cents)}/mo</p> : null}</div>
            </div>

            <div className="mt-5 grid gap-2 rounded-[18px] bg-[#f7f5ef] p-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(row.requested_features || {}).map(([key, value]) => <div key={key} className="rounded-xl bg-white px-3 py-2"><p className="text-[9px] font-black uppercase tracking-[.1em] text-black/35">{label(key)}</p><p className="mt-1 text-xs font-bold">{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</p></div>)}
              {!Object.keys(row.requested_features || {}).length ? <p className="text-xs font-semibold text-black/45">No extra feature notes were supplied.</p> : null}
            </div>

            {row.status === "pending_review" ? <div className="mt-5 flex flex-wrap gap-2"><button disabled={busyId === row.id} type="button" onClick={() => void review(row, "approve")} className="rounded-xl bg-[#f6b800] px-5 py-3 text-xs font-black text-black disabled:opacity-40">{busyId === row.id ? "Saving…" : "Approve / set price"}</button><button disabled={busyId === row.id} type="button" onClick={() => void review(row, "reject")} className="rounded-xl bg-black px-5 py-3 text-xs font-black text-white disabled:opacity-40">Reject with reason</button></div> : null}
            {row.admin_note ? <p className="mt-4 rounded-xl border border-black/8 bg-[#faf9f5] p-3 text-xs font-semibold leading-5 text-black/55">Control Centre note: {row.admin_note}</p> : null}
          </article>)}
        </div>
      </div>
    </main>
  );
}
