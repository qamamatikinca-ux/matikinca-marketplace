"use client";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";
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
  routeForScope,
  scopeLabel,
  searchScopes,
} from "@/lib/loadlinkSearch";

const SEARCH_HERO: Record<SearchScope, string> = {
  all: "/images/loadlink-search-all-boxes.webp",
  job: "/images/loadlink-search-all-boxes.webp",
  contract: "/images/loadlink-search-contracts-hd.webp",
  asset: "/images/loadlink-search-vehicles.webp",
  driver: "/images/loadlink-search-drivers-hd.webp",
  dealer: "/images/loadlink-search-jobs-truck-yard.webp",
  page: "/images/loadlink-search-all-boxes.webp",
};

const SEARCH_HERO_FALLBACK: Record<SearchScope, string> = {
  all: "/images/jobs-1.jpg",
  job: "/images/jobs-1.jpg",
  contract: "/images/contracts-1.jpg",
  asset: "/images/truck-1.jpg",
  driver: "/images/driver-profile-hero.jpg",
  dealer: "/images/truck-2.jpg",
  page: "/images/jobs-2.jpg",
};

const SEARCH_HERO_POSITION: Record<SearchScope, string> = {
  all: "center 58%",
  job: "center 58%",
  contract: "center 50%",
  asset: "center 48%",
  driver: "center 52%",
  dealer: "center 48%",
  page: "center 58%",
};

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.9">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.1 4.1" strokeLinecap="round" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.8">
      <path d="M12 21s6-5.45 6-11a6 6 0 1 0-12 0c0 5.55 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.1" />
    </svg>
  );
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
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<ListingSearchRow[]>([]);
  const [drivers, setDrivers] = useState<DriverSearchRow[]>([]);
  const [dealers, setDealers] = useState<DealerSearchRow[]>([]);
  const [heroFailed, setHeroFailed] = useState(false);
  const tabRailRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setInput(query);
    setPlace(location);
  }, [location, query]);

  useEffect(() => {
    setHeroFailed(false);
  }, [scope]);

  useEffect(() => {
    const activeTab = tabRailRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    activeTab?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [scope]);

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

  const results = useMemo<SearchResult[]>(
    () =>
      filterAndRankResults(
        [
          ...listings.map(listingToSearchResult),
          ...drivers.map(driverToSearchResult),
          ...dealers.map(dealerToSearchResult),
          ...loadLinkSitePages,
        ],
        scope,
        query,
        location,
      ),
    [dealers, drivers, listings, location, query, scope],
  );

  const visibleScopes = useMemo(
    () => searchScopes.filter((item) => item.value !== "page"),
    [],
  );

  const heroImage = heroFailed ? SEARCH_HERO_FALLBACK[scope] : SEARCH_HERO[scope];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(routeForScope(scope, input, place));
  }

  return (
    <main
      data-loadlink-search-page="true"
      className={
        darkMode
          ? "min-h-screen overflow-x-hidden bg-black text-white"
          : "min-h-screen overflow-x-hidden bg-[#fffaf0] text-black"
      }
    >
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="relative isolate overflow-hidden">
        <div
          className={`relative h-[470px] overflow-hidden sm:h-[520px] md:h-[590px] ${
            darkMode ? "bg-black" : "bg-[#fffaf0]"
          }`}
        >
          <img
            key={`${scope}-${heroImage}`}
            src={heroImage}
            alt=""
            loading="eager"
            decoding="async"
            fetchPriority="high"
            onError={() => setHeroFailed(true)}
            style={{
              objectPosition: SEARCH_HERO_POSITION[scope],
              imageRendering: "auto",
              WebkitMaskImage:
                "linear-gradient(to bottom, #000 0%, #000 66%, rgba(0,0,0,.98) 75%, rgba(0,0,0,.80) 85%, rgba(0,0,0,.30) 94%, transparent 100%)",
              maskImage:
                "linear-gradient(to bottom, #000 0%, #000 66%, rgba(0,0,0,.98) 75%, rgba(0,0,0,.80) 85%, rgba(0,0,0,.30) 94%, transparent 100%)",
            }}
            className="loadlink-search-hero-image absolute inset-0 h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-b from-black/24 via-black/[.035] to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[210px] bg-gradient-to-t from-black/22 via-black/[.045] to-transparent" />

          <div className="relative mx-auto flex h-full max-w-6xl items-end px-5 pb-[122px] sm:px-6 md:px-8 md:pb-[140px]">
            <div className="max-w-[680px]">
              <h1 className="text-[2.45rem] font-black leading-[.98] tracking-[-.052em] text-white drop-shadow-[0_3px_18px_rgba(0,0,0,.58)] sm:text-5xl md:text-6xl">
                Search LoadLink
              </h1>
              <p className="mt-4 max-w-[620px] text-[15px] font-semibold leading-7 text-white/90 drop-shadow-[0_2px_12px_rgba(0,0,0,.62)] sm:text-base">
                Search public listings, approved drivers, dealerships and every main section of the website.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 mx-auto -mt-[88px] max-w-6xl px-4 pb-12 sm:px-5 md:px-8 md:pb-16">
          <div
            ref={tabRailRef}
            role="tablist"
            aria-label="Search LoadLink sections"
            className="no-scrollbar max-w-full overflow-x-auto overscroll-x-contain py-1"
            style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
          >
            <div className="flex min-w-max snap-x snap-mandatory gap-2 px-0.5">
              {visibleScopes.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={scope === item.value}
                  onClick={() => router.push(routeForScope(item.value, input, place))}
                  className={`min-h-[46px] min-w-[90px] shrink-0 snap-center rounded-full border px-4 py-2.5 text-[14px] font-semibold tracking-[-.015em] backdrop-blur-xl backdrop-saturate-150 transition duration-150 active:scale-[.985] ${
                    scope === item.value
                      ? "border-[#f6b800] bg-[#f6b800] text-black shadow-[0_8px_22px_rgba(246,184,0,.20)]"
                      : darkMode
                        ? "border-white/[.14] bg-black/34 text-white/76 shadow-[0_6px_18px_rgba(0,0,0,.14)]"
                        : "border-white/65 bg-white/50 text-black/68 shadow-[0_6px_18px_rgba(0,0,0,.07)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={submit}
            className={`mt-4 grid gap-2.5 rounded-[24px] border p-3 shadow-[0_18px_44px_rgba(0,0,0,.09)] backdrop-blur-xl backdrop-saturate-125 md:grid-cols-[1fr_260px_auto] ${
              darkMode
                ? "border-white/11 bg-black/36"
                : "border-white/70 bg-white/50"
            }`}
          >
            <label className="relative block">
              <span
                className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${
                  darkMode ? "text-white/50" : "text-black/44"
                }`}
              >
                <SearchIcon />
              </span>
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Search everything on LoadLink"
                className={`h-[54px] w-full rounded-[17px] border py-0 pl-[50px] pr-4 text-[15px] font-semibold outline-none transition focus:border-[#f6b800] sm:h-[60px] ${
                  darkMode
                    ? "border-white/11 bg-black/58 text-white placeholder:text-white/38"
                    : "border-black/[.07] bg-white/84 text-black placeholder:text-black/40"
                }`}
              />
            </label>

            <label className="relative block">
              <span
                className={`pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 ${
                  darkMode ? "text-white/50" : "text-black/44"
                }`}
              >
                <LocationIcon />
              </span>
              <SouthAfricaLocationInput
                value={place}
                onChange={setPlace}
                darkMode={darkMode}
                placeholder="City, town or province"
                ariaLabel="Filter all LoadLink results by South African location"
                className={`h-[54px] w-full rounded-[17px] border py-0 pl-[50px] pr-4 text-[15px] font-semibold outline-none transition focus:border-[#f6b800] sm:h-[60px] ${
                  darkMode
                    ? "border-white/11 bg-black/58 text-white placeholder:text-white/38"
                    : "border-black/[.07] bg-white/84 text-black placeholder:text-black/40"
                }`}
              />
            </label>

            <button
              type="submit"
              className="h-[54px] rounded-[17px] bg-[#f6b800] px-8 text-[16px] font-semibold text-black shadow-[0_8px_22px_rgba(246,184,0,.18)] transition active:scale-[.985] sm:h-[60px]"
            >
              Search
            </button>
          </form>

          <div className="mt-9 flex items-center justify-between gap-4">
            <h2 className="min-w-0 text-2xl font-black tracking-[-.035em] md:text-3xl">
              {scopeLabel(scope)} results
            </h2>
            <p className={`shrink-0 text-sm font-bold ${darkMode ? "text-white/45" : "text-black/45"}`}>
              {loading ? "Searching…" : `${results.length} found`}
            </p>
          </div>

          {loading ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className={`h-28 animate-pulse rounded-[22px] border ${
                    darkMode
                      ? "border-white/10 bg-white/[.04]"
                      : "border-black/[.07] bg-white/72"
                  }`}
                />
              ))}
            </div>
          ) : results.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {results.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`loadlink-search-result-card min-w-0 rounded-[22px] border p-5 shadow-[0_12px_34px_rgba(0,0,0,.06)] transition ${
                    darkMode
                      ? "border-white/10 bg-white/[.045] hover:bg-white/[.075]"
                      : "border-black/[.07] bg-white/76 hover:bg-white"
                  }`}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-black">{item.label}</h3>
                      <p className={`mt-2 truncate text-sm font-semibold ${darkMode ? "text-white/50" : "text-black/50"}`}>
                        {item.meta}
                      </p>
                    </div>

                    <span
                      className={`loadlink-search-result-kind shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${
                        darkMode
                          ? "border-white/15 text-white/55"
                          : "border-black/10 text-black/50"
                      }`}
                    >
                      {scopeLabel(item.scope)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div
              className={`mt-5 rounded-[22px] border p-10 text-center shadow-[0_12px_34px_rgba(0,0,0,.05)] ${
                darkMode
                  ? "border-white/10 bg-white/[.045] text-white/55"
                  : "border-black/[.07] bg-white/76 text-black/55"
              }`}
            >
              <h2 className="text-xl font-black">No public result found</h2>
              <p className="mt-2 text-sm leading-6">
                Try a shorter word, remove the location, or select All.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
