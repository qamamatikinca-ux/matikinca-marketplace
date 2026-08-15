"use client";

import RequireAuthLink from "@/components/RequireAuthLink";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";
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

export default function MarketplaceDiscovery({ darkMode }: { darkMode: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSearchField, setActiveSearchField] = useState<"query" | "location" | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [liveListings, setLiveListings] = useState<ListingSearchRow[]>([]);
  const [liveDrivers, setLiveDrivers] = useState<DriverSearchRow[]>([]);
  const [liveDealers, setLiveDealers] = useState<DealerSearchRow[]>([]);
  const searchWrapperRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const fabWrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;

    fetch(`/api/job-listings?t=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (active) setLiveListings(((payload.rows || []) as ListingSearchRow[]).filter(isCurrentListing));
      })
      .catch(() => undefined);

    fetch("/api/phase2/public-drivers?limit=50&offset=0", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (active) setLiveDrivers((payload.drivers || []) as DriverSearchRow[]);
      })
      .catch(() => undefined);

    if (isSupabaseConfigured) {
      supabase
        .from("dealership_profiles")
        .select("id,slug,name,short_bio,business_description,physical_location,province,verification_status,is_public")
        .eq("verification_status", "approved")
        .eq("is_public", true)
        .order("updated_at", { ascending: false })
        .limit(40)
        .then(({ data, error }) => {
          if (active && !error) setLiveDealers((data || []) as unknown as DealerSearchRow[]);
        });
    }

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function closeMenus(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (!searchWrapperRef.current?.contains(target)) {
        setShowSuggestions(false);
        setActiveSearchField(null);
      }
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

  const visibleScopes = useMemo(
    () => searchScopes.filter((item) => item.value !== "page"),
    [],
  );

  const suggestions = useMemo(() => {
    const ranked = filterAndRankResults(allSearchItems, scope, query, location).slice(0, 8);
    const browse: SearchResult = {
      id: `browse-${scope}`,
      label: scope === "all" ? "Search all of LoadLink" : `Browse all ${scopeLabel(scope).toLowerCase()}`,
      meta: location ? `Results around ${location}` : "Open the full LoadLink results page",
      href: routeForScope(scope, query, location),
      searchable: `${scopeLabel(scope)} ${query} ${location} search all LoadLink`,
      scope,
      priority: 70,
    };
    return query.trim() || location.trim() ? [...ranked, browse].slice(0, 9) : [browse, ...ranked.slice(0, 5)];
  }, [allSearchItems, location, query, scope]);

  function launchSearch(destination?: string) {
    setShowSuggestions(false);
    setActiveSearchField(null);
    router.push(destination || routeForScope(scope, query, location));
  }

  function chooseScope(value: SearchScope) {
    setScope(value);
    setShowSuggestions(false);
    setActiveSearchField(null);
    router.push(routeForScope(value, query, location));
  }

  return (
    <>
      <section
        data-loadlink-home-search-section
        className={`px-5 py-6 md:px-12 md:py-8 ${darkMode ? "bg-[#050505] text-white" : "bg-[#fff6dc] text-black"}`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="no-scrollbar overflow-x-auto py-1" aria-label="Search category">
            <div className="flex min-w-max gap-3 px-0.5">
              {visibleScopes.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => chooseScope(item.value)}
                  aria-current={scope === item.value ? "page" : undefined}
                  className={`min-h-[50px] min-w-[108px] shrink-0 rounded-full border px-5 py-3 text-[15px] font-semibold tracking-[-.01em] backdrop-blur-xl backdrop-saturate-150 transition duration-200 active:scale-[.985] ${
                    scope === item.value
                      ? "border-[#f6b800] bg-[#f6b800] text-black shadow-[0_10px_28px_rgba(246,184,0,.18)]"
                      : darkMode
                        ? "border-white/[.18] bg-white/[.045] text-white/74 shadow-[0_8px_22px_rgba(0,0,0,.14)]"
                        : "border-black/[.16] bg-white/68 text-black/66 shadow-[0_8px_22px_rgba(0,0,0,.05)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 max-w-4xl">
            <p className="mb-3 text-[13px] font-black uppercase tracking-[.12em] text-[#d49b00]">Search LoadLink</p>

            <div ref={searchWrapperRef} className="relative">
              <div
                data-loadlink-home-search-row
                className="flex min-h-[60px] w-full overflow-hidden rounded-[18px] border border-black/15 bg-white shadow-[0_12px_30px_rgba(0,0,0,.08)]"
              >
                <span className="flex w-14 shrink-0 items-center justify-center bg-[#1c1c1c] text-white/65">
                  <SearchIcon />
                </span>
                <label htmlFor="loadlink-marketplace-search" className="sr-only">
                  Search LoadLink
                </label>
                <input
                  ref={searchInputRef}
                  id="loadlink-marketplace-search"
                  data-loadlink-home-search-input
                  value={query}
                  onFocus={() => {
                    setActiveSearchField("query");
                    setShowSuggestions(true);
                  }}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveSearchField("query");
                    setShowSuggestions(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") launchSearch();
                    if (event.key === "Escape") {
                      setShowSuggestions(false);
                      setActiveSearchField(null);
                    }
                  }}
                  autoComplete="off"
                  placeholder={placeholderForScope(scope)}
                  className="h-[60px] min-w-0 flex-1 border-0 bg-white px-3 text-[16px] font-semibold text-black outline-none placeholder:text-black/40"
                />
                <button
                  type="button"
                  onClick={() => launchSearch()}
                  className="m-1.5 ml-0 min-w-[92px] shrink-0 rounded-[15px] bg-[#f6b800] px-4 text-[14px] font-black uppercase tracking-[.04em] text-black sm:min-w-[112px] sm:px-6 sm:text-[15px]"
                >
                  Search
                </button>
              </div>

              {showSuggestions && activeSearchField === "query" ? (
                <div
                  data-loadlink-home-search-suggestions
                  className={`absolute inset-x-0 top-[68px] z-40 max-h-[330px] overflow-y-auto rounded-[18px] border shadow-[0_24px_65px_rgba(0,0,0,.24)] backdrop-blur-2xl backdrop-saturate-150 ${
                    darkMode ? "border-white/12 bg-black/68 text-white" : "border-black/[.08] bg-white/82 text-black"
                  }`}
                >
                  {suggestions.length ? (
                    suggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => launchSearch(item.href)}
                        className={`flex w-full items-center justify-between gap-4 border-b px-4 py-3.5 text-left last:border-b-0 ${
                          darkMode ? "border-white/[.08] hover:bg-white/[.06]" : "border-black/[.05] hover:bg-white/75"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black">{item.label}</span>
                          <span className={`mt-1 block truncate text-[11px] font-semibold ${darkMode ? "text-white/48" : "text-black/48"}`}>
                            {item.meta}
                          </span>
                        </span>
                        <ArrowIcon />
                      </button>
                    ))
                  ) : (
                    <div className={`px-4 py-5 text-sm font-semibold ${darkMode ? "text-white/50" : "text-black/50"}`}>
                      No matching public result was found. Try a simpler search.
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="mt-5" data-loadlink-home-location>
              <p className="mb-3 text-[13px] font-black uppercase tracking-[.12em] text-[#d49b00]">Location</p>
              <SouthAfricaLocationInput
                id="loadlink-marketplace-location"
                value={location}
                onInputFocus={() => {
                  setActiveSearchField("location");
                  setShowSuggestions(false);
                }}
                onChange={(value) => {
                  setLocation(value);
                  setActiveSearchField("location");
                  setShowSuggestions(false);
                }}
                darkMode={darkMode}
                placeholder="City, town or province"
                ariaLabel="South African city, town or province"
                className="h-[58px] w-full rounded-[18px] border border-black/15 bg-white px-4 text-[16px] font-semibold text-black outline-none shadow-[0_10px_26px_rgba(0,0,0,.05)] focus:border-[#f6b800] placeholder:text-black/40"
              />
            </div>
          </div>
        </div>
      </section>

      <div ref={fabWrapperRef} className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-2">
        {fabOpen ? (
          <div
            className={`w-64 overflow-hidden rounded-[20px] border shadow-[0_24px_70px_rgba(0,0,0,.34)] backdrop-blur-2xl backdrop-saturate-150 ${
              darkMode ? "border-white/13 bg-black/72 text-white" : "border-black/[.08] bg-white/82 text-black"
            }`}
          >
            <RequireAuthLink href="/jobs/list" className="block border-b border-black/10 px-4 py-3.5 text-sm font-black">
              Post a job
            </RequireAuthLink>
            <RequireAuthLink href="/list-your-vehicle" className="block border-b border-black/10 px-4 py-3.5 text-sm font-black">
              List a vehicle
            </RequireAuthLink>
            <RequireAuthLink href="/jobs/list?mode=contract" className="block px-4 py-3.5 text-sm font-black">
              Post a contract
            </RequireAuthLink>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setFabOpen((value) => !value)}
          aria-label="Open posting menu"
          aria-expanded={fabOpen}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-black bg-[#f6b800] text-black shadow-2xl"
        >
          <PlusIcon open={fabOpen} />
        </button>
      </div>
    </>
  );
}

function SearchIcon() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.2" stroke="currentColor" strokeWidth="2" />
      <path d="m15.2 15.2 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
      <path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={open ? "rotate-45" : ""} aria-hidden="true">
      <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function VerifiedBadge() {
  return (
    <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#c99a17] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#b88900]">
      <CheckIcon />
      Verified
    </span>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
