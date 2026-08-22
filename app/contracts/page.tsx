"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import LoadLinkPagination from "@/components/LoadLinkPagination";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";
import RequireAuthLink from "@/components/RequireAuthLink";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { flexibleMatch, normaliseSearch } from "@/lib/smartSearch";
import { matchesSouthAfricanLocation } from "@/lib/southAfricaLocations";

type ContractRow = {
  id: string;
  title?: string | null;
  city?: string | null;
  vehicle_group?: string | null;
  rate?: string | null;
  posted_by?: string | null;
  poster_photo?: string | null;
  description?: string | null;
  photos?: string[] | null;
  created_at?: string | null;
  status?: string | null;
  moderation_status?: string | null;
  listing_kind?: string | null;
  expires_at?: string | null;
};

type SortMode = "newest" | "oldest";
const PAGE_SIZE = 7;

function isContract(row: ContractRow) {
  const kind = String(row.listing_kind || "").toLowerCase();
  if (kind === "contract") return true;
  return /^Listing type:\s*Contract/im.test(String(row.description || ""));
}

function isCurrent(row: ContractRow) {
  if (row.status && row.status !== "active") return false;
  if (row.moderation_status && row.moderation_status !== "approved") return false;
  if (row.expires_at) {
    const expiry = new Date(row.expires_at).getTime();
    if (Number.isFinite(expiry) && expiry <= Date.now()) return false;
  }
  return true;
}

function cleanDescription(value: string | null | undefined) {
  return String(value || "")
    .replace(/^Listing type:\s*[^\n]+\n?/im, "")
    .replace(/^Vehicle needed:\s*[^\n]+\n?/im, "")
    .replace(/^Needed by:\s*[^\n]+\n?/im, "")
    .replace(/^Priority:\s*[^\n]+\n?/im, "")
    .trim();
}

function posted(value: string | null | undefined) {
  if (!value) return "Posted recently";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Posted recently";
  const diff = Math.max(0, Date.now() - date.getTime());
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return "Posted today";
  if (days < 30) return `Posted ${days} day${days === 1 ? "" : "s"} ago`;
  return new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export default function ContractsPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get("search") || "");
    setCity(params.get("city") || "");
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/job-listings?t=${Date.now()}`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Contracts could not load.");
        return response.json();
      })
      .then((payload) => {
        if (!active) return;
        setRows(((payload.rows || []) as ContractRow[]).filter((row) => isCurrent(row) && isContract(row)));
        setError("");
      })
      .catch((reason) => {
        if (!active) return;
        setRows([]);
        setError(reason instanceof Error ? reason.message : "Contracts could not load.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = normaliseSearch(query);
    const next = rows.filter((row) => {
      const searchable = `${row.title || ""} ${row.city || ""} ${row.vehicle_group || ""} ${row.rate || ""} ${row.posted_by || ""} ${cleanDescription(row.description)}`;
      return (!q || flexibleMatch(searchable, q)) && (!city.trim() || matchesSouthAfricanLocation(row.city || searchable, city));
    });
    return next.sort((a, b) => {
      const left = new Date(a.created_at || 0).getTime();
      const right = new Date(b.created_at || 0).getTime();
      return sortMode === "oldest" ? left - right : right - left;
    });
  }, [rows, query, city, sortMode]);

  useEffect(() => setPage(1), [query, city, sortMode]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function searchContracts() {
    requestAnimationFrame(() => document.getElementById("matching-contracts")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/52" : "text-black/52";

  return (
    <main className={`min-h-screen scroll-smooth ${darkMode ? "bg-black text-white" : "bg-[#fff7df] text-black"}`} data-loadlink-contracts-marketplace="jobs-pattern">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="relative min-h-[78vh] overflow-hidden border-b border-[#f6b800]/40">
        <img src="/images/contracts-1.jpg" alt="Transport and logistics contracts" className="absolute inset-0 h-full w-full object-cover grayscale" />
        <div className={`absolute inset-0 ${darkMode ? "bg-gradient-to-b from-black/15 via-black/48 to-black" : "bg-gradient-to-b from-black/8 via-black/38 to-[#fff7df]"}`} />

        <div className="relative mx-auto flex min-h-[78vh] max-w-5xl flex-col justify-end px-5 pb-8 pt-20">
          <div className="max-w-4xl text-white drop-shadow-[0_4px_16px_rgba(0,0,0,.95)]">
            <p className="text-[11px] font-black uppercase tracking-[.16em] text-[#f6b800]">Contracts</p>
            <h1 className="mt-3 text-5xl font-black leading-[.92] tracking-[-.06em] md:text-7xl">Find logistics contracts</h1>
            <p className="mt-5 max-w-2xl text-base font-bold leading-7 md:text-lg">Browse recurring, project and longer-term transport opportunities. Contract listings stay separate from ordinary jobs.</p>
          </div>

          <div data-loadlink-contracts-search-shell className={`loadlink-glass mt-6 rounded-2xl border p-4 shadow-[0_20px_60px_rgba(0,0,0,.18)] backdrop-blur-md md:p-5 ${darkMode ? "border-[#f6b800]/55 bg-black/72" : "border-white/55 bg-white/68"}`}>
            <div className="grid gap-3 md:grid-cols-[1.25fr_1fr_auto]">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[.18em] text-[#f6b800]">Contract or vehicle type</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") searchContracts(); }} placeholder="Mining, recurring delivery, side tipper…" className="h-12 w-full rounded-xl border border-white/15 bg-white px-4 text-base font-semibold text-black outline-none placeholder:text-neutral-500 focus:border-[#f6b800]" />
              </label>
              <label className="relative block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[.18em] text-[#f6b800]">Location</span>
                <SouthAfricaLocationInput id="loadlink-contract-location" value={city} onChange={setCity} darkMode={false} placeholder="City, town or province" ariaLabel="Contract location" className="h-12 w-full rounded-xl border border-white/15 bg-white px-4 text-base font-semibold text-black outline-none placeholder:text-neutral-500 focus:border-[#f6b800]" />
              </label>
              <button type="button" onClick={searchContracts} className="mt-6 h-12 rounded-xl border border-[#f6b800] bg-[#f6b800] px-7 text-sm font-black uppercase tracking-wide text-black active:scale-[.99] md:mt-auto">Search contracts</button>
            </div>
          </div>

          <div className="mt-5 grid max-w-xl gap-3 sm:grid-cols-2">
            <RequireAuthLink href="/jobs/list?mode=contract" className="flex min-h-12 items-center justify-center rounded-xl bg-[#f6b800] px-4 text-xs font-black uppercase tracking-[.08em] text-black">Post contract</RequireAuthLink>
            <RequireAuthLink href="/my-posts" className="flex min-h-12 items-center justify-center rounded-xl border border-white/35 bg-black/80 px-4 text-xs font-black uppercase tracking-[.08em] text-white">My posts</RequireAuthLink>
          </div>
        </div>
      </section>

      <section id="matching-contracts" className="mx-auto max-w-5xl scroll-mt-24 px-5 pb-14 pt-8">
        <div className="mb-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <h2 className="text-4xl font-black tracking-[-.05em]">Available contracts</h2>
            <p className={`mt-2 text-xs font-semibold ${muted}`}>{loading ? "Loading current contracts…" : `${filtered.length} current ${filtered.length === 1 ? "contract" : "contracts"}`}</p>
          </div>
          <label className={`flex h-11 items-center gap-2 rounded-xl border px-3 text-xs font-bold ${surface}`}>
            <span className={muted}>Sort by</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="bg-transparent font-black outline-none"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
          </label>
        </div>

        {error ? <div className="mb-5 border border-red-500/40 bg-red-500/10 p-4 text-sm font-bold text-red-600">{error}</div> : null}

        {loading ? (
          <div className="grid gap-5">{Array.from({ length: 3 }).map((_, index) => <div key={index} className={`h-56 animate-pulse rounded-[22px] border ${surface}`} />)}</div>
        ) : visible.length ? (
          <div className="grid gap-5">
            {visible.map((row) => {
              const image = row.photos?.[0] || "/images/contracts-1.jpg";
              return (
                <article id={`contract-${row.id}`} key={row.id} className={`overflow-hidden rounded-[22px] border shadow-[0_12px_34px_rgba(0,0,0,.06)] ${surface}`}>
                  <div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
                    <Link href={`/contracts/${row.id}`} className="relative block aspect-[16/9] overflow-hidden bg-[#111] md:aspect-auto md:min-h-[220px]">
                      <img src={image} alt="" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                      <span className="absolute left-3 top-3 rounded-full bg-[#1ca55c] px-3 py-1 text-[9px] font-black uppercase tracking-[.08em] text-white">Contract</span>
                    </Link>
                    <div className="p-5 md:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0"><Link href={`/contracts/${row.id}`} className="text-2xl font-black tracking-[-.04em] hover:underline">{row.title || "Logistics contract"}</Link><p className={`mt-2 text-sm font-semibold ${muted}`}>{[row.city, row.vehicle_group].filter(Boolean).join(" · ") || "South Africa"}</p></div>
                        <span className="shrink-0 text-base font-black text-[#b78300]">{row.rate || "Rate on request"}</span>
                      </div>
                      <p className={`mt-4 line-clamp-3 text-sm font-semibold leading-6 ${muted}`}>{cleanDescription(row.description) || "Open this contract to view the full requirements and contact information."}</p>
                      <div className={`mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-[11px] font-semibold ${darkMode ? "border-white/10 text-white/42" : "border-black/8 text-black/42"}`}><span>{row.posted_by || "LoadLink poster"}</span><span>{posted(row.created_at)}</span></div>
                      <div className="mt-4 grid grid-cols-2 gap-2"><Link href={`/contracts/${row.id}`} className="flex min-h-11 items-center justify-center rounded-xl bg-[#f6b800] px-3 text-[11px] font-black text-black">View full details</Link><Link href={`/messages?listing=${encodeURIComponent(row.id)}`} className={`flex min-h-11 items-center justify-center rounded-xl border px-3 text-[11px] font-black ${darkMode ? "border-white/14" : "border-black/12"}`}>Message poster</Link></div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <section className={`rounded-[22px] border p-8 text-center ${surface}`}><h2 className="text-xl font-black">No matching contracts</h2><p className={`mt-2 text-sm font-semibold ${muted}`}>Try a broader keyword or location. Jobs remain in the Jobs marketplace.</p></section>
        )}

        {totalPages > 1 ? <LoadLinkPagination current={page} total={totalPages} onChange={setPage} darkMode={darkMode} label="Contract pages" /> : null}
      </section>
    </main>
  );
}
