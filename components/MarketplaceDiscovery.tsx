"use client";

import RequireAuthLink from "@/components/RequireAuthLink";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";
import LoadLinkDealerUpdateRail20260822 from "@/components/LoadLinkDealerUpdateRail20260822";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  routeForScope,
  scopeLabel,
  searchScopes,
} from "@/lib/loadlinkSearch";

function searchResultsRoute(scope: SearchScope, query: string, location: string) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (location.trim()) params.set("location", location.trim());
  if (scope !== "all") params.set("category", scope);
  const value = params.toString();
  return `/search${value ? `?${value}` : ""}`;
}

export default function MarketplaceDiscovery({ darkMode }: { darkMode: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [hasDealerUpdates, setHasDealerUpdates] = useState(false);
  const [searchReady, setSearchReady] = useState(false);
  const [liveListings, setLiveListings] = useState<ListingSearchRow[]>([]);
  const [liveDrivers, setLiveDrivers] = useState<DriverSearchRow[]>([]);
  const [liveDealers, setLiveDealers] = useState<DealerSearchRow[]>([]);
  const searchWrapperRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const fabWrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    setSearchReady(false);

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
            .limit(40)
        : Promise.resolve({ data: [], error: null }),
    ]).then(([listingResult, driverResult, dealerResult]) => {
      if (!active) return;
      if (listingResult.status === "fulfilled") {
        setLiveListings(((listingResult.value.rows || []) as ListingSearchRow[]).filter(isCurrentListing));
      }
      if (driverResult.status === "fulfilled") {
        setLiveDrivers((driverResult.value.drivers || []) as DriverSearchRow[]);
      }
      if (dealerResult.status === "fulfilled" && !dealerResult.value.error) {
        setLiveDealers((dealerResult.value.data || []) as unknown as DealerSearchRow[]);
      }
      setSearchReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function closeMenus(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (!searchWrapperRef.current?.contains(target)) setShowSuggestions(false);
      if (!fabWrapperRef.current?.contains(target)) setFabOpen(false);
    }

    document.addEventListener("mousedown", closeMenus);
    document.addEventListener("touchstart", closeMenus);
    return () => {
      document.removeEventListener("mousedown", closeMenus);
      document.removeEventListener("touchstart", closeMenus);
    };
  }, []);

  const allSearchItems = useMemo<SearchResult[]>(
    () => [
      ...liveListings.map(listingToSearchResult),
      ...liveDrivers.map(driverToSearchResult),
      ...liveDealers.map(dealerToSearchResult),
      ...loadLinkSitePages,
    ],
    [liveDealers, liveDrivers, liveListings],
  );

  const marketplaceItems = useMemo(
    () => allSearchItems.filter((item) => item.scope !== "page"),
    [allSearchItems],
  );

  const visibleScopes = useMemo(
    () => searchScopes.filter((item) => item.value !== "page"),
    [],
  );

  const matchingMarketplaceResults = useMemo(
    () => filterAndRankResults(marketplaceItems, scope, query, location),
    [location, marketplaceItems, query, scope],
  );

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    return filterAndRankResults(allSearchItems, scope, query, location).slice(0, 6);
  }, [allSearchItems, location, query, scope]);

  function launchSearch(destination?: string) {
    setShowSuggestions(false);
    router.push(destination || searchResultsRoute(scope, query, location));
  }

  function chooseScope(value: SearchScope) {
    setScope(value);
    setShowSuggestions(false);
    router.push(routeForScope(value, query, location));
  }

  const resultLabel = searchReady
    ? `${matchingMarketplaceResults.length} ${matchingMarketplaceResults.length === 1 ? "result" : "results"}`
    : "results";

  return (
    <>
      <section
        data-loadlink-home-search-section
        className={`px-4 py-4 sm:px-5 md:px-12 md:py-6 ${darkMode ? "bg-[#050505] text-white" : "bg-[#fff6dc] text-black"}`}
      >
        <div className="mx-auto max-w-7xl">
          <LoadLinkDealerUpdateRail20260822 darkMode={darkMode} onAvailabilityChange={setHasDealerUpdates} />

          {!hasDealerUpdates ? (
            <div className="no-scrollbar overflow-x-auto py-1" aria-label="Search category">
              <div className="flex min-w-max items-center gap-1.5">
                {visibleScopes.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => chooseScope(item.value)}
                    aria-pressed={scope === item.value}
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
          ) : null}

          <div className="mt-3 max-w-5xl">
            <div
              data-loadlink-autotrader-search="true"
              className={`rounded-[18px] border p-2.5 shadow-[0_10px_28px_rgba(0,0,0,.07)] ${
                darkMode ? "border-white/12 bg-[#0d0d0d]" : "border-black/10 bg-white"
              }`}
            >
              <div ref={searchWrapperRef} className="relative">
                <div
                  className={`grid h-[52px] grid-cols-[44px_minmax(0,1fr)] items-center overflow-hidden rounded-[13px] border ${
                    darkMode ? "border-white/10 bg-[#171717]" : "border-black/10 bg-[#fafafa]"
                  }`}
                >
                  <span className={`flex h-full items-center justify-center ${darkMode ? "text-[#f6b800]" : "text-black/45"}`}>
                    <SearchIcon />
                  </span>
                  <label htmlFor="loadlink-marketplace-search" className="sr-only">Search LoadLink</label>
                  <input
                    ref={searchInputRef}
                    id="loadlink-marketplace-search"
                    data-loadlink-home-search-input
                    value={query}
                    onFocus={() => setShowSuggestions(Boolean(query.trim()))}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setShowSuggestions(Boolean(event.target.value.trim()));
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") launchSearch();
                      if (event.key === "Escape") setShowSuggestions(false);
                    }}
                    autoComplete="off"
                    placeholder={placeholderForScope(scope)}
                    className={`h-full min-w-0 border-0 bg-transparent px-1 pr-3 text-base font-medium outline-none ${
                      darkMode ? "text-white placeholder:text-white/38" : "text-black placeholder:text-black/38"
                    }`}
                  />
                </div>

                {showSuggestions ? (
                  <div
                    data-loadlink-home-search-suggestions
                    className={`absolute inset-x-0 top-[58px] z-40 max-h-[300px] overflow-y-auto rounded-[14px] border shadow-[0_20px_50px_rgba(0,0,0,.20)] ${
                      darkMode ? "border-white/12 bg-[#111] text-white" : "border-black/10 bg-white text-black"
                    }`}
                  >
                    {suggestions.length ? (
                      <>
                        {suggestions.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => launchSearch(item.href)}
                            className={`flex w-full items-center justify-between gap-4 border-b px-4 py-3 text-left last:border-b-0 ${
                              darkMode ? "border-white/[.07] hover:bg-white/[.05]" : "border-black/[.05] hover:bg-black/[.025]"
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-semibold">{item.label}</span>
                              <span className={`mt-0.5 block truncate text-[11px] ${darkMode ? "text-white/48" : "text-black/48"}`}>{item.meta}</span>
                            </span>
                            <ArrowIcon />
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => launchSearch()}
                          className={`flex w-full items-center justify-between px-4 py-3 text-left text-[12px] font-semibold ${darkMode ? "text-[#f6b800]" : "text-[#9a7000]"}`}
                        >
                          View all {resultLabel}
                          <ArrowIcon />
                        </button>
                      </>
                    ) : (
                      <div className={`px-4 py-4 text-sm ${darkMode ? "text-white/50" : "text-black/50"}`}>
                        No matching public result found. Try a simpler search.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                <button
                  type="button"
                  onClick={() => setFiltersOpen((value) => !value)}
                  aria-expanded={filtersOpen}
                  className={`flex h-11 min-w-0 items-center gap-2 rounded-[12px] border px-3 text-left text-[12px] font-semibold ${
                    darkMode ? "border-white/10 bg-white/[.035] text-white/75" : "border-black/10 bg-white text-black/65"
                  }`}
                >
                  <FilterIcon />
                  <span className="truncate">{location || "Filters"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => launchSearch()}
                  className="h-11 shrink-0 rounded-[12px] bg-[#f6b800] px-4 text-[12px] font-semibold text-black transition active:scale-[.985] sm:px-5"
                >
                  Search {resultLabel}
                </button>
              </div>

              {filtersOpen ? (
                <div className="mt-2" data-loadlink-home-location>
                  <SouthAfricaLocationInput
                    id="loadlink-marketplace-location"
                    value={location}
                    onChange={setLocation}
                    darkMode={darkMode}
                    placeholder="City, town or province"
                    ariaLabel="South African city, town or province"
                    className={`h-11 w-full rounded-[12px] border px-3 text-base font-medium outline-none transition focus:border-[#f6b800] ${
                      darkMode
                        ? "border-white/10 bg-[#171717] text-white placeholder:text-white/38"
                        : "border-black/10 bg-[#fafafa] text-black placeholder:text-black/38"
                    }`}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div ref={fabWrapperRef} className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-2">
        {fabOpen ? (
          <div className={`w-64 overflow-hidden rounded-[20px] border shadow-[0_24px_70px_rgba(0,0,0,.34)] backdrop-blur-2xl backdrop-saturate-150 ${darkMode ? "border-white/13 bg-black/72 text-white" : "border-black/[.08] bg-white/82 text-black"}`}>
            <RequireAuthLink href="/jobs/list" className="block border-b border-black/10 px-4 py-3.5 text-sm font-black">Post a job</RequireAuthLink>
            <RequireAuthLink href="/list-your-vehicle" className="block border-b border-black/10 px-4 py-3.5 text-sm font-black">List a vehicle</RequireAuthLink>
            <RequireAuthLink href="/jobs/list?mode=contract" className="block px-4 py-3.5 text-sm font-black">Post a contract</RequireAuthLink>
          </div>
        ) : null}
        <button type="button" onClick={() => setFabOpen((value) => !value)} aria-label="Open posting menu" aria-expanded={fabOpen} className="flex h-14 w-14 items-center justify-center rounded-full border border-black bg-[#f6b800] text-black shadow-2xl"><PlusIcon open={fabOpen} /></button>
      </div>
    </>
  );
}

function SearchIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.2" stroke="currentColor" strokeWidth="2" /><path d="m15.2 15.2 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

function FilterIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M8 14v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

function ArrowIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PlusIcon({ open }: { open: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={open ? "rotate-45" : ""} aria-hidden="true"><path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>;
}

export function VerifiedBadge() {
  return <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#c99a17] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#b88900]"><CheckIcon />Verified</span>;
}

function CheckIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
