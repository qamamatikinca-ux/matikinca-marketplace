"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type FeedbackRow = {
  id: string;
  rating: number;
  comment: string | null;
  surface: string;
  listing_id: string | null;
  listing_title: string | null;
  user_email: string | null;
  created_at: string;
};

type Filter = "all" | "low" | "job" | "contract" | "vehicle" | "asset";

export default function SupportFeedbackPage() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
      const result = await supabase.rpc("get_posting_experience_feedback", { p_limit: 200 });
      if (result.error) throw result.error;
      setRows((result.data || []) as FeedbackRow[]);
    } catch (caught) {
      setRows([]);
      setError(caught instanceof Error ? caught.message : "Customer feedback could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => rows.filter((row) => filter === "all" ? true : filter === "low" ? Number(row.rating) <= 3 : row.surface === filter), [filter, rows]);
  const average = rows.length ? rows.reduce((sum, row) => sum + Number(row.rating || 0), 0) / rows.length : 0;
  const low = rows.filter((row) => Number(row.rating) <= 3).length;

  if (loading) return <main className="min-h-screen bg-[#f4f2eb] text-black"><LoadLinkLoading /></main>;

  return (
    <main className="min-h-screen bg-[#f4f2eb] px-4 py-8 text-black sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9a7000]">LoadLink Control Centre</p><h1 className="mt-2 text-4xl font-black tracking-[-.045em]">Customer experience</h1><p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-black/55">Posting feedback for Support and Operations. The database enforces the staff role before returning customer information.</p></div>
          <div className="flex gap-2"><button type="button" onClick={() => void load()} className="rounded-xl border border-black/15 bg-white px-4 py-3 text-xs font-black">Refresh</button><Link href="/admin" className="rounded-xl bg-black px-4 py-3 text-xs font-black text-white">Control Centre</Link></div>
        </header>

        {error ? <div className="mt-5 rounded-[18px] border border-red-500/25 bg-red-50 p-4 text-sm font-bold text-red-900">{error}</div> : null}

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3"><Metric label="Average" value={rows.length ? `${average.toFixed(1)} / 5` : "—"} /><Metric label="Responses" value={String(rows.length)} /><Metric label="Needs follow-up" value={String(low)} /></section>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{(["all","low","job","contract","vehicle","asset"] as Filter[]).map((option) => <button key={option} type="button" onClick={() => setFilter(option)} className={`shrink-0 rounded-full px-4 py-2 text-[11px] font-black ${filter === option ? "bg-[#f6b800] text-black" : "border border-black/10 bg-white text-black"}`}>{option === "low" ? "Follow-up" : option === "asset" ? "Equipment" : option[0].toUpperCase() + option.slice(1)}</button>)}</div>

        <div className="mt-5 grid gap-3">{visible.map((row) => <article key={row.id} className="rounded-[22px] border border-black/10 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-lg font-black">{"★".repeat(Math.max(0, Math.min(5, Number(row.rating))))}<span className="text-black/15">{"★".repeat(Math.max(0, 5 - Number(row.rating)))}</span></p><h2 className="mt-2 text-lg font-black">{row.listing_title || "Posting experience"}</h2><p className="mt-1 text-xs font-semibold text-black/45">{row.user_email || "Signed-in member"} · {new Date(row.created_at).toLocaleString("en-ZA")}</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-black ${Number(row.rating) <= 3 ? "bg-red-50 text-red-700" : "bg-[#f7f5ef] text-black/55"}`}>{Number(row.rating) <= 3 ? "Follow up" : row.surface}</span></div><p className="mt-4 text-sm font-semibold leading-6 text-black/65">{row.comment?.trim() || "No written comment."}</p></article>)}</div>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[20px] border border-black/10 bg-white p-4"><p className="text-[9px] font-black uppercase tracking-[.12em] text-black/40">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>;
}
