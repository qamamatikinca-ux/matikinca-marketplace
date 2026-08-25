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
  work_starts_at?: string | null;
};

type SortMode = "newest" | "starting" | "oldest";
const PAGE_SIZE = 7;
const ALL = "all";

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

function readMeta(value: string | null | undefined, label: string) {
  return String(value || "").match(new RegExp(`^${label}:\\s*([^\\n]+)`, "im"))?.[1]?.trim() || "";
}

function vehicleNeeded(row: ContractRow) {
  return readMeta(row.description, "Vehicle needed");
}

function startTime(row: ContractRow) {
  const source = row.work_starts_at || readMeta(row.description, "Needed by");
  const parsed = source ? new Date(source).getTime() : Number.POSITIVE_INFINITY;
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
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

function startLabel(row: ContractRow) {
  const source = row.work_starts_at || readMeta(row.description, "Needed by");
  if (!source) return "Start date in details";
  const date = new Date(source);
  if (!Number.isFinite(date.getTime())) return "Start date in details";
  return `Starts ${new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(date)}`;
}

export default function ContractsPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [group, setGroup] = useState(ALL);
  const [equipment, setEquipment] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get("search") || "");
    setCity(params.get("city") || "");
    setGroup(params.get("category") || ALL);
    setEquipment(params.get("equipment") || "");
    const sort = params.get("sort");
    if (sort === "oldest" || sort === "starting" || sort === "newest") setSortMode(sort);
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

  const categories = useMemo(() => Array.from(new Set(rows.map((row) => String(row.vehicle_group || "").trim()).filter(Boolean))).sort(), [rows]);

  const filtered = useMemo(() => {
    const q = normaliseSearch(query);
    const equipmentQuery = normaliseSearch(equipment);
    const next = rows.filter((row) => {
      const requested = vehicleNeeded(row);
      const searchable = `${row.title || ""} ${row.city || ""} ${row.vehicle_group || ""} ${requested} ${row.rate || ""} ${row.posted_by || ""} ${cleanDescription(row.description)}`;
      const groupMatches = group === ALL || normaliseSearch(row.vehicle_group || "") === normaliseSearch(group);
      const equipmentMatches = !equipmentQuery || flexibleMatch(`${requested} ${row.title || ""} ${cleanDescription(row.description)}`, equipmentQuery);
      return (!q || flexibleMatch(searchable, q)) && groupMatches && equipmentMatches && (!city.trim() || matchesSouthAfricanLocation(row.city || searchable, city));
    });
    return next.sort((a, b) => {
      if (sortMode === "starting") return startTime(a) - startTime(b);
      const left = new Date(a.created_at || 0).getTime();
      const right = new Date(b.created_at || 0).getTime();
      return sortMode === "oldest" ? left - right : right - left;
    });
  }, [rows, query, city, group, equipment, sortMode]);

  useEffect(() => setPage(1), [query, city, group, equipment, sortMode]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function searchContracts() {
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    if (city.trim()) params.set("city", city.trim());
    if (group !== ALL) params.set("category", group);
    if (equipment.trim()) params.set("equipment", equipment.trim());
    if (sortMode !== "newest") params.set("sort", sortMode);
    window.history.replaceState({}, "", `${window.location.pathname}${params.size ? `?${params.toString()}` : ""}`);
    requestAnimationFrame(() => document.getElementById("matching-contracts")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function clearFilters() {
    setQuery(""); setCity(""); setGroup(ALL); setEquipment(""); setSortMode("newest");
    window.history.replaceState({}, "", window.location.pathname);
  }

  const surface = darkMode ? "border-white/10 bg-white/[.045] backdrop-blur-xl" : "border-black/10 bg-white/72 backdrop-blur-xl";
  const muted = darkMode ? "text-white/52" : "text-black/52";
  const field = "h-12 w-full rounded-xl border border-white/15 bg-white px-4 text-base font-semibold text-black outline-none placeholder:text-neutral-500 focus:border-[#f6b800]";
  const hasFilters = Boolean(query.trim() || city.trim() || equipment.trim() || group !== ALL || sortMode !== "newest");

  return (
    <main className={`min-h-screen scroll-smooth ${darkMode ? "bg-black text-white" : "bg-[#fff7df] text-black"}`} data-loadlink-contracts-marketplace="contract-search-20260823-restored">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="relative min-h-[78vh] overflow-hidden border-b border-[#f6b800]/40">
        <img src="/images/contracts-1.jpg" alt="Transport and logistics contracts" className="absolute inset-0 h-full w-full object-cover grayscale" />
        <div className={`absolute inset-0 ${darkMode ? "bg-gradient-to-b from-black/15 via-black/48 to-black" : "bg-gradient-to-b from-black/8 via-black/38 to-[#fff7df]"}`} />

        <div className="relative mx-auto flex min-h-[78vh] max-w-5xl flex-col justify-end px-5 pb-8 pt-20">
          <div className="max-w-4xl text-white drop-shadow-[0_4px_16px_rgba(0,0,0,.95)]">
            <p className="text-[11px] font-black uppercase tracking-[.16em] text-white/60">Contracts</p>
            <h1 className="mt-3 text-5xl font-black leading-[.92] tracking-[-.06em] md:text-7xl">Find logistics contracts</h1>
            <p className="mt-5 max-w-2xl text-base font-bold leading-7 md:text-lg">Search recurring, project and longer-term opportunities by contract scope, equipment category and operating location.</p>
          </div>

          <div data-loadlink-contracts-search-shell className={`loadlink-glass mt-6 rounded-[24px] border p-4 shadow-[0_20px_60px_rgba(0,0,0,.18)] backdrop-blur-xl md:p-5 ${darkMode ? "border-white/20 bg-black/72" : "border-white/55 bg-white/68"}`}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[.15em] text-neutral-500">Contract / scope</span>
                <input type="text" inputMode="text" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") searchContracts(); }} placeholder="Mining haulage, recurring delivery, tender…" className={field} />
              </label>
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[.15em] text-neutral-500">Category</span>
                <select value={group} onChange={(event) => setGroup(event.target.value)} className={field} aria-label="Contract category">
                  <option value={ALL}>All categories</option>
                  {categories.map((item) => <option value={item} key={item}>{item}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[.15em] text-neutral-500">Vehicle / mobile unit needed</span>
                <input type="text" inputMode="text" value={equipment} onChange={(event) => setEquipment(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") searchContracts(); }} placeholder="Side tipper, lowbed, reefer, mobile unit…" className={field} />
              </label>
              <label className="relative block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[.15em] text-neutral-500">Operating location</span>
                <SouthAfricaLocationInput id="loadlink-contract-location" value={city} onChange={setCity} darkMode={false} placeholder="City, town or province" ariaLabel="Contract location" className={field} />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={searchContracts} className="min-h-12 flex-1 rounded-xl border border-[#f6b800] bg-[#f6b800] px-7 text-sm font-black uppercase tracking-wide text-black active:scale-[.99] sm:flex-none">Search contracts</button>
              {hasFilters ? <button type="button" onClick={clearFilters} className="min-h-12 rounded-xl border border-white/24 bg-black/45 px-5 text-xs font-black text-white">Clear</button> : null}
            </div>
          </div>

          <div className="mt-5 grid max-w-xl gap-3 sm:grid-cols-2">
            <RequireAuthLink href="/contracts/post" className="flex min-h-12 items-center justify-center rounded-xl bg-[#f6b800] px-4 text-xs font-black uppercase tracking-[.08em] text-black">Post contract</RequireAuthLink>
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
          <label className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs font-bold ${surface}`}>
            <span className={muted}>Sort by</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="bg-transparent font-black outline-none"><option value="newest">Newest first</option><option value="starting">Starting soonest</option><option value="oldest">Oldest first</option></select>
          </label>
        </div>

        {error ? <div className="mb-5 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm font-bold text-red-600">{error}</div> : null}

        {loading ? (
          <div className="grid gap-5">{Array.from({ length: 3 }).map((_, index) => <div key={index} className={`h-56 animate-pulse rounded-[22px] border ${surface}`} />)}</div>
        ) : visible.length ? (
          <div className="grid gap-5">
            {visible.map((row) => {
              const image = row.photos?.[0] || "/images/contracts-1.jpg";
              const requested = vehicleNeeded(row);
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
                        <span className="shrink-0 text-base font-black">{row.rate || "Rate on request"}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {requested ? <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${darkMode ? "border-white/12 bg-white/[.04]" : "border-black/8 bg-black/[.025]"}`}>{requested}</span> : null}
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${darkMode ? "border-white/18 text-white/70" : "border-black/12 text-black/60"}`}>{startLabel(row)}</span>
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
          <section className={`rounded-[22px] border p-8 text-center ${surface}`}><h2 className="text-xl font-black">No matching contracts</h2><p className={`mt-2 text-sm font-semibold ${muted}`}>Try a broader scope, vehicle category or location. Ordinary jobs remain in the Jobs marketplace.</p>{hasFilters ? <button type="button" onClick={clearFilters} className="mt-5 rounded-xl bg-[#f6b800] px-5 py-3 text-xs font-black text-black">Clear filters</button> : null}</section>
        )}

        {totalPages > 1 ? <LoadLinkPagination current={page} total={totalPages} onChange={setPage} darkMode={darkMode} label="Contract pages" /> : null}
      </section>
    </main>
  );
}
