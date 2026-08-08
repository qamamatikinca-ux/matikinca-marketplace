"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { isAuthenticatedUser } from "@/lib/auth";
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

type Filter = "all" | "job" | "contract" | "asset" | "vehicle" | "low";

export default function CustomerExperiencePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
      const { data: { user } } = await supabase.auth.getUser();
      if (!isAuthenticatedUser(user)) { router.replace("/login?next=/admin/customer-experience"); return; }
      const access = await supabase.rpc("is_loadlink_admin");
      if (access.error || access.data !== true) { router.replace("/"); return; }
      const result = await supabase.rpc("get_posting_experience_feedback", { p_limit: 200 });
      if (result.error) throw result.error;
      setRows((result.data || []) as FeedbackRow[]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Customer Experience feedback could not load.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => rows.filter((row) => {
    if (filter === "all") return true;
    if (filter === "low") return Number(row.rating) <= 3;
    return row.surface === filter;
  }), [filter, rows]);

  const average = rows.length ? rows.reduce((sum, row) => sum + Number(row.rating || 0), 0) / rows.length : 0;
  const positive = rows.length ? Math.round(rows.filter((row) => row.rating >= 4).length / rows.length * 100) : 0;
  const low = rows.filter((row) => row.rating <= 3).length;

  if (loading) return <main className="min-h-screen bg-black text-white"><LoadLinkLoading /></main>;

  return (
    <main className="min-h-screen bg-[#f5f2e9] text-black">
      <header className="border-b border-black/10 bg-black px-5 py-6 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#f6b800]">LoadLink Control Centre</p>
            <h1 className="mt-1 text-3xl font-black tracking-[-.04em]">Customer Experience</h1>
          </div>
          <Link href="/admin" className="rounded-xl border border-white/15 px-4 py-2 text-xs font-black">Back</Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Average" value={rows.length ? `${average.toFixed(1)} / 5` : "—"} />
          <Metric label="Responses" value={String(rows.length)} />
          <Metric label="Positive" value={`${positive}%`} />
          <Metric label="Needs follow-up" value={String(low)} />
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>All</FilterButton>
            <FilterButton active={filter === "job"} onClick={() => setFilter("job")}>Jobs</FilterButton>
            <FilterButton active={filter === "contract"} onClick={() => setFilter("contract")}>Contracts</FilterButton>
            <FilterButton active={filter === "asset"} onClick={() => setFilter("asset")}>Equipment</FilterButton>
            <FilterButton active={filter === "vehicle"} onClick={() => setFilter("vehicle")}>Vehicles</FilterButton>
            <FilterButton active={filter === "low"} onClick={() => setFilter("low")}>Follow-up</FilterButton>
          </div>
          <button type="button" onClick={() => void load()} className="h-10 rounded-xl bg-[#f6b800] px-4 text-xs font-black">Refresh</button>
        </div>

        {error ? <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-700">{error}</div> : null}

        <div className="mt-5 grid gap-3">
          {visible.length ? visible.map((row) => (
            <article key={row.id} className="rounded-2xl border border-black/10 bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,.04)] md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <StarRating rating={Number(row.rating)} />
                    <span className="rounded-full bg-black/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.1em]">{surfaceLabel(row.surface)}</span>
                  </div>
                  <h2 className="mt-3 text-lg font-black">{row.listing_title || "Posting experience"}</h2>
                  <p className="mt-1 text-xs font-semibold text-black/45">{row.user_email || "Signed-in member"} · {formatDate(row.created_at)}</p>
                </div>
                {row.rating <= 3 ? <span className="rounded-full bg-red-50 px-3 py-1.5 text-[9px] font-black uppercase text-red-700">Follow up</span> : null}
              </div>
              <p className="mt-4 text-sm font-semibold leading-6 text-black/65">{row.comment?.trim() || "No written comment — star rating only."}</p>
              {row.listing_id ? <Link href={`/jobs#job-${row.listing_id}`} className="mt-4 inline-flex text-xs font-black text-[#9a6a00] underline underline-offset-4">Open related listing</Link> : null}
            </article>
          )) : <div className="rounded-2xl border border-black/10 bg-white p-10 text-center"><p className="text-xl font-black">No feedback in this view</p><p className="mt-2 text-sm text-black/50">New posting ratings will appear here automatically.</p></div>}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-black/10 bg-white p-4"><p className="text-[9px] font-black uppercase tracking-[.12em] text-black/40">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>;
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`shrink-0 rounded-xl border px-4 py-2.5 text-xs font-black ${active ? "border-[#f6b800] bg-[#f6b800] text-black" : "border-black/10 bg-white"}`}>{children}</button>;
}

function StarRating({ rating }: { rating: number }) {
  return <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>{[1,2,3,4,5].map((star) => <span key={star} className={star <= rating ? "text-[#d99f00]" : "text-black/15"}>★</span>)}</div>;
}

function surfaceLabel(value: string) {
  if (value === "contract") return "Contract";
  if (value === "asset") return "Equipment";
  if (value === "vehicle") return "Vehicle";
  return "Job";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently" : date.toLocaleString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
