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
  job: "/images/loadlink-search-jobs-truck-yard.webp",
  contract: "/images/loadlink-search-contracts.webp",
  asset: "/images/loadlink-search-vehicles.webp",
  driver: "/images/loadlink-search-drivers.webp",
  dealer: "/images/loadlink-search-dealerships.webp",
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

/*
 * The supplied images already contain their own composition/text.
 * These positions keep the important subject matter visible on mobile.
 */
const SEARCH_HERO_POSITION: Record<SearchScope, string> = {
  all: "center 58%",
  job: "center 50%",
  contract: "center 48%",
  asset: "center 50%",
  driver: "center 48%",
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
      className={
        darkMode
          ? "min-h-screen overflow-x-hidden bg-black text-white"
          : "min-h-screen overflow-x-hidden bg-[#fffaf0] text-black"
      }
    >
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="relative isolate overflow-hidden">
        {/* HERO — exact user supplied image, no generated replacement. */}
        <div className="relative h-[500px] overflow-hidden sm:h-[530px] md:h-[590px]">
          <img
            key={`${scope}-${heroImage}`}
            src={heroImage}
            alt=""
            onError={() => setHeroFailed(true)}
            style={{ objectPosition: SEARCH_HERO_POSITION[scope] }}
            className="absolute inset-0 h-full w-full scale-[1.01] object-cover"
          />

          {/* Light readability treatment: image stays visible, unlike the old grey wash. */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/[.08] to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[300px] bg-gradient-to-t from-black/28 via-black/[.08] to-transparent" />

          {/* Seamless page blend copied from the supplied reference composition. */}
          <div
            className={`absolute inset-x-0 bottom-0 h-[190px] ${
              darkMode
                ? "bg-gradient-to-b from-transparent via-black/52 to-black"
                : "bg-gradient-to-b from-transparent via-[#fffaf0]/62 to-[#fffaf0]"
            }`}
          />

          <div className="relative mx-auto flex h-full max-w-6xl items-end px-5 pb-[128px] md:px-8 md:pb-[140px]">
            <div className="max-w-[680px]">
              <h1 className="text-[2.65rem] font-black leading-[.98] tracking-[-.055em] text-white drop-shadow-[0_3px_18px_rgba(0,0,0,.52)] sm:text-5xl md:text-6xl">
                Search LoadLink
              </h1>
              <p className="mt-4 max-w-[620px] text-[15px] font-semibold leading-7 text-white/88 drop-shadow-[0_2px_12px_rgba(0,0,0,.58)] sm:text-base">
                Search public listings, approved drivers, dealerships and every main section of the website.
              </p>
            </div>
          </div>
        </div>

        {/* GLASS CONTROLS overlap the fade, matching the user's reference image. */}
        <div className="relative z-10 mx-auto -mt-[94px] max-w-6xl px-4 pb-12 sm:px-5 md:px-8 md:pb-16">
          <div
            ref={tabRailRef}
            role="tablist"
            aria-label="Search LoadLink sections"
            className={`no-scrollbar overflow-x-auto overscroll-x-contain rounded-[28px] border p-2.5 shadow-[0_18px_50px_rgba(0,0,0,.13)] backdrop-blur-2xl backdrop-saturate-150 ${
              darkMode
                ? "border-white/14 bg-black/46"
                : "border-white/70 bg-white/52"
            }`}
            style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
          >
            <div className="flex min-w-max snap-x snap-mandatory gap-2.5">
              {visibleScopes.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={scope === item.value}
                  onClick={() => router.push(routeForScope(item.value, input, place))}
                  className={`min-h-[52px] shrink-0 snap-center rounded-[18px] border px-5 py-3 text-[15px] font-semibold tracking-[-.01em] transition active:scale-[.98] sm:px-6 ${
                    scope === item.value
                      ? "border-[#f6b800] bg-[#f6b800] text-black shadow-[0_10px_25px_rgba(246,184,0,.23)]"
                      : darkMode
                        ? "border-white/10 bg-white/[.07] text-white/74"
                        : "border-white/78 bg-white/76 text-black/65"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={submit}
            className={`mt-5 grid gap-3 rounded-[30px] border p-3.5 shadow-[0_24px_65px_rgba(0,0,0,.12)] backdrop-blur-2xl backdrop-saturate-150 md:grid-cols-[1fr_260px_auto] ${
              darkMode
                ? "border-white/13 bg-black/52"
                : "border-white/72 bg-white/58"
            }`}
          >
            <label className="relative block">
              <span
                className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${
                  darkMode ? "text-white/52" : "text-black/46"
                }`}
              >
                <SearchIcon />
              </span>
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Search everything on LoadLink"
                className={`h-[62px] w-full rounded-[18px] border py-0 pl-[52px] pr-4 text-[15px] font-semibold outline-none transition focus:border-[#f6b800] ${
                  darkMode
                    ? "border-white/13 bg-black/70 text-white placeholder:text-white/40"
                    : "border-black/[.08] bg-white/88 text-black placeholder:text-black/40"
                }`}
              />
            </label>

            <label className="relative block">
              <span
                className={`pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 ${
                  darkMode ? "text-white/52" : "text-black/46"
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
                className={`h-[62px] w-full rounded-[18px] border py-0 pl-[52px] pr-4 text-[15px] font-semibold outline-none transition focus:border-[#f6b800] ${
                  darkMode
                    ? "border-white/13 bg-black/70 text-white placeholder:text-white/40"
                    : "border-black/[.08] bg-white/88 text-black placeholder:text-black/40"
                }`}
              />
            </label>

            <button
              type="submit"
              className="h-[62px] rounded-[18px] bg-[#f6b800] px-9 text-[16px] font-semibold text-black shadow-[0_11px_28px_rgba(246,184,0,.20)] transition active:scale-[.985]"
            >
              Search
            </button>
          </form>

          <div className="mt-10 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black tracking-[-.035em] md:text-3xl">
              {scopeLabel(scope)} results
            </h2>
            <p className={`text-sm font-bold ${darkMode ? "text-white/45" : "text-black/45"}`}>
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
                  className={`rounded-[22px] border p-5 shadow-[0_12px_34px_rgba(0,0,0,.06)] transition ${
                    darkMode
                      ? "border-white/10 bg-white/[.045] hover:bg-white/[.075]"
                      : "border-black/[.07] bg-white/76 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-black">{item.label}</h3>
                      <p className={`mt-2 text-sm font-semibold ${darkMode ? "text-white/50" : "text-black/50"}`}>
                        {item.meta}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${
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
