"use client";

import LoadLinkSortControl from "@/components/LoadLinkSortControl";
import DriverVacancyResults from "@/components/DriverVacancyResults";
import ContractApplicationDraft from "@/components/ContractApplicationDraft";
import {formatListingRate} from "@/lib/formatCurrency";


import LoadLinkImage from "@/components/LoadLinkImage";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import LoadLinkPagination from "@/components/LoadLinkPagination";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";
import RequireAuthLink from "@/components/RequireAuthLink";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { flexibleMatch, normaliseSearch } from "@/lib/smartSearch";
import { matchesSouthAfricanLocation } from "@/lib/southAfricaLocations";
import { CONTRACT_TYPES, contractTypeFromDescription } from "@/lib/contractTypes";

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
  // Metadata belongs in structured listing details, not repeated in the marketplace card.
  const metadata=/^(?:Listing type|Vehicle needed|Needed by|Priority|Company|Contact person|Contact number|Phone|Contract type|Contract duration|Duration|Frequency|Pickup Location|Delivery Location|Cargo Type|Vehicle Required|Load Type|Load requirements):/i;
  return String(value || "").split(/\r?\n/).map(line=>line.trim()).filter(line=>line && !metadata.test(line)).join("\n\n").trim();
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
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [page, setPage] = useState(1);
  const [applyingTo,setApplyingTo] = useState<ContractRow|null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get("search") || "");
    setCity(params.get("city") || "");
    setGroup(params.get("category") || ALL);
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

  const categories = useMemo(() => [...CONTRACT_TYPES, ...Array.from(new Set(rows.filter((row) => !contractTypeFromDescription(row.description)).map((row) => String(row.vehicle_group || "").trim()).filter(Boolean))).sort()], [rows]);

  const filtered = useMemo(() => {
    const q = normaliseSearch(query);
    const next = rows.filter((row) => {
      const requested = vehicleNeeded(row);
      const searchable = `${row.title || ""} ${row.city || ""} ${row.vehicle_group || ""} ${requested} ${row.rate || ""} ${row.posted_by || ""} ${cleanDescription(row.description)}`;
      const type = contractTypeFromDescription(row.description);
      const groupMatches = group === ALL || normaliseSearch(type || row.vehicle_group || "") === normaliseSearch(group);
      return (!q || flexibleMatch(searchable, q)) && groupMatches && (!city.trim() || matchesSouthAfricanLocation(row.city || searchable, city));
    });
    return next.sort((a, b) => {
      if (sortMode === "starting") return startTime(a) - startTime(b);
      const left = new Date(a.created_at || 0).getTime();
      const right = new Date(b.created_at || 0).getTime();
      return sortMode === "oldest" ? left - right : right - left;
    });
  }, [rows, query, city, group, sortMode]);

  useEffect(() => setPage(1), [query, city, group, sortMode]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function searchContracts() {
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    if (city.trim()) params.set("city", city.trim());
    if (group !== ALL) params.set("category", group);
    if (sortMode !== "newest") params.set("sort", sortMode);
    window.history.replaceState({}, "", `${window.location.pathname}${params.size ? `?${params.toString()}` : ""}`);
    requestAnimationFrame(() => document.getElementById("matching-contracts")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function clearFilters() {
    setQuery(""); setCity(""); setGroup(ALL); setSortMode("newest");
    window.history.replaceState({}, "", window.location.pathname);
  }

  const surface = darkMode ? "border-white/10 bg-[#101010]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/52" : "text-black/52";
  const field = "h-12 w-full min-w-0 rounded-xl border border-[#dedede] bg-white px-4 text-base font-semibold text-[#171717] outline-none placeholder:text-[#929292] focus:border-[#f6b800]";
  const hasFilters = Boolean(query.trim() || city.trim() || group !== ALL || sortMode !== "newest");

  return (
    <main className={`min-h-screen scroll-smooth ${darkMode ? "bg-black text-white" : "bg-[#f8f8f7] text-black"}`} data-loadlink-contracts-marketplace="contract-search-20260823-restored">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="relative min-h-[78vh] overflow-hidden border-b border-[#f6b800]/40">
        <LoadLinkImage src="/images/contracts-1.jpg" alt="Transport and logistics contracts" className="absolute inset-0 h-full w-full object-cover grayscale" />
        <div className={`absolute inset-0 ${darkMode ? "bg-gradient-to-b from-black/15 via-black/48 to-black" : "bg-gradient-to-b from-black/8 via-black/38 to-[#f8f8f7]"}`} />

        <div className="relative mx-auto flex min-h-[78vh] max-w-5xl flex-col justify-end px-5 pb-8 pt-20">
          <div className="max-w-4xl text-white drop-shadow-[0_4px_16px_rgba(0,0,0,.95)]">
            <p className="text-[11px] font-black uppercase tracking-[.16em] text-white/60">Contracts</p>
            <h1 className="mt-3 text-5xl font-black leading-[.92] tracking-[-.06em] md:text-7xl">Find logistics contracts</h1>
            <p className="mt-5 max-w-2xl text-base font-bold leading-7 md:text-lg">Search recurring, project and longer-term opportunities by contract scope, equipment category and operating location.</p>
          </div>

          <div data-loadlink-contracts-search-shell className={`loadlink-glass mt-6 rounded-[24px] border p-4 shadow-[0_20px_60px_rgba(0,0,0,.18)] backdrop-blur-xl md:p-5 ${darkMode ? "border-white/20 bg-black/72 text-white" : "border-white/55 bg-[#b7b4ab]/85 text-black"}`}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block min-w-0">
                <span className={`mb-2 block text-[10px] font-black uppercase tracking-[.15em] ${darkMode ? "text-white/70" : "text-[#70716f]"}`}>Contract or scope</span>
                <input type="search" inputMode="search" value={query} onChange={event => setQuery(event.target.value)}
                  onKeyDown={event => { if (event.key === "Enter") searchContracts(); }}
                  placeholder="Mining, transport, recurring delivery..." className={field} />
              </label>
              <label className="relative block min-w-0">
                <span className={`mb-2 block text-[10px] font-black uppercase tracking-[.15em] ${darkMode ? "text-white/70" : "text-[#70716f]"}`}>Location</span>
                <SouthAfricaLocationInput id="loadlink-contract-location" value={city} onChange={setCity}
                  darkMode={darkMode} placeholder="City, town or province" ariaLabel="Contract location" className={field} />
              </label>
              <label className="block min-w-0 md:col-span-2">
                <span className={`mb-2 block text-[10px] font-black uppercase tracking-[.15em] ${darkMode ? "text-white/70" : "text-[#70716f]"}`}>Category</span>
                <select value={group} onChange={event => setGroup(event.target.value)} className={field}
                  aria-label="Contract category" style={{ colorScheme: "light" }}>
                  <option value={ALL}>All contract types</option>
                  {categories.map(item => <option value={item} key={item}>{item}</option>)}
                  <option value="Professional Driver">Professional Driver</option>
                </select>
              </label>
            </div>
            <button type="button" onClick={searchContracts}
              className="mt-4 min-h-12 w-full rounded-xl border border-[#f6b800] bg-[#f6b800] px-7 text-sm font-black uppercase tracking-wide text-black transition active:scale-[.99]">Search contracts</button>
            {hasFilters ? <button type="button" onClick={clearFilters}
              className={`mt-2 min-h-10 rounded-xl border px-4 text-xs font-semibold ${darkMode ? "border-white/15 text-white" : "border-black/15 text-black"}`}>Clear search</button> : null}
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
            <p className={`mt-2 text-xs font-semibold ${muted}`}>{group==="Professional Driver" ? "Professional driver contract opportunities" : loading ? "Loading current contracts…" : `${filtered.length} current ${filtered.length === 1 ? "contract" : "contracts"}`}</p>
          </div>
          <LoadLinkSortControl darkMode={darkMode} value={sortMode} onChange={(value) => setSortMode(value as SortMode)} options={[{ value: "newest", label: "Newest first" }, { value: "starting", label: "Starting soonest" }, { value: "oldest", label: "Oldest first" }]} />
        </div>

        {error ? <div className="mb-5 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm font-bold text-red-600">{error}</div> : null}

        {group==="Professional Driver" ? (
          <DriverVacancyResults term="contract" keyword={query} city={city} darkMode={darkMode} />
        ) : loading ? (
          <div className="grid gap-5">{Array.from({ length: 3 }).map((_, index) => <div key={index} className={`h-56 animate-pulse rounded-[22px] border ${surface}`} />)}</div>
        ) : visible.length ? (
          <div className="grid gap-5">
            {visible.map((row) => {
              const image = row.photos?.[0] || "/images/contracts-1.jpg";
              return (
                <article id={`contract-${row.id}`} key={row.id} className={`overflow-hidden rounded-[22px] border shadow-[0_12px_34px_rgba(0,0,0,.045)] ${surface}`}>
                  <Link href={`/contracts/${row.id}`} className="block aspect-[16/9] w-full overflow-hidden bg-[#111] sm:aspect-[21/9]" aria-label="Open contract">
                    <LoadLinkImage src={image} alt="" className="h-full w-full object-cover" onError={event=>{event.currentTarget.style.display="none"}}/>
                  </Link>
                  <div className="p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 text-[26px] font-black tracking-[-.04em]">{row.rate?formatListingRate(row.rate):"Rate on request"}</p>
                      <span className="shrink-0 rounded-full bg-[#e5f4e9] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#237847]">Contract</span>
                    </div>
                    <Link href={`/contracts/${row.id}`} className="mt-3 block break-words text-[22px] font-black leading-[1.25] tracking-[-.035em] hover:underline sm:text-2xl">{(row.title||"Transport contract").replace(/^Contract Title:\s*/i,"")}</Link>
                    <p className={`mt-2 text-[13px] font-semibold ${muted}`}>{[row.city,row.vehicle_group].filter(Boolean).join(" · ")||"South Africa"}</p>
                    {startLabel(row)!=="Start date in details"?<p className={`mt-1 text-xs font-medium ${muted}`}>{startLabel(row)}</p>:null}
                    <div className={`mt-4 flex min-w-0 items-center justify-between gap-3 border-t pt-3 text-xs ${darkMode?"border-white/10 text-white/55":"border-black/10 text-black/55"}`}>
                      <span className="min-w-0 truncate">{row.posted_by||"LoadLink poster"}</span><span className="shrink-0">{posted(row.created_at)}</span>
                    </div>
                    <details className={`group mt-3 overflow-hidden rounded-xl border ${darkMode?"border-white/15":"border-black/10"}`}>
                      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-bold">
                        View full details<span className="text-lg font-medium opacity-55 group-open:rotate-45">+</span>
                      </summary>
                      <div className={`border-t px-4 pb-4 pt-3 ${darkMode?"border-white/10":"border-black/10"}`}>
                        <p className={`whitespace-pre-line break-words text-sm leading-6 ${muted}`}>{cleanDescription(row.description)||"See the contract page for the full requirements."}</p>
                        <Link href={`/contracts/${row.id}`} className="mt-3 inline-flex text-xs font-bold underline underline-offset-4">Open contract page</Link>
                      </div>
                    </details>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" onClick={()=>setApplyingTo(row)} className="flex min-h-12 items-center justify-center rounded-xl bg-[#f6b800] px-2.5 text-center text-[13px] font-bold text-black">Apply with profile</button>
                      <Link href={`/messages?listing=${encodeURIComponent(row.id)}`} className={`flex min-h-12 items-center justify-center rounded-xl border px-2.5 text-center text-[13px] font-bold ${darkMode?"border-white/15":"border-black/15"}`}>Message poster</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <section className={`rounded-[22px] border p-8 text-center ${surface}`}><h2 className="text-xl font-black">No matching contracts</h2><p className={`mt-2 text-sm font-semibold ${muted}`}>Try a broader scope, vehicle category or location. Ordinary jobs remain in the Jobs marketplace.</p>{hasFilters ? <button type="button" onClick={clearFilters} className="mt-5 rounded-xl bg-[#f6b800] px-5 py-3 text-xs font-black text-black">Clear filters</button> : null}</section>
        )}

        {group!=="Professional Driver" && totalPages > 1 ? <LoadLinkPagination current={page} total={totalPages} onChange={setPage} darkMode={darkMode} label="Contract pages" /> : null}
      </section>
      {applyingTo?<ContractApplicationDraft listingId={applyingTo.id} title={(applyingTo.title||"Transport contract").replace(/^Contract Title:\s*/i,"")} city={applyingTo.city||""} rate={applyingTo.rate||""} vehicle={vehicleNeeded(applyingTo)||applyingTo.vehicle_group||""} darkMode={darkMode} onClose={()=>setApplyingTo(null)}/>:null}
    </main>
  );
}
