"use client";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";
import LoadLinkPagination from "@/components/LoadLinkPagination";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import {
  type DealerSearchRow,
  type DriverSearchRow,
  type ListingSearchRow,
  type SearchResult,
  type SearchScope,
  dealerToSearchResult,
  driverToSearchResult,
  filterAndRankResults,
  isCurrentListing,
  listingToSearchResult,
  loadLinkSitePages,
  placeholderForScope,
  scopeLabel,
  searchScopes,
} from "@/lib/loadlinkSearch";

const RESULTS_PER_PAGE = 7;

function searchResultsRoute(scope: SearchScope, query: string, location: string) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (location.trim()) params.set("location", location.trim());
  if (scope !== "all") params.set("category", scope);
  const value = params.toString();
  return `/search${value ? `?${value}` : ""}`;
}

export default function SearchResultsClient() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const router = useRouter();
  const params = useSearchParams();

  const query = params.get("q") || "";
  const location = params.get("location") || "";
  const requestedScope = params.get("category") as SearchScope | null;
  const scope: SearchScope = ["job", "contract", "asset", "driver", "dealer", "page"].includes(requestedScope || "")
    ? requestedScope!
    : "all";

  const [input, setInput] = useState(query);
  const [place, setPlace] = useState(location);
  const [filtersOpen, setFiltersOpen] = useState(Boolean(location));
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<ListingSearchRow[]>([]);
  const [drivers, setDrivers] = useState<DriverSearchRow[]>([]);
  const [dealers, setDealers] = useState<DealerSearchRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setInput(query);
    setPlace(location);
    setFiltersOpen(Boolean(location));
    setCurrentPage(1);
  }, [location, query, scope]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.allSettled([
      fetch(`/api/job-listings?t=${Date.now()}`, { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/phase2/public-drivers?limit=50&offset=0", { cache: "no-store" }).then((response) => response.json()),
      isSupabaseConfigured
        ? supabase
            .from("dealership_profiles")
            .select("id,slug,name,short_bio,business_description,physical_location,province,verification_status,is_public")
            .eq("verification_status", "approved")
            .eq("is_public", true)
            .order("updated_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [], error: null }),
    ]).then(([listingResult, driverResult, dealerResult]) => {
      if (!active) return;

      if (listingResult.status === "fulfilled") {
        setListings(((listingResult.value.rows || []) as ListingSearchRow[]).filter(isCurrentListing));
      }
      if (driverResult.status === "fulfilled") {
        setDrivers((driverResult.value.drivers || []) as DriverSearchRow[]);
      }
      if (dealerResult.status === "fulfilled" && !dealerResult.value.error) {
        setDealers((dealerResult.value.data || []) as unknown as DealerSearchRow[]);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const includeSitePages = useMemo(
    () => scope === "all" && /\b(help|support|settings|packages|messages|notifications|verify|verification|account|profile)\b/i.test(query),
    [query, scope],
  );

  const results = useMemo<SearchResult[]>(
    () =>
      filterAndRankResults(
        [
          ...listings.map(listingToSearchResult),
          ...drivers.map(driverToSearchResult),
          ...dealers.map(dealerToSearchResult),
          ...(includeSitePages ? loadLinkSitePages : []),
        ],
        scope,
        query,
        location,
      ),
    [dealers, drivers, includeSitePages, listings, location, query, scope],
  );

  const totalPages = Math.max(1, Math.ceil(results.length / RESULTS_PER_PAGE));
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * RESULTS_PER_PAGE;
    return results.slice(start, start + RESULTS_PER_PAGE);
  }, [currentPage, results]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const visibleScopes = useMemo(
    () => searchScopes.filter((item) => item.value !== "page"),
    [],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(searchResultsRoute(scope, input, place));
  }

  function chooseScope(nextScope: SearchScope) {
    router.push(searchResultsRoute(nextScope, input, place));
  }

  function changePage(nextPage: number) {
    setCurrentPage(Math.min(totalPages, Math.max(1, nextPage)));
    requestAnimationFrame(() => {
      document.querySelector('[data-loadlink-search-results="true"]')?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const resultCountLabel = loading ? "Searching…" : `${results.length} ${results.length === 1 ? "result" : "results"}`;
  const surface = darkMode ? "border-white/10 bg-[#0d0d0d]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/52" : "text-black/52";

  return (
    <main
      data-loadlink-search-page="autotrader-results"
      className={darkMode ? "min-h-screen overflow-x-hidden bg-black text-white" : "min-h-screen overflow-x-hidden bg-[#f6f2e8] text-black"}
    >
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className={`border-b ${darkMode ? "border-white/10 bg-[#050505]" : "border-black/10 bg-white"}`}>
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-5 md:px-8 md:py-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className={`text-[11px] font-semibold uppercase tracking-[.1em] ${muted}`}>LoadLink marketplace</p>
              <h1 className="mt-1 text-2xl font-black tracking-[-.035em] sm:text-3xl">Find what you need</h1>
            </div>
            <Link href="/" className={`hidden text-[12px] font-semibold sm:inline ${muted}`}>Back home</Link>
          </div>

          <div className="no-scrollbar mt-4 overflow-x-auto py-1" role="tablist" aria-label="Search LoadLink sections">
            <div className="flex min-w-max items-center gap-1.5">
              {visibleScopes.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={scope === item.value}
                  onClick={() => chooseScope(item.value)}
                  className={`h-9 shrink-0 rounded-[11px] border px-3 text-[12px] font-semibold transition active:scale-[.98] ${
                    scope === item.value
                      ? "border-[#f6b800] bg-[#f6b800] text-black"
                      : darkMode
                        ? "border-white/14 bg-white/[.025] text-white/72"
                        : "border-black/10 bg-white text-black/64"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={submit} className={`mt-3 rounded-[18px] border p-2.5 ${surface}`}>
            <div className={`grid h-[52px] grid-cols-[44px_minmax(0,1fr)] items-center overflow-hidden rounded-[13px] border ${darkMode ? "border-white/10 bg-[#171717]" : "border-black/10 bg-[#fafafa]"}`}>
              <span className={`flex h-full items-center justify-center ${darkMode ? "text-[#f6b800]" : "text-black/45"}`}><SearchIcon /></span>
              <label htmlFor="loadlink-results-search" className="sr-only">Search LoadLink</label>
              <input
                id="loadlink-results-search"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={placeholderForScope(scope)}
                autoComplete="off"
                className={`h-full min-w-0 border-0 bg-transparent px-1 pr-3 text-[15px] font-medium outline-none ${darkMode ? "text-white placeholder:text-white/38" : "text-black placeholder:text-black/38"}`}
              />
            </div>

            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
              <button
                type="button"
                onClick={() => setFiltersOpen((value) => !value)}
                aria-expanded={filtersOpen}
                className={`flex h-11 min-w-0 items-center gap-2 rounded-[12px] border px-3 text-left text-[12px] font-semibold ${darkMode ? "border-white/10 bg-white/[.035] text-white/75" : "border-black/10 bg-white text-black/65"}`}
              >
                <FilterIcon />
                <span className="truncate">{place || "Filters"}</span>
              </button>
              <button type="submit" className="h-11 shrink-0 rounded-[12px] bg-[#f6b800] px-4 text-[12px] font-semibold text-black transition active:scale-[.985] sm:px-5">
                Search {loading ? "" : results.length}
              </button>
            </div>

            {filtersOpen ? (
              <div className="mt-2">
                <SouthAfricaLocationInput
                  id="loadlink-results-location"
                  value={place}
                  onChange={setPlace}
                  darkMode={darkMode}
                  placeholder="City, town or province"
                  ariaLabel="Filter LoadLink search results by South African location"
                  className={`h-11 w-full rounded-[12px] border px-3 text-[14px] font-medium outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/10 bg-[#171717] text-white placeholder:text-white/38" : "border-black/10 bg-[#fafafa] text-black placeholder:text-black/38"}`}
                />
              </div>
            ) : null}
          </form>
        </div>
      </section>

      <section data-loadlink-search-results="true" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-6 sm:px-5 md:px-8 md:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-current/10 pb-4">
          <div>
            <h2 className="text-xl font-black tracking-[-.03em] sm:text-2xl">{scopeLabel(scope)} results</h2>
            <p className={`mt-1 text-[12px] font-semibold ${muted}`}>{resultCountLabel}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {query ? <FilterChip label={query} darkMode={darkMode} /> : null}
            {location ? <FilterChip label={location} darkMode={darkMode} /> : null}
          </div>
        </div>

        {loading ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[0, 1, 2, 3].map((item) => <div key={item} className={`h-28 animate-pulse rounded-[16px] border ${surface}`} />)}
          </div>
        ) : results.length ? (
          <>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {paginatedResults.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`group grid min-w-0 grid-cols-[46px_minmax(0,1fr)_22px] items-center gap-3 rounded-[16px] border p-3.5 transition ${
                    darkMode ? "border-white/10 bg-[#0d0d0d] hover:bg-[#151515]" : "border-black/10 bg-white hover:border-black/20"
                  }`}
                >
                  <span className={`flex h-11 w-11 items-center justify-center rounded-[12px] ${darkMode ? "bg-white/[.06] text-[#f6b800]" : "bg-black/[.045] text-[#8f6900]"}`}>
                    <ResultIcon scope={item.scope} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-[15px] font-black">{item.label}</span>
                      <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[.05em] ${darkMode ? "border-white/12 text-white/45" : "border-black/10 text-black/45"}`}>
                        {scopeLabel(item.scope)}
                      </span>
                    </span>
                    <span className={`mt-1 block truncate text-[12px] font-semibold ${muted}`}>{item.meta}</span>
                  </span>
                  <span className={`transition group-hover:translate-x-0.5 ${darkMode ? "text-white/35" : "text-black/35"}`}><ArrowIcon /></span>
                </Link>
              ))}
            </div>
            {results.length > RESULTS_PER_PAGE ? (
              <LoadLinkPagination current={currentPage} total={totalPages} onChange={changePage} darkMode={darkMode} label="Search result pages" />
            ) : null}
          </>
        ) : (
          <div className={`mt-5 rounded-[16px] border p-8 text-center ${surface}`}>
            <h2 className="text-lg font-black">No matching public results</h2>
            <p className={`mx-auto mt-2 max-w-md text-sm leading-6 ${muted}`}>Try a broader keyword, remove the location filter, or search All.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function FilterChip({ label, darkMode }: { label: string; darkMode: boolean }) {
  return <span className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold ${darkMode ? "border-white/12 bg-white/[.035] text-white/58" : "border-black/10 bg-white text-black/55"}`}>{label}</span>;
}

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.9"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.1 4.1" strokeLinecap="round" /></svg>;
}

function FilterIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M8 14v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

function ArrowIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ResultIcon({ scope }: { scope: SearchScope }) {
  if (scope === "driver") return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
  if (scope === "dealer") return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 10h16v10H4V10Zm2-6h12l2 6H4l2-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M8 20v-5h4v5" stroke="currentColor" strokeWidth="1.8"/></svg>;
  if (scope === "contract") return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 3h8l4 4v14H7V3Z" stroke="currentColor" strokeWidth="1.8"/><path d="M15 3v5h4M10 12h6M10 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
  if (scope === "asset") return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 8h11v8H3V8Zm11 3h4l3 3v2h-7v-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="7" cy="18" r="2" stroke="currentColor" strokeWidth="1.8"/><circle cx="18" cy="18" r="2" stroke="currentColor" strokeWidth="1.8"/></svg>;
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 5h14v14H5V5Z" stroke="currentColor" strokeWidth="1.8"/><path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}
