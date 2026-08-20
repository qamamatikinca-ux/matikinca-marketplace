"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed" | "all";
type ReportRow = {
  id: string;
  listing_id?: string | null;
  listing_title?: string | null;
  listing_city?: string | null;
  reported_name?: string | null;
  reporter_name?: string | null;
  category: string;
  details?: string | null;
  status: string;
  resolution_notes?: string | null;
  created_at: string;
  resolved_at?: string | null;
};

const statuses: ReportStatus[] = ["open", "reviewing", "resolved", "dismissed", "all"];
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());

export default function MarketplaceReportsPage() {
  const [status, setStatus] = useState<ReportStatus>("open");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      if (!isSupabaseConfigured) throw new Error("Supabase is not configured for this deployment.");
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sign in with an authorised LoadLink Control Centre account.");
      const result = await supabase.rpc("loadlink_admin_report_queue", { p_status: status, p_limit: 150, p_offset: 0 });
      if (result.error) throw result.error;
      setRows((result.data || []) as ReportRow[]);
    } catch (error) {
      setRows([]);
      setMessage(error instanceof Error ? error.message : "Marketplace reports could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  async function review(row: ReportRow, action: "reviewing" | "resolved" | "dismissed") {
    let note = "";
    if (action === "resolved" || action === "dismissed") {
      note = window.prompt(action === "resolved" ? "Resolution note" : "Why is this report being dismissed?", row.resolution_notes || "")?.trim() || "";
      if (note.length < 5) {
        setMessage("Add a clear resolution note before closing the report.");
        return;
      }
    }
    setBusyId(row.id);
    setMessage("");
    try {
      const result = await supabase.rpc("loadlink_admin_review_report", {
        p_report_id: row.id,
        p_action: action,
        p_resolution_notes: note || null,
      });
      if (result.error) throw result.error;
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The report decision could not be saved.");
    } finally {
      setBusyId("");
    }
  }

  if (loading && rows.length === 0) return <main className="min-h-screen bg-[#f4f2eb] text-black"><LoadLinkLoading /></main>;

  return (
    <main className="min-h-screen bg-[#f4f2eb] px-4 py-8 text-black sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9a7000]">LoadLink Control Centre</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.045em]">Marketplace reports</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-black/55">Investigate member reports, open the affected listing and record the final outcome in one protected queue.</p>
          </div>
          <Link href="/admin" className="self-start rounded-xl bg-black px-4 py-3 text-xs font-black text-white">Control Centre</Link>
        </header>

        <div className="mt-5 flex gap-2 overflow-x-auto rounded-[20px] border border-black/10 bg-white p-3" data-loadlink-swipe-dots="true">
          {statuses.map((option) => (
            <button key={option} type="button" onClick={() => setStatus(option)} className={`shrink-0 rounded-full px-4 py-2 text-[11px] font-black ${status === option ? "bg-[#f6b800] text-black" : "bg-[#f6f4ee] text-black/60"}`}>{label(option)}</button>
          ))}
        </div>

        {message ? <p className="mt-5 rounded-[18px] border border-red-500/25 bg-red-50 p-4 text-sm font-bold text-red-900">{message}</p> : null}
        {!loading && !message && rows.length === 0 ? <div className="mt-8 rounded-[24px] border border-black/10 bg-white p-9 text-center"><h2 className="text-2xl font-black">Queue clear</h2><p className="mt-2 text-sm font-semibold text-black/50">No reports match this view.</p></div> : null}

        <div className="mt-6 grid gap-4">
          {rows.map((row) => (
            <article key={row.id} className="rounded-[24px] border border-black/10 bg-white p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-black px-3 py-1 text-[10px] font-black text-white">{label(row.status)}</span>
                    <span className="rounded-full bg-[#f6b800] px-3 py-1 text-[10px] font-black text-black">{label(row.category)}</span>
                  </div>
                  <h2 className="mt-3 break-words text-xl font-black">{row.listing_title || "Unavailable listing"}</h2>
                  <p className="mt-1 text-xs font-semibold text-black/45">{row.listing_city || "Location unavailable"} · Reported member: {row.reported_name || "Unknown"}</p>
                  <p className="mt-1 text-xs font-semibold text-black/40">Reporter: {row.reporter_name || "LoadLink member"} · {new Date(row.created_at).toLocaleString("en-ZA")}</p>
                </div>
                {row.listing_id ? <Link href={`/listing/${row.listing_id}`} className="shrink-0 rounded-xl border border-black/10 px-4 py-3 text-xs font-black">Open listing</Link> : null}
              </div>

              <div className="mt-5 rounded-[18px] bg-[#f7f5ef] p-4">
                <p className="text-[10px] font-black uppercase tracking-[.12em] text-black/35">Report details</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-black/65">{row.details || "No additional details supplied."}</p>
              </div>

              {row.resolution_notes ? <p className="mt-4 rounded-xl border border-black/8 bg-[#faf9f5] p-3 text-xs font-semibold leading-5 text-black/55">Resolution: {row.resolution_notes}</p> : null}

              {row.status === "open" || row.status === "reviewing" ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {row.status === "open" ? <button disabled={busyId === row.id} type="button" onClick={() => void review(row, "reviewing")} className="rounded-xl border border-black/10 px-4 py-3 text-xs font-black disabled:opacity-40">Start review</button> : null}
                  <button disabled={busyId === row.id} type="button" onClick={() => void review(row, "resolved")} className="rounded-xl bg-[#f6b800] px-4 py-3 text-xs font-black text-black disabled:opacity-40">Resolve</button>
                  <button disabled={busyId === row.id} type="button" onClick={() => void review(row, "dismissed")} className="rounded-xl bg-black px-4 py-3 text-xs font-black text-white disabled:opacity-40">Dismiss</button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
