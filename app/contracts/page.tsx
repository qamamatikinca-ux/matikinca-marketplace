"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import LoadLinkPagination from "@/components/LoadLinkPagination";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";
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
  return new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export default function ContractsPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const params = useSearchParams();
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState(() => params.get("search") || "");
  const [city, setCity] = useState(() => params.get("city") || "");
  const [page, setPage] = useState(1);

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
        const next = ((payload.rows || []) as ContractRow[]).filter((row) => isCurrent(row) && isContract(row));
        setRows(next);
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
    return rows
      .filter((row) => {
        const searchable = `${row.title || ""} ${row.city || ""} ${row.vehicle_group || ""} ${row.rate || ""} ${row.posted_by || ""} ${cleanDescription(row.description)}`;
        const queryMatch = !q || flexibleMatch(searchable, q);
        const cityMatch = !city.trim() || matchesSouthAfricanLocation(row.city || searchable, city);
        return queryMatch && cityMatch;
      })
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [rows, query, city]);

  useEffect(() => setPage(1), [query, city]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/52" : "text-black/52";

  return (
    <main className={`min-h-screen ${darkMode ? "bg-black text-white" : "bg-[#fff6dc] text-black"}`} data-loadlink-contracts-marketplace="true">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-7 sm:px-6 md:pt-10">
        <header className="flex flex-col gap-5 border-b border-current/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[.13em] text-[#b78300]">Contracts</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.05em] sm:text-5xl">Longer-term logistics work.</h1>
            <p className={`mt-3 text-sm font-semibold leading-6 ${muted}`}>Only contract listings appear here. Jobs and vehicle listings stay in their own marketplaces.</p>
          </div>
          <Link href="/jobs/list?mode=contract" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-xs font-black text-black">Post a contract</Link>
        </header>

        <section className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(240px,.55fr)]">
          <label className={`flex h-14 items-center rounded-[16px] border px-4 ${surface}`}>
            <span className="sr-only">Search contracts</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search contracts, vehicle type or company" className="w-full bg-transparent text-[15px] font-semibold outline-none placeholder:opacity-40" />
          </label>
          <SouthAfricaLocationInput id="loadlink-contract-location" value={city} onChange={setCity} darkMode={darkMode} placeholder="City, town or province" ariaLabel="Contract location" className={`h-14 w-full rounded-[16px] border px-4 text-[15px] font-semibold outline-none ${surface}`} />
        </section>

        {loading ? (
          <div className="mt-7 grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => <div key={index} className={`h-64 animate-pulse rounded-[22px] border ${surface}`} />)}</div>
        ) : error ? (
          <div className={`mt-7 rounded-[20px] border p-5 text-sm font-semibold ${surface}`}>{error}</div>
        ) : visible.length ? (
          <section className="mt-7 grid gap-4 md:grid-cols-2" aria-label="Available contracts">
            {visible.map((row) => {
              const image = row.photos?.[0] || "/images/contracts-1.jpg";
              return (
                <article id={`contract-${row.id}`} key={row.id} className={`overflow-hidden rounded-[22px] border ${surface}`}>
                  <Link href={`/contracts/${row.id}`} className="block">
                    <div className="relative aspect-[16/9] overflow-hidden bg-[#111]">
                      <img src={image} alt="" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                      <span className="absolute left-3 top-3 rounded-full bg-black/72 px-3 py-1 text-[9px] font-black uppercase tracking-[.08em] text-white backdrop-blur">Contract</span>
                    </div>
                  </Link>
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Link href={`/contracts/${row.id}`} className="block text-xl font-black tracking-[-.035em] hover:underline">{row.title || "Logistics contract"}</Link>
                        <p className={`mt-1 text-xs font-semibold ${muted}`}>{[row.city, row.vehicle_group].filter(Boolean).join(" · ") || "South Africa"}</p>
                      </div>
                      <span className="shrink-0 text-sm font-black text-[#b78300]">{row.rate || "Rate on request"}</span>
                    </div>
                    <p className={`mt-4 line-clamp-3 text-sm font-semibold leading-6 ${muted}`}>{cleanDescription(row.description) || "Open the contract for full requirements and contact information."}</p>
                    <div className={`mt-4 flex items-center justify-between border-t pt-4 text-[10px] font-semibold ${darkMode ? "border-white/10 text-white/42" : "border-black/8 text-black/42"}`}>
                      <span className="truncate">{row.posted_by || "LoadLink poster"}</span><span>{posted(row.created_at)}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Link href={`/contracts/${row.id}`} className="flex min-h-11 items-center justify-center rounded-xl bg-[#f6b800] px-3 text-[11px] font-black text-black">View contract</Link>
                      <Link href={`/messages?listing=${encodeURIComponent(row.id)}`} className={`flex min-h-11 items-center justify-center rounded-xl border px-3 text-[11px] font-black ${darkMode ? "border-white/14" : "border-black/12"}`}>Message poster</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className={`mt-7 rounded-[22px] border p-8 text-center ${surface}`}><h2 className="text-xl font-black">No matching contracts</h2><p className={`mt-2 text-sm font-semibold ${muted}`}>Try a broader keyword or location. Jobs are intentionally not mixed into this page.</p></section>
        )}

        {totalPages > 1 ? <div className="mt-8"><LoadLinkPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} /></div> : null}
      </div>
    </main>
  );
}
