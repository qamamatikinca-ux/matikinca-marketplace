"use client";

import RequireAuthLink from "@/components/RequireAuthLink";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { flexibleMatch, normaliseSearch, searchTokens, tokenMatches } from "@/lib/smartSearch";

type SearchCategory = "job" | "contract" | "asset" | "driver";
type ListingRow = {
  id: string;
  title?: string | null;
  city?: string | null;
  vehicle_group?: string | null;
  rate?: string | null;
  posted_by?: string | null;
  description?: string | null;
  listing_kind?: string | null;
  status?: string | null;
  moderation_status?: string | null;
  expires_at?: string | null;
};
type DriverRow = {
  id: string;
  full_name?: string | null;
  headline?: string | null;
  city?: string | null;
  province?: string | null;
  licence_code?: string | null;
  vehicle_types?: string[] | null;
};
type SearchSuggestion = {
  id: string;
  label: string;
  meta: string;
  href: string;
  searchable: string;
  category: SearchCategory;
  priority: number;
};

const categories: { label: string; value: SearchCategory }[] = [
  { label: "Jobs", value: "job" },
  { label: "Contracts", value: "contract" },
  { label: "Vehicles", value: "asset" },
  { label: "Drivers", value: "driver" },
];

const locationSuggestions = [
  "Gauteng",
  "Johannesburg",
  "Pretoria",
  "Centurion",
  "Durban",
  "Cape Town",
  "Gqeberha",
  "East London",
  "Bloemfontein",
  "Polokwane",
  "Mbombela",
  "Rustenburg",
];

function listingCategory(item: ListingRow): Exclude<SearchCategory, "driver"> {
  const stored = String(item.listing_kind || "").toLowerCase();
  if (["vehicle", "asset", "truck_sale", "vehicle_listing"].includes(stored)) return "asset";
  if (stored === "contract") return "contract";

  const match = String(item.description || "").match(/^Listing type:\s*([^\n]+)/i);
  const described = String(match?.[1] || "").toLowerCase();
  if (described.includes("contract")) return "contract";
  if (described.includes("vehicle") || described.includes("truck") || described.includes("trailer") || described.includes("mobile unit")) return "asset";
  return "job";
}

function isCurrent(item: ListingRow) {
  if (item.status && item.status !== "active") return false;
  if (item.moderation_status && item.moderation_status !== "approved") return false;
  if (item.expires_at) {
    const expiry = new Date(item.expires_at).getTime();
    if (Number.isFinite(expiry) && expiry <= Date.now()) return false;
  }
  return true;
}

function scoreSuggestion(item: SearchSuggestion, query: string, location: string) {
  const combinedQuery = normaliseSearch(`${query} ${location}`);
  if (!combinedQuery) return item.priority;
  const tokens = searchTokens(combinedQuery);
  const searchable = normaliseSearch(`${item.label} ${item.meta} ${item.searchable}`);
  const matches = tokens.filter((token) => tokenMatches(searchable, token)).length;
  if (!flexibleMatch(searchable, combinedQuery) && matches === 0) return -1;
  let score = item.priority + matches * 18;
  if (normaliseSearch(item.label).startsWith(normaliseSearch(query))) score += 35;
  if (searchable.includes(combinedQuery)) score += 20;
  return score;
}

export default function MarketplaceDiscovery({ darkMode }: { darkMode: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<SearchCategory>("job");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showLocations, setShowLocations] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [liveListings, setLiveListings] = useState<ListingRow[]>([]);
  const [liveDrivers, setLiveDrivers] = useState<DriverRow[]>([]);
  const searchWrapperRef = useRef<HTMLDivElement | null>(null);
  const locationWrapperRef = useRef<HTMLDivElement | null>(null);
  const fabWrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;

    fetch(`/api/job-listings?t=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (active) setLiveListings(((payload.rows || []) as ListingRow[]).filter(isCurrent));
      })
      .catch(() => undefined);

    fetch("/api/phase2/public-drivers?limit=30&offset=0", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (active) setLiveDrivers((payload.drivers || []) as DriverRow[]);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function closeMenus(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (!searchWrapperRef.current?.contains(target)) setShowSuggestions(false);
      if (!locationWrapperRef.current?.contains(target)) setShowLocations(false);
      if (!fabWrapperRef.current?.contains(target)) setFabOpen(false);
    }

    document.addEventListener("mousedown", closeMenus);
    document.addEventListener("touchstart", closeMenus);
    return () => {
      document.removeEventListener("mousedown", closeMenus);
      document.removeEventListener("touchstart", closeMenus);
    };
  }, []);

  const suggestions = useMemo(() => {
    const listingSuggestions: SearchSuggestion[] = liveListings
      .filter((item) => listingCategory(item) === category)
      .map((item) => {
        const itemCategory = listingCategory(item);
        const title = item.title || "LoadLink listing";
        const city = item.city || "South Africa";
        return {
          id: `listing-${item.id}`,
          label: title,
          meta: `${categoryLabel(itemCategory)} · ${city}`,
          href: `/jobs?portal=${itemCategory}&search=${encodeURIComponent(`${title} ${city}`)}#job-${item.id}`,
          searchable: `${title} ${city} ${item.vehicle_group || ""} ${item.rate || ""} ${item.posted_by || ""} ${item.description || ""}`,
          category: itemCategory,
          priority: 130,
        };
      });

    const driverSuggestions: SearchSuggestion[] = category === "driver"
      ? liveDrivers.map((driver) => ({
          id: `driver-${driver.id}`,
          label: driver.full_name || "Approved LoadLink driver",
          meta: `${[driver.city, driver.province].filter(Boolean).join(", ") || "South Africa"} · Licence ${driver.licence_code || "on request"}`,
          href: `/drivers?search=${encodeURIComponent(driver.full_name || query)}${location ? `&city=${encodeURIComponent(location)}` : ""}`,
          searchable: `${driver.full_name || ""} ${driver.headline || ""} ${driver.city || ""} ${driver.province || ""} ${driver.licence_code || ""} ${(driver.vehicle_types || []).join(" ")}`,
          category: "driver" as const,
          priority: 130,
        }))
      : [];

    const staticSuggestion: SearchSuggestion = {
      id: `browse-${category}`,
      label: `Browse all ${categoryLabel(category).toLowerCase()}`,
      meta: location ? `Results around ${location}` : "Search the full LoadLink marketplace",
      href: routeFor(category, query, location),
      searchable: `${categoryLabel(category)} ${query} ${location}`,
      category,
      priority: 90,
    };

    return [...listingSuggestions, ...driverSuggestions, staticSuggestion]
      .map((item) => ({ item, score: scoreSuggestion(item, query, location) }))
      .filter(({ score }) => score >= 0)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item)
      .slice(0, 9);
  }, [category, liveDrivers, liveListings, location, query]);

  const filteredLocations = useMemo(() => {
    const clean = normaliseSearch(location);
    if (!clean) return locationSuggestions;
    return locationSuggestions.filter((item) => normaliseSearch(item).includes(clean)).slice(0, 8);
  }, [location]);

  function launchSearch(destination?: string) {
    setShowSuggestions(false);
    setShowLocations(false);
    router.push(destination || routeFor(category, query, location));
  }

  function chooseCategory(value: SearchCategory) {
    setCategory(value);
    setShowSuggestions(Boolean(query.trim() || location.trim()));
  }

  return (
    <>
      <section className={`px-5 py-6 md:px-12 md:py-8 ${darkMode ? "bg-[#050505] text-white" : "bg-white text-black"}`}>
        <div className="mx-auto max-w-7xl">
          <div className="flex snap-x gap-2 overflow-x-auto pb-2 no-scrollbar" aria-label="Search category">
            {categories.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => chooseCategory(item.value)}
                aria-pressed={category === item.value}
                className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-black uppercase tracking-wide ${
                  category === item.value
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
              <label htmlFor="loadlink-marketplace-search" className="sr-only">Search LoadLink {categoryLabel(category).toLowerCase()}</label>
              <div className={`flex min-h-14 items-center overflow-hidden rounded-2xl border shadow-sm ${darkMode ? "border-white/15 bg-black" : "border-black/15 bg-white"}`}>
                <span className="flex h-14 w-12 shrink-0 items-center justify-center text-[#b88900]"><SearchIcon /></span>
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
                  placeholder={placeholderFor(category)}
                  className={`h-14 min-w-0 flex-1 bg-transparent pr-2 text-sm font-bold outline-none ${darkMode ? "placeholder:text-white/35" : "placeholder:text-black/40"}`}
                />
                <button type="button" onClick={() => launchSearch()} className="mr-1.5 h-11 rounded-xl bg-[#f6b800] px-4 text-xs font-black uppercase tracking-wide text-black">Search</button>
              </div>

              {showSuggestions ? (
                <div className={`absolute inset-x-0 top-[60px] z-40 max-h-[390px] overflow-y-auto rounded-2xl border shadow-2xl ${darkMode ? "border-white/15 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
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
                    <div className={`px-4 py-5 text-sm font-semibold ${darkMode ? "text-white/50" : "text-black/50"}`}>No matching approved results yet. Press Search to view the full category.</div>
                  )}
                </div>
              ) : null}
            </div>

            <div ref={locationWrapperRef} className="relative">
              <label htmlFor="loadlink-marketplace-location" className="sr-only">Optional city or province</label>
              <input
                id="loadlink-marketplace-location"
                value={location}
                onFocus={() => setShowLocations(true)}
                onChange={(event) => {
                  setLocation(event.target.value);
                  setShowLocations(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") launchSearch();
                  if (event.key === "Escape") setShowLocations(false);
                }}
                autoComplete="address-level2"
                placeholder="City or province (optional)"
                className={`h-14 w-full rounded-2xl border px-4 text-sm font-bold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-black text-white placeholder:text-white/35" : "border-black/15 bg-white text-black placeholder:text-black/40"}`}
              />
              {showLocations ? (
                <div className={`absolute inset-x-0 top-[60px] z-30 max-h-72 overflow-y-auto rounded-2xl border shadow-2xl ${darkMode ? "border-white/15 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
                  {filteredLocations.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setLocation(item);
                        setShowLocations(false);
                        setShowSuggestions(true);
                      }}
                      className={`block w-full border-b px-4 py-3 text-left text-sm font-black last:border-b-0 ${darkMode ? "border-white/10 hover:bg-white/5" : "border-black/5 hover:bg-[#fff6dc]"}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
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

function routeFor(category: SearchCategory, query: string, location: string) {
  const term = [query.trim(), location.trim()].filter(Boolean).join(" ");
  const encoded = encodeURIComponent(term);
  if (category === "driver") return `/drivers${term ? `?search=${encoded}` : ""}${location ? `${term ? "&" : "?"}city=${encodeURIComponent(location)}` : ""}`;
  if (category === "contract") return `/contracts${term ? `?search=${encoded}` : ""}`;
  return `/jobs?portal=${category}${term ? `&search=${encoded}` : ""}`;
}

function categoryLabel(category: SearchCategory) {
  if (category === "contract") return "Contracts";
  if (category === "asset") return "Vehicles";
  if (category === "driver") return "Drivers";
  return "Jobs";
}

function placeholderFor(category: SearchCategory) {
  if (category === "contract") return "Search logistics contracts";
  if (category === "asset") return "Search commercial vehicles or mobile units";
  if (category === "driver") return "Search approved drivers";
  return "Search logistics jobs";
}

export function VerifiedBadge() {
  return <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#c99a17] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#b88900]"><CheckIcon />Verified</span>;
}

function SearchIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" /><path d="m16 16 4.2 4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}
function ArrowIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function CheckIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function PlusIcon({ open }: { open: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={open ? "rotate-45" : ""} aria-hidden="true"><path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>;
}
