"use client";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import HomeLogoLink from "@/components/HomeLogoLink";
import SouthAfricaLocationInput from "@/components/SouthAfricaLocationInput";
import SiteMenu from "@/components/SiteMenu";
import AuthStatusButton from "@/components/AuthStatusButton";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
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

  useEffect(() => {
    setInput(query);
    setPlace(location);
  }, [location, query]);

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

      <section className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
        <h1 className="text-4xl font-black tracking-[-.055em] md:text-6xl">Search LoadLink</h1>
        <p className={`mt-3 max-w-2xl text-sm font-semibold leading-6 ${darkMode ? "text-white/55" : "text-black/55"}`}>
          Search public listings, approved drivers, dealerships and every main section of the website.
        </p>

        <div className={`mt-7 overflow-x-auto rounded-2xl border p-1.5 no-scrollbar ${darkMode ? "border-white/12 bg-[#111]" : "border-black/10 bg-white"}`} role="tablist" aria-label="Search LoadLink sections">
          <div className="flex min-w-max gap-1.5">
            {searchScopes.map((item) => <button key={item.value} type="button" role="tab" aria-selected={scope === item.value} onClick={() => router.push(routeForScope(item.value, input, place))} className={`rounded-xl px-4 py-2.5 text-sm font-black ${scope === item.value ? "bg-[#f6b800] text-black" : darkMode ? "text-white/55" : "text-black/50"}`}>{item.label}</button>)}
          </div>
        </div>
        <form onSubmit={submit} className={`mt-3 grid gap-3 rounded-[24px] border p-3 md:grid-cols-[1fr_240px_auto] ${darkMode ? "border-white/12 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
          <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search everything on LoadLink" className={`h-14 rounded-xl border px-4 text-sm font-bold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-black" : "border-black/10 bg-[#faf8f2]"}`} />
          <SouthAfricaLocationInput value={place} onChange={setPlace} darkMode={darkMode} placeholder="City, town or province" ariaLabel="Filter all LoadLink results by South African location" className={`h-14 w-full rounded-xl border px-4 text-sm font-bold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-black text-white" : "border-black/10 bg-[#faf8f2] text-black"}`} />
          <button type="submit" className="h-14 rounded-xl bg-[#f6b800] px-7 text-sm font-black text-black">Search</button>
        </form>

        <div className="mt-8 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black">{scopeLabel(scope)} results</h2>
          <p className={`text-sm font-bold ${darkMode ? "text-white/45" : "text-black/45"}`}>{loading ? "Searching…" : `${results.length} found`}</p>
        </div>

        {loading ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[0, 1, 2, 3].map((item) => <div key={item} className={`h-28 animate-pulse rounded-2xl border ${darkMode ? "border-white/10 bg-white/[.04]" : "border-black/10 bg-black/[.03]"}`} />)}
          </div>
        ) : results.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {results.map((item) => (
              <Link key={item.id} href={item.href} className={`rounded-2xl border p-5 transition ${darkMode ? "border-white/10 bg-[#0b0b0b] hover:bg-[#111111]" : "border-black/10 bg-white hover:bg-[#fff6dc]"}`}>
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
          <div className={`mt-5 rounded-2xl border p-10 text-center ${darkMode ? "border-white/10 bg-[#0b0b0b] text-white/55" : "border-black/10 bg-white text-black/55"}`}>
            <h2 className="text-xl font-black">No public result found</h2>
            <p className="mt-2 text-sm leading-6">Try a shorter word, remove the location, or select All.</p>
          </div>
        )}
      </section>
    </main>
  );
}
