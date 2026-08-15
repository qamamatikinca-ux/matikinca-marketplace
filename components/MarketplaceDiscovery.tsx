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

  const visibleScopes = useMemo(() => searchScopes.filter((item) => item.value !== "page"), []);

  const suggestions = useMemo(() => {
    const ranked = filterAndRankResults(allSearchItems, scope, query, location).slice(0, 5);
    const browse: SearchResult = {
      id: `browse-${scope}`,
      label: scope === "all" ? "Search all of LoadLink" : `Browse all ${scopeLabel(scope).toLowerCase()}`,
      meta: location ? `Results around ${location}` : "Open the full LoadLink results page",
      href: routeForScope(scope, query, location),
      searchable: `${scopeLabel(scope)} ${query} ${location} search all LoadLink`,
      scope,
      priority: 70,
    };
    return query.trim() || location.trim() ? [...ranked, browse].slice(0, 6) : [browse];
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
      <section className={`relative z-[180] overflow-visible border-0 px-5 py-4 md:px-12 md:py-6 ${darkMode ? "bg-[#050505] text-white" : "bg-[#fffaf0] text-black"}`}>
        <div className="mx-auto max-w-5xl">
          <div className="no-scrollbar overflow-x-auto py-1" aria-label="Search category">
            <div className="flex min-w-max gap-2 px-0.5">
              {visibleScopes.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => chooseScope(item.value)}
                  aria-pressed={scope === item.value}
                  className={`min-h-[44px] min-w-[100px] shrink-0 rounded-full border px-4 py-2 text-[13px] font-black tracking-[-.015em] transition active:scale-[.985] sm:min-h-[46px] sm:min-w-[112px] sm:px-5 sm:text-sm ${
                    scope === item.value
                      ? "border-[#f6b800] bg-[#f6b800] text-black shadow-[0_8px_20px_rgba(246,184,0,.16)]"
                      : darkMode
                        ? "border-[#4b5563] bg-[#090909] text-white/80"
                        : "border-[#d1d5db] bg-white text-[#4b5563]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div data-loadlink-marketplace-search-shell className="relative z-[181] mt-4 overflow-visible">
            <div ref={searchWrapperRef} className="relative z-[190] overflow-visible">
              <label htmlFor="loadlink-marketplace-search" className="mb-3 block text-[11px] font-black uppercase tracking-[.16em] text-[#c18d00]">
                Search LoadLink
              </label>

              <div className="flex h-14 w-full min-w-0 overflow-hidden rounded-[16px] border border-black/55 bg-[#1b1b1b] shadow-[0_7px_18px_rgba(0,0,0,.12)]">
                <span className="flex h-full w-14 shrink-0 items-center justify-center bg-[#1b1b1b] text-white/55">
                  <SearchIcon />
                </span>
                <input
                  id="loadlink-marketplace-search"
                  value={query}
                  onFocus={() => {
                    setActiveSearchField("query");
                    setShowSuggestions(Boolean(query.trim()));
                  }}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveSearchField("query");
                    setShowSuggestions(Boolean(event.target.value.trim()));
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
                  className="h-full min-w-0 flex-1 border-0 bg-white px-3 text-[16px] font-semibold text-black outline-none placeholder:text-black/40 sm:px-4"
                />
                <button
                  type="button"
                  onClick={() => launchSearch()}
                  className="m-1.5 ml-0 min-w-[94px] shrink-0 rounded-[14px] bg-[#f6b800] px-3 text-[12px] font-black uppercase tracking-[.04em] text-black sm:min-w-[112px] sm:text-sm"
                >
                  Search
                </button>
              </div>

              {showSuggestions && activeSearchField === "query" ? (
                <div className={`absolute inset-x-0 top-[92px] z-[240] max-h-[320px] overflow-y-auto rounded-[18px] border shadow-[0_22px_56px_rgba(0,0,0,.24)] backdrop-blur-xl ${darkMode ? "border-white/12 bg-[#090909]/86 text-white" : "border-black/[.08] bg-white/82 text-black"}`}>
                  {suggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => launchSearch(item.href)}
                      className={`flex w-full items-center justify-between gap-4 border-b px-4 py-3.5 text-left last:border-b-0 ${darkMode ? "border-white/[.08] hover:bg-white/[.06]" : "border-black/[.05] hover:bg-white/70"}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black">{item.label}</span>
                        <span className={`mt-1 block truncate text-[11px] font-semibold ${darkMode ? "text-white/48" : "text-black/48"}`}>{item.meta}</span>
                      </span>
                      <ArrowIcon />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <label htmlFor="loadlink-marketplace-location" className="mb-3 mt-5 block text-[11px] font-black uppercase tracking-[.16em] text-[#c18d00]">
              Location
            </label>
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
              ariaLabel="Optional South African city, town or province"
              className={`h-14 w-full rounded-[16px] border px-4 text-[16px] font-semibold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/14 bg-[#141414] text-white placeholder:text-white/35" : "border-[#d5d7db] bg-white text-black placeholder:text-black/40"}`}
            />
          </div>
        </div>
      </section>

      <div ref={fabWrapperRef} className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-2">
        {fabOpen ? (
          <div className={`w-64 overflow-hidden rounded-[20px] border shadow-[0_24px_70px_rgba(0,0,0,.34)] ${darkMode ? "border-white/13 bg-black/96 text-white" : "border-black/[.08] bg-white text-black"}`}>
            <RequireAuthLink href="/jobs/list" className="block border-b border-black/10 px-4 py-3.5 text-sm font-black">Post a job</RequireAuthLink>
            <RequireAuthLink href="/list-your-vehicle" className="block border-b border-black/10 px-4 py-3.5 text-sm font-black">List a vehicle</RequireAuthLink>
            <RequireAuthLink href="/jobs/list?mode=contract" className="block px-4 py-3.5 text-sm font-black">Post a contract</RequireAuthLink>
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
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
      <path d="m16 16 4.2 4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
