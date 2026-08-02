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

  const allSearchItems = useMemo<SearchResult[]>(() => [
    ...liveListings.map(listingToSearchResult),
    ...liveDrivers.map(driverToSearchResult),
    ...liveDealers.map(dealerToSearchResult),
    ...loadLinkSitePages,
  ], [liveDealers, liveDrivers, liveListings]);

  const suggestions = useMemo(() => {
    const ranked = filterAndRankResults(allSearchItems, scope, query, location).slice(0, 11);
    const browse: SearchResult = {
      id: `browse-${scope}`,
      label: scope === "all" ? "Search all of LoadLink" : `Browse all ${scopeLabel(scope).toLowerCase()}`,
      meta: location ? `Results around ${location}` : "Public marketplace listings, drivers, dealerships and pages",
      href: routeForScope(scope, query, location),
      searchable: `${scopeLabel(scope)} ${query} ${location} search all LoadLink`,
      scope,
      priority: 70,
    };
    return query.trim() || location.trim() ? [...ranked, browse].slice(0, 12) : [browse, ...ranked.slice(0, 7)];
  }, [allSearchItems, location, query, scope]);


  function launchSearch(destination?: string) {
    setShowSuggestions(false);
    router.push(destination || routeForScope(scope, query, location));
  }

  function chooseScope(value: SearchScope) {
    setScope(value);
    setShowSuggestions(true);
  }

  return (
    <>
      <section className={`px-5 py-6 md:px-12 md:py-8 ${darkMode ? "bg-[#050505] text-white" : "bg-white text-black"}`}>
        <div className="mx-auto max-w-7xl">
          <div className="flex snap-x gap-2 overflow-x-auto pb-2 no-scrollbar" aria-label="Search category">
            {searchScopes.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => chooseScope(item.value)}
                aria-pressed={scope === item.value}
                className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-black uppercase tracking-wide ${
                  scope === item.value
                    ? "border-[#f6b800] bg-[#f6b800] text-black"
                    : darkMode
                      ? "border-white/15 bg-white/5 text-white/70"
                      : "border-black/10 bg-black/[0.03] text-black/65"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-2 grid gap-2 md:grid-cols-[1fr_260px]">
            <div ref={searchWrapperRef} className="relative">
              <label htmlFor="loadlink-marketplace-search" className="sr-only">Search everything on LoadLink</label>
              <div className={`flex min-h-14 items-center overflow-hidden rounded-2xl border shadow-sm ${darkMode ? "border-white/15 bg-black" : "border-black/15 bg-white"}`}>
                <span className={`flex h-14 w-12 shrink-0 items-center justify-center ${darkMode ? "text-white/55" : "text-black/55"}`}><SearchIcon /></span>
                <input
                  id="loadlink-marketplace-search"
                  value={query}
                  onFocus={() => setShowSuggestions(true)}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setShowSuggestions(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") launchSearch();
                    if (event.key === "Escape") setShowSuggestions(false);
                  }}
                  autoComplete="off"
                  placeholder={placeholderForScope(scope)}
                  className={`h-14 min-w-0 flex-1 bg-transparent pr-2 text-sm font-bold outline-none ${darkMode ? "placeholder:text-white/35" : "placeholder:text-black/40"}`}
                />
                <button type="button" onClick={() => launchSearch()} className="mr-1.5 h-11 rounded-xl bg-[#f6b800] px-4 text-xs font-black uppercase tracking-wide text-black">Search</button>
              </div>

              {showSuggestions ? (
                <div className={`absolute inset-x-0 top-[60px] z-40 max-h-[430px] overflow-y-auto rounded-2xl border shadow-2xl ${darkMode ? "border-white/15 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
                  {suggestions.length ? suggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => launchSearch(item.href)}
                      className={`flex w-full items-center justify-between gap-4 border-b px-4 py-3.5 text-left last:border-b-0 ${darkMode ? "border-white/10 hover:bg-white/5" : "border-black/5 hover:bg-[#fff6dc]"}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black">{item.label}</span>
                        <span className={`mt-1 block truncate text-[11px] font-semibold ${darkMode ? "text-white/45" : "text-black/45"}`}>{item.meta}</span>
                      </span>
                      <ArrowIcon />
                    </button>
                  )) : (
                    <div className={`px-4 py-5 text-sm font-semibold ${darkMode ? "text-white/50" : "text-black/50"}`}>No matching public result was found. Try a simpler word or search All.</div>
                  )}
                </div>
              ) : null}
            </div>

            <SouthAfricaLocationInput
              id="loadlink-marketplace-location"
              value={location}
              onChange={(value) => {
                setLocation(value);
                setShowSuggestions(true);
              }}
              darkMode={darkMode}
              placeholder="City, town or province (optional)"
              ariaLabel="Optional South African city, town or province"
              className={`h-14 w-full rounded-2xl border px-4 text-sm font-bold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-black text-white placeholder:text-white/35" : "border-black/15 bg-white text-black placeholder:text-black/40"}`}
            />
          </div>
        </div>
      </section>

      <div ref={fabWrapperRef} className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-2">
        {fabOpen ? (
          <div className={`w-64 overflow-hidden rounded-2xl border shadow-2xl ${darkMode ? "border-white/15 bg-black text-white" : "border-black/10 bg-white text-black"}`}>
            <RequireAuthLink href="/jobs/list" className="block border-b border-black/10 px-4 py-3.5 text-sm font-black">Post a job</RequireAuthLink>
            <RequireAuthLink href="/list-your-vehicle" className="block border-b border-black/10 px-4 py-3.5 text-sm font-black">List a vehicle</RequireAuthLink>
            <RequireAuthLink href="/jobs/list?mode=contract" className="block px-4 py-3.5 text-sm font-black">Post a contract</RequireAuthLink>
          </div>
        ) : null}
        <button type="button" onClick={() => setFabOpen((value) => !value)} aria-label="Open posting menu" aria-expanded={fabOpen} className="flex h-14 w-14 items-center justify-center rounded-full border border-black bg-[#f6b800] text-black shadow-2xl">
          <PlusIcon open={fabOpen} />
        </button>
      </div>
    </>
  );
}

function SearchIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" /><path d="m16 16 4.2 4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}
function ArrowIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function PlusIcon({ open }: { open: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={open ? "rotate-45" : ""} aria-hidden="true"><path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>;
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
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m5 12 4 4L19 6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
