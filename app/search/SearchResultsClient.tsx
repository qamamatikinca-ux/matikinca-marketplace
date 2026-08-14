"use client";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

const SEARCH_HERO_FALLBACK: Record<SearchScope, string> = {
  all: "/images/jobs-1.jpg",
  job: "/images/jobs-1.jpg",
  contract: "/images/contracts-1.jpg",
  asset: "/images/truck-1.jpg",
  driver: "/images/driver-profile-hero.jpg",
  dealer: "/images/truck-2.jpg",
  page: "/images/jobs-2.jpg",
};

const SEARCH_HERO_BASE64: Partial<Record<SearchScope, string>> = {
  all: "/images/search-jobs-boxes.jpg.b64",
  job: "/images/search-jobs-boxes.jpg.b64",
  dealer: "/images/search-dealerships-trucks.jpg.b64",
};

export default function SearchResultsClient() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const router = useRouter();
  const params = useSearchParams();
  const query = params.get("q") || "";
  const location = params.get("location") || "";
  const requestedScope = params.get("category") as SearchScope | null;
  const scope: SearchScope = ["job", "contract", "asset", "driver", "dealer", "page"].includes(requestedScope || "") ? requestedScope! : "all";
  const [input, setInput] = useState(query);
  const [place, setPlace] = useState(location);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<ListingSearchRow[]>([]);
  const [drivers, setDrivers] = useState<DriverSearchRow[]>([]);
  const [dealers, setDealers] = useState<DealerSearchRow[]>([]);
  const [heroImage, setHeroImage] = useState(SEARCH_HERO_FALLBACK[scope]);

  useEffect(() => {
    setInput(query);
    setPlace(location);
  }, [location, query]);

  useEffect(() => {
    let active = true;
    const encodedPath = SEARCH_HERO_BASE64[scope];
    setHeroImage(SEARCH_HERO_FALLBACK[scope]);

    if (!encodedPath) return () => {
      active = false;
    };

    fetch(encodedPath, { cache: "force-cache" })
      .then((response) => response.ok ? response.text() : Promise.reject(new Error("hero unavailable")))
      .then((encoded) => {
        if (active && encoded.trim()) setHeroImage(`data:image/jpeg;base64,${encoded.trim()}`);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
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
      if (listingResult.status === "fulfilled") setListings(((listingResult.value.rows || []) as ListingSearchRow[]).filter(isCurrentListing));
      if (driverResult.status === "fulfilled") setDrivers((driverResult.value.drivers || []) as DriverSearchRow[]);
      if (dealerResult.status === "fulfilled" && !dealerResult.value.error) setDealers((dealerResult.value.data || []) as unknown as DealerSearchRow[]);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const results = useMemo<SearchResult[]>(() => filterAndRankResults([
    ...listings.map(listingToSearchResult),
    ...drivers.map(driverToSearchResult),
    ...dealers.map(dealerToSearchResult),
    ...loadLinkSitePages,
  ], scope, query, location), [dealers, drivers, listings, location, query, scope]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(routeForScope(scope, input, place));
  }

  return (
    <main className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#fffaf0] text-black"}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[720px] overflow-hidden md:h-[700px]" aria-hidden="true">
          <img
            key={heroImage}
            src={heroImage}
            alt=""
            className="h-full w-full scale-[1.02] object-cover object-center opacity-100 transition-opacity duration-700"
          />
          <div className={`absolute inset-0 ${darkMode ? "bg-black/46" : "bg-black/34"}`} />
          <div className={`absolute inset-0 ${darkMode ? "bg-gradient-to-b from-black/10 via-black/48 to-black" : "bg-gradient-to-b from-black/10 via-[#fffaf0]/46 to-[#fffaf0]"}`} />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-black/30 blur-2xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
          <div className="max-w-3xl pt-3 md:pt-6">
            <h1 className="text-4xl font-black tracking-[-.055em] text-white drop-shadow-[0_3px_22px_rgba(0,0,0,.42)] md:text-6xl">Search LoadLink</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/72 drop-shadow-[0_2px_12px_rgba(0,0,0,.35)]">
              Search public listings, approved drivers, dealerships and every main section of the website.
            </p>
          </div>

          <div className="mt-8 overflow-x-auto no-scrollbar" role="tablist" aria-label="Search LoadLink sections">
            <div className="flex min-w-max gap-3 pb-1.5 pr-4">
              {searchScopes.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={scope === item.value}
                  onClick={() => router.push(routeForScope(item.value, input, place))}
                  className={`min-h-14 shrink-0 rounded-full border px-7 py-3.5 text-base font-semibold tracking-[-.01em] shadow-[0_12px_35px_rgba(0,0,0,.12)] backdrop-blur-2xl backdrop-saturate-150 transition active:scale-[.98] ${
                    scope === item.value
                      ? "border-[#f6b800] bg-[#f6b800] text-black shadow-[0_14px_38px_rgba(246,184,0,.23)]"
                      : darkMode
                        ? "border-white/14 bg-black/42 text-white/70 hover:border-white/28 hover:bg-black/55"
                        : "border-white/50 bg-white/62 text-black/62 hover:bg-white/76"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={submit}
            className={`mt-5 grid gap-3 rounded-[30px] border p-4 shadow-[0_24px_70px_rgba(0,0,0,.16)] backdrop-blur-3xl backdrop-saturate-150 md:grid-cols-[1fr_240px_auto] ${
              darkMode ? "border-white/14 bg-black/48" : "border-white/55 bg-white/68"
            }`}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Search everything on LoadLink"
              className={`h-16 rounded-2xl border px-5 text-base font-semibold outline-none backdrop-blur-xl transition focus:border-[#f6b800] ${
                darkMode
                  ? "border-white/15 bg-white/[.045] text-white placeholder:text-white/38"
                  : "border-black/10 bg-white/56 text-black placeholder:text-black/38"
              }`}
            />
            <SouthAfricaLocationInput
              value={place}
              onChange={setPlace}
              darkMode={darkMode}
              placeholder="City, town or province"
              ariaLabel="Filter all LoadLink results by South African location"
              className={`h-16 w-full rounded-2xl border px-5 text-base font-semibold outline-none backdrop-blur-xl transition focus:border-[#f6b800] ${
                darkMode
                  ? "border-white/15 bg-white/[.045] text-white placeholder:text-white/38"
                  : "border-black/10 bg-white/56 text-black placeholder:text-black/38"
              }`}
            />
            <button type="submit" className="h-16 rounded-2xl bg-[#f6b800] px-8 text-base font-semibold text-black shadow-[0_14px_34px_rgba(246,184,0,.22)] transition active:scale-[.985]">Search</button>
          </form>

          <div className="mt-10 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black md:text-3xl">{scopeLabel(scope)} results</h2>
            <p className={`text-sm font-bold ${darkMode ? "text-white/45" : "text-black/45"}`}>{loading ? "Searching…" : `${results.length} found`}</p>
          </div>

          {loading ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {[0, 1, 2, 3].map((item) => <div key={item} className={`h-28 animate-pulse rounded-[24px] border backdrop-blur-xl ${darkMode ? "border-white/10 bg-white/[.04]" : "border-black/8 bg-white/60"}`} />)}
            </div>
          ) : results.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {results.map((item) => (
                <Link key={item.id} href={item.href} className={`rounded-[24px] border p-5 shadow-[0_14px_36px_rgba(0,0,0,.08)] backdrop-blur-xl transition ${darkMode ? "border-white/10 bg-white/[.045] hover:bg-white/[.075]" : "border-white/65 bg-white/68 hover:bg-white/84"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-black">{item.label}</h3>
                      <p className={`mt-2 text-sm font-semibold ${darkMode ? "text-white/50" : "text-black/50"}`}>{item.meta}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${darkMode ? "border-white/15 text-white/55" : "border-black/10 text-black/50"}`}>{scopeLabel(item.scope)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className={`mt-5 rounded-[24px] border p-10 text-center shadow-[0_14px_36px_rgba(0,0,0,.08)] backdrop-blur-xl ${darkMode ? "border-white/10 bg-white/[.045] text-white/55" : "border-white/65 bg-white/68 text-black/55"}`}>
              <h2 className="text-xl font-black">No public result found</h2>
              <p className="mt-2 text-sm leading-6">Try a shorter word, remove the location, or select All.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
