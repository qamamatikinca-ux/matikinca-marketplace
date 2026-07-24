"use client";

import ChatLauncher from "@/components/ChatLauncher";
import RequireAuthLink from "@/components/RequireAuthLink";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { formatListingRate } from "@/lib/formatCurrency";

type PortalKind = "job" | "contract" | "asset";

type ListingRow = {
  id: string;
  title?: string | null;
  city?: string | null;
  vehicle_group?: string | null;
  rate?: string | null;
  posted_by?: string | null;
  description?: string | null;
  photos?: string[] | null;
  sponsored?: boolean | null;
  package_type?: string | null;
  created_at?: string | null;
  boost_expires_at?: string | null;
  display_tier?: number | null;
  listing_kind?: string | null;
};

type FeaturedListing = {
  id: string;
  title: string;
  location: string;
  category: string;
  rate: string;
  image: string;
  href: string;
  verified: boolean;
  premium: boolean;
};

type QuickCategory = {
  label: string;
  value: "truck" | "event-catering" | "logistics" | "mining-farming";
  searchTerm: string;
};

type SearchSuggestion = {
  id: string;
  label: string;
  meta: string;
  searchTerm: string;
  href: string;
  searchable: string;
  priority: number;
};

const fallbackFeatured: FeaturedListing[] = [
  {
    id: "featured-job",
    title: "Daily delivery route",
    location: "Johannesburg",
    category: "Logistics job",
    rate: "From R1 850 / day",
    image: "/images/jobs/job-card-1.jpg",
    href: "/jobs?portal=job&search=delivery",
    verified: true,
    premium: true,
  },
  {
    id: "featured-contract",
    title: "Construction material deliveries",
    location: "Gauteng",
    category: "Contract",
    rate: "Rates by route",
    image: "/images/contracts-1.jpg",
    href: "/jobs?portal=contract&search=construction",
    verified: true,
    premium: true,
  },
  {
    id: "featured-truck",
    title: "Long-distance truck hire",
    location: "Pretoria",
    category: "Vehicle listing",
    rate: "Request a quote",
    image: "/images/truck-1.jpg",
    href: "/jobs?portal=asset&search=truck",
    verified: false,
    premium: true,
  },
];

const quickCategories: QuickCategory[] = [
  { label: "Truck", value: "truck", searchTerm: "truck trailer mobile unit" },
  { label: "Event & Catering", value: "event-catering", searchTerm: "event catering food truck mobile toilet mobile fridge" },
  { label: "Logistics", value: "logistics", searchTerm: "logistics delivery transport freight" },
  { label: "Mining & Farming", value: "mining-farming", searchTerm: "mining farming agriculture" },
];

const searchCatalogue: SearchSuggestion[] = [
  { id: "portal-jobs", label: "Find available jobs", meta: "Jobs portal", searchTerm: "jobs", href: "/jobs?portal=job", searchable: "jobs work driver owner driver delivery logistics transport load route", priority: 100 },
  { id: "portal-contracts", label: "Find available contracts", meta: "Contracts portal", searchTerm: "contracts", href: "/jobs?portal=contract", searchable: "contracts tender recurring route construction mining farming logistics", priority: 100 },
  { id: "portal-assets", label: "Find vehicles and mobile units", meta: "Truck and equipment portal", searchTerm: "vehicles mobile units", href: "/jobs?portal=asset", searchable: "truck trailer mobile toilet mobile fridge food truck mobile kitchen vehicle hire", priority: 100 },

  { id: "job-delivery", label: "Delivery jobs", meta: "Jobs · Logistics", searchTerm: "delivery", href: "/jobs?portal=job&search=delivery", searchable: "delivery local route courier warehouse job jobs logistics", priority: 80 },
  { id: "job-driver", label: "Driver and owner-driver jobs", meta: "Jobs · Drivers", searchTerm: "driver owner driver", href: "/jobs?portal=job&search=driver", searchable: "driver owner driver code 10 code 14 job jobs", priority: 80 },
  { id: "job-construction", label: "Construction transport jobs", meta: "Jobs · Construction", searchTerm: "construction transport", href: "/jobs?portal=job&search=construction", searchable: "construction building material crane site delivery job", priority: 78 },
  { id: "job-event", label: "Event and catering jobs", meta: "Jobs · Event & Catering", searchTerm: "event catering", href: "/jobs?portal=job&category=event-catering", searchable: "event catering mobile kitchen food truck mobile toilet mobile fridge job", priority: 78 },
  { id: "job-mining", label: "Mining and farming jobs", meta: "Jobs · Mining & Farming", searchTerm: "mining farming", href: "/jobs?portal=job&category=mining-farming", searchable: "mining farming agriculture farm transport job", priority: 78 },

  { id: "contract-construction", label: "Construction logistics contracts", meta: "Contracts · Construction", searchTerm: "construction", href: "/jobs?portal=contract&search=construction", searchable: "construction contract building material logistics contract", priority: 75 },
  { id: "contract-mining", label: "Mining transport contracts", meta: "Contracts · Mining", searchTerm: "mining", href: "/jobs?portal=contract&search=mining", searchable: "mining transport contract side tipper mine", priority: 75 },
  { id: "contract-farming", label: "Farming transport contracts", meta: "Contracts · Farming", searchTerm: "farming", href: "/jobs?portal=contract&search=farming", searchable: "farming agriculture contract livestock produce transport", priority: 75 },
  { id: "contract-recurring", label: "Recurring delivery contracts", meta: "Contracts · Logistics", searchTerm: "recurring delivery", href: "/jobs?portal=contract&search=delivery", searchable: "recurring delivery contract weekly monthly route logistics", priority: 75 },

  { id: "asset-side-tipper", label: "Side tippers", meta: "Vehicles · Trucks", searchTerm: "side tipper", href: "/jobs?portal=asset&search=side%20tipper", searchable: "side tipper truck mining vehicle hire", priority: 70 },
  { id: "asset-superlink", label: "Superlinks", meta: "Vehicles · Trucks", searchTerm: "superlink", href: "/jobs?portal=asset&search=superlink", searchable: "superlink truck trailer long distance", priority: 70 },
  { id: "asset-flatdeck", label: "Flat decks and lowbeds", meta: "Vehicles · Trailers", searchTerm: "flat deck lowbed", href: "/jobs?portal=asset&search=flat%20deck", searchable: "flat deck flatbed lowbed trailer abnormal load", priority: 70 },
  { id: "asset-tautliner", label: "Tautliners and closed trucks", meta: "Vehicles · Trucks", searchTerm: "tautliner closed truck", href: "/jobs?portal=asset&search=tautliner", searchable: "tautliner closed truck curtain side delivery", priority: 70 },
  { id: "asset-bakkie", label: "Bakkies and small delivery vehicles", meta: "Vehicles · Local Delivery", searchTerm: "bakkie", href: "/jobs?portal=asset&search=bakkie", searchable: "bakkie van small delivery vehicle", priority: 70 },
  { id: "asset-mobile-toilet", label: "Mobile toilets", meta: "Mobile Units · Events", searchTerm: "mobile toilet", href: "/jobs?portal=asset&search=mobile%20toilet", searchable: "mobile toilet event sanitation unit", priority: 70 },
  { id: "asset-mobile-fridge", label: "Mobile fridges", meta: "Mobile Units · Cold Storage", searchTerm: "mobile fridge", href: "/jobs?portal=asset&search=mobile%20fridge", searchable: "mobile fridge refrigerated cold storage trailer", priority: 70 },
  { id: "asset-food-truck", label: "Food trucks and mobile kitchens", meta: "Mobile Units · Catering", searchTerm: "food truck mobile kitchen", href: "/jobs?portal=asset&search=food%20truck", searchable: "food truck mobile kitchen catering trailer", priority: 70 },
];

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function portalForListing(item: ListingRow): PortalKind {
  const text = normalise(`${item.title || ""} ${item.vehicle_group || ""} ${item.description || ""}`);
  if (/listing type contract|\bcontract\b|\btender\b/.test(text)) return "contract";
  if (/listing type (truck|trailer|mobile toilet|mobile fridge|food truck|mobile kitchen|other mobile unit)|for hire|available for hire/.test(text)) return "asset";
  return "job";
}

function portalLabel(portal: PortalKind) {
  if (portal === "contract") return "Contracts portal";
  if (portal === "asset") return "Vehicles and mobile units";
  return "Jobs portal";
}

function suggestionScore(item: SearchSuggestion, query: string, words: string[]) {
  const label = normalise(item.label);
  const searchable = normalise(`${item.label} ${item.meta} ${item.searchable}`);
  if (!words.length) return item.priority;
  if (!words.every((word) => searchable.includes(word))) return -1;
  let score = item.priority;
  if (label.startsWith(query)) score += 40;
  if (searchable.startsWith(query)) score += 25;
  if (searchable.includes(query)) score += 15;
  return score;
}

export default function MarketplaceDiscovery({ darkMode }: { darkMode: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [liveListings, setLiveListings] = useState<ListingRow[]>([]);
  const searchWrapperRef = useRef<HTMLDivElement | null>(null);
  const fabWrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      if (!isSupabaseConfigured) return;

      let result = await supabase.from("job_listings").select("*").order("created_at", { ascending: false }).limit(120);
      if (result.error) result = await supabase.from("job_listings").select("*").limit(120);
      if (!cancelled && !result.error && result.data) setLiveListings(result.data as ListingRow[]);
    }

    loadListings();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function closeOpenMenus(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (!searchWrapperRef.current?.contains(target)) setShowSuggestions(false);
      if (!fabWrapperRef.current?.contains(target)) setFabOpen(false);
    }

    document.addEventListener("mousedown", closeOpenMenus);
    document.addEventListener("touchstart", closeOpenMenus);
    return () => {
      document.removeEventListener("mousedown", closeOpenMenus);
      document.removeEventListener("touchstart", closeOpenMenus);
    };
  }, []);

  const featuredListings = useMemo<FeaturedListing[]>(() => {
    if (!liveListings.length) return fallbackFeatured;

    const ordered = [...liveListings].sort((a, b) => {
      const score = (item: ListingRow) => {
        const activeBoost = Boolean(item.boost_expires_at && new Date(item.boost_expires_at) > new Date());
        return Number(item.display_tier || 0) * 10 + (activeBoost ? 8 : 0) + (item.sponsored ? 4 : 0) + (item.package_type === "dealer" ? 3 : item.package_type === "pro" ? 2 : 0);
      };
      return score(b) - score(a);
    });
    return ordered.slice(0, 6).map((item) => {
      const portal = portalForListing(item);
      return {
        id: item.id,
        title: item.title || "LoadLink listing",
        location: item.city || "South Africa",
        category: item.vehicle_group || portalLabel(portal),
        rate: formatListingRate(item.rate),
        image: item.photos?.[0] || "/images/jobs/job-card-1.jpg",
        href: `/jobs?portal=${portal}#job-${item.id}`,
        verified: false,
        premium: Boolean(item.sponsored || item.package_type === "pro" || item.package_type === "dealer" || (item.boost_expires_at && new Date(item.boost_expires_at) > new Date())),
      };
    });
  }, [liveListings]);

  const suggestions = useMemo<SearchSuggestion[]>(() => {
    const clean = normalise(query);
    const words = clean.split(/\s+/).filter(Boolean);

    const liveItems: SearchSuggestion[] = liveListings.map((item) => {
      const portal = portalForListing(item);
      const title = item.title || "LoadLink listing";
      const city = item.city || "South Africa";
      const category = item.vehicle_group || "Listing";
      return {
        id: `listing-${item.id}`,
        label: title,
        meta: `${portalLabel(portal)} · ${city} · ${category}`,
        searchTerm: `${title} ${city}`,
        href: `/jobs?portal=${portal}#job-${item.id}`,
        searchable: `${title} ${city} ${category} ${item.rate || ""} ${item.posted_by || ""} ${item.description || ""}`,
        priority: 120,
      };
    });

    const combined = [...liveItems, ...searchCatalogue];
    return combined
      .map((item) => ({ item, score: suggestionScore(item, clean, words) }))
      .filter(({ score }) => score >= 0)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item)
      .slice(0, 9);
  }, [query, liveListings]);

  function launchSearch(value: string, destination?: string) {
    const term = value.trim();
    const firstMatch = suggestions[0];
    const target = destination || firstMatch?.href;
    if (!term && !target) return;

    if (target) {
      setQuery(term || firstMatch?.label || "");
      setShowSuggestions(false);
      router.push(target);
      return;
    }

    localStorage.setItem("loadlink-home-search", term);
    setShowSuggestions(false);
    router.push(`/jobs?search=${encodeURIComponent(term)}`);
  }

  function openCategory(category: QuickCategory) {
    setActiveCategory(category.value);
    localStorage.removeItem("loadlink-home-search");
    setShowSuggestions(false);
    router.push(`/jobs?search=${encodeURIComponent(category.searchTerm)}&category=${category.value}`);
  }

  return (
    <>
      <section className={`px-5 py-6 md:px-12 md:py-8 ${darkMode ? "bg-[#050505] text-white" : "bg-white text-black"}`}>
        <div className="mx-auto max-w-7xl">
          <div ref={searchWrapperRef} className="relative">
            <div className={`flex min-h-14 items-center overflow-hidden rounded-2xl border ${darkMode ? "border-white/15 bg-black" : "border-black/15 bg-white"}`}>
              <span className="flex h-14 w-12 shrink-0 items-center justify-center text-[#b88900]"><SearchIcon /></span>
              <input
                value={query}
                onFocus={() => setShowSuggestions(true)}
                onChange={(event) => { setQuery(event.target.value); setShowSuggestions(true); }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") launchSearch(query);
                  if (event.key === "Escape") setShowSuggestions(false);
                }}
                autoComplete="off"
                placeholder="Search jobs, contracts, vehicles, locations or services"
                className={`h-14 min-w-0 flex-1 bg-transparent pr-2 text-sm font-bold outline-none ${darkMode ? "placeholder:text-white/35" : "placeholder:text-black/40"}`}
              />
              <button onClick={() => launchSearch(query)} className="mr-1.5 h-11 rounded-xl bg-[#f6b800] px-4 text-xs font-black uppercase tracking-wide text-black">Search</button>
            </div>

            {showSuggestions ? (
              <div className={`absolute inset-x-0 top-[60px] z-40 max-h-[360px] overflow-y-auto rounded-2xl border shadow-2xl ${darkMode ? "border-white/15 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
                {suggestions.length ? suggestions.map((item) => (
                  <button key={item.id} onClick={() => launchSearch(item.searchTerm, item.href)} className={`flex w-full items-center justify-between gap-4 border-b px-4 py-3.5 text-left last:border-b-0 ${darkMode ? "border-white/10 hover:bg-white/5" : "border-black/5 hover:bg-[#fff6dc]"}`}>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">{item.label}</span>
                      <span className={`mt-1 block truncate text-[11px] font-bold uppercase tracking-[0.1em] ${darkMode ? "text-white/40" : "text-black/40"}`}>{item.meta}</span>
                    </span>
                    <ArrowIcon />
                  </button>
                )) : (
                  <div className="px-4 py-5 text-sm font-bold opacity-60">No exact match yet. Keep typing a category, location or vehicle.</div>
                )}
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 no-scrollbar">
            {quickCategories.map((category) => (
              <button
                key={category.value}
                onClick={() => openCategory(category)}
                className={`shrink-0 snap-start rounded-full border px-4 py-2.5 text-xs font-black uppercase tracking-wide ${activeCategory === category.value ? "border-[#f6b800] bg-[#f6b800] text-black" : darkMode ? "border-white/15 bg-white/5 text-white/70" : "border-black/10 bg-black/[0.03] text-black/65"}`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <ChatLauncher />

      <div ref={fabWrapperRef} className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-2">
        {fabOpen ? (
          <div className={`w-60 overflow-hidden border shadow-2xl ${darkMode ? "border-white/15 bg-black text-white" : "border-black/10 bg-white text-black"}`}>
            <RequireAuthLink href="/jobs/list" className="block border-b border-black/10 px-4 py-3.5 text-sm font-black">Post a job</RequireAuthLink>
            <RequireAuthLink href="/jobs/list?mode=asset" className="block border-b border-black/10 px-4 py-3.5 text-sm font-black">List a vehicle or mobile unit</RequireAuthLink>
            <RequireAuthLink href="/jobs/list?mode=contract" className="block px-4 py-3.5 text-sm font-black">Post a contract</RequireAuthLink>
          </div>
        ) : null}
        <button onClick={() => setFabOpen((value) => !value)} aria-label="Open listing menu" className="flex h-14 w-14 items-center justify-center rounded-full border border-black bg-[#f6b800] text-black shadow-2xl"><PlusIcon open={fabOpen} /></button>
      </div>
    </>
  );
}

export function VerifiedBadge() {
  return <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#c99a17] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#b88900]"><CheckIcon />Verified</span>;
}

function SearchIcon(){return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2"/><path d="m16 16 4.2 4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
function ArrowIcon(){return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function CheckIcon(){return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function PlusIcon({open}:{open:boolean}){return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={open?"rotate-45":""}><path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>}
