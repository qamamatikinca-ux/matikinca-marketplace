"use client";

import RequireAuthLink from "@/components/RequireAuthLink";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { detectIntent, flexibleMatch, normaliseSearch, searchTokens, tokenMatches } from "@/lib/smartSearch";

type PortalKind = "job" | "contract" | "asset";
type ListingRow = {
  id: string;
  title?: string | null;
  city?: string | null;
  vehicle_group?: string | null;
  rate?: string | null;
  posted_by?: string | null;
  description?: string | null;
};
type QuickCategory = { label: string; value: "truck" | "event-catering" | "logistics" | "mining-farming"; searchTerm: string };
type SearchSuggestion = { id: string; label: string; meta: string; href: string; searchable: string; priority: number };

const quickCategories: QuickCategory[] = [
  { label: "Truck", value: "truck", searchTerm: "truck trailer mobile unit" },
  { label: "Event & Catering", value: "event-catering", searchTerm: "event catering food truck mobile toilet mobile fridge" },
  { label: "Logistics", value: "logistics", searchTerm: "logistics delivery transport freight" },
  { label: "Mining & Farming", value: "mining-farming", searchTerm: "mining farming agriculture" },
];

const catalogue: SearchSuggestion[] = [
  { id: "jobs", label: "Find logistics jobs", meta: "Jobs for truck owners, drivers and mobile-unit operators", href: "/jobs?portal=job", searchable: "job jobs work opportunity load route delivery driver owner driver logistics transport", priority: 100 },
  { id: "contracts", label: "Find logistics contracts", meta: "Recurring, project and tender opportunities", href: "/jobs?portal=contract", searchable: "contract contracts tender recurring construction mining farming transport", priority: 100 },
  { id: "drivers", label: "Browse drivers available for work", meta: "Approved professional driver profiles", href: "/drivers", searchable: "driver drivers code 10 code 14 prdp professional profile hire", priority: 95 },
  { id: "dealer", label: "LoadLink Commercial Centurion", meta: "Featured verified dealership", href: "/dealership/loadlink-commercial-centurion", searchable: "dealer dealership showroom truck sales centurion gauteng commercial", priority: 90 },
  { id: "delivery", label: "Delivery jobs", meta: "Local and regional logistics work", href: "/jobs?portal=job&search=delivery", searchable: "delivery courier warehouse local route job work gauteng johannesburg pretoria", priority: 80 },
  { id: "mining", label: "Mining transport opportunities", meta: "Jobs and contracts", href: "/jobs?search=mining", searchable: "mining side tipper transport job contract mpumalanga limpopo north west", priority: 80 },
  { id: "event", label: "Event and catering opportunities", meta: "Mobile kitchens, toilets, fridges and food trucks", href: "/jobs?category=event-catering", searchable: "event catering food truck mobile kitchen mobile toilet mobile fridge job", priority: 78 },
];

function portalForListing(item: ListingRow): PortalKind {
  const text = normaliseSearch(`${item.title || ""} ${item.vehicle_group || ""} ${item.description || ""}`);
  if (/\bcontract\b|\btender\b|\brecurring\b/.test(text)) return "contract";
  if (/\bfor hire\b|\btruck\b|\btrailer\b|\bmobile unit\b|\bfood truck\b|\bmobile toilet\b|\bmobile fridge\b/.test(text)) return "asset";
  return "job";
}
function portalLabel(portal: PortalKind) { return portal === "contract" ? "Contract" : portal === "asset" ? "Vehicle or mobile unit" : "Job"; }

function scoreSuggestion(item: SearchSuggestion, query: string) {
  const clean = normaliseSearch(query);
  if (!clean) return item.priority;
  const tokens = searchTokens(clean);
  const searchable = normaliseSearch(`${item.label} ${item.meta} ${item.searchable}`);
  const matches = tokens.filter((token) => tokenMatches(searchable, token)).length;
  if (!flexibleMatch(searchable, clean) && matches === 0) return -1;
  let score = item.priority + matches * 18;
  if (normaliseSearch(item.label).startsWith(clean)) score += 45;
  if (searchable.includes(clean)) score += 25;
  return score;
}

export default function MarketplaceDiscovery({ darkMode }: { darkMode: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [liveListings, setLiveListings] = useState<ListingRow[]>([]);
  const searchWrapperRef = useRef<HTMLDivElement | null>(null);
  const fabWrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    supabase.from("job_listings").select("id,title,city,vehicle_group,rate,posted_by,description").order("created_at", { ascending: false }).limit(150)
      .then(({ data, error }) => { if (active && !error && data) setLiveListings(data as ListingRow[]); });
    return () => { active = false; };
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

  const suggestions = useMemo(() => {
    const live: SearchSuggestion[] = liveListings.map((item) => {
      const portal = portalForListing(item);
      const title = item.title || "LoadLink listing";
      const city = item.city || "South Africa";
      return {
        id: `listing-${item.id}`,
        label: title,
        meta: `${portalLabel(portal)} · ${city}`,
        href: `/jobs?portal=${portal}&search=${encodeURIComponent(`${title} ${city}`)}#job-${item.id}`,
        searchable: `${title} ${city} ${item.vehicle_group || ""} ${item.rate || ""} ${item.posted_by || ""} ${item.description || ""}`,
        priority: 125,
      };
    });

    const ranked = [...live, ...catalogue]
      .map((item) => ({ item, score: scoreSuggestion(item, query) }))
      .filter(({ score }) => score >= 0)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item)
      .slice(0, 8);

    const term = query.trim();
    if (term) {
      const intent = detectIntent(term);
      const portal = intent === "contract" ? "contract" : intent === "asset" ? "asset" : "job";
      const smartHref = intent === "driver" ? `/drivers?search=${encodeURIComponent(term)}` : intent === "dealer" ? `/dealership/loadlink-commercial-centurion` : `/jobs?portal=${portal}&search=${encodeURIComponent(term)}`;
      ranked.unshift({ id: "smart-search", label: `Search all LoadLink for “${term}”`, meta: "Smart search across wording, locations and related terms", href: smartHref, searchable: term, priority: 999 });
    }
    return ranked.slice(0, 9);
  }, [liveListings, query]);

  function launchSearch(destination?: string) {
    const term = query.trim();
    const target = destination || suggestions[0]?.href;
    if (!target && !term) return;
    setShowSuggestions(false);
    if (target) router.push(target);
    else router.push(`/jobs?search=${encodeURIComponent(term)}`);
  }

  function openCategory(category: QuickCategory) {
    setActiveCategory(category.value);
    setShowSuggestions(false);
    router.push(`/jobs?search=${encodeURIComponent(category.searchTerm)}&category=${category.value}`);
  }

  return (
    <>
      <section className={`px-5 py-6 md:px-12 md:py-8 ${darkMode ? "bg-[#050505] text-white" : "bg-white text-black"}`}>
        <div className="mx-auto max-w-7xl">
          <div ref={searchWrapperRef} className="relative">
            <div className={`flex min-h-14 items-center overflow-hidden rounded-2xl border shadow-sm ${darkMode ? "border-white/15 bg-black" : "border-black/15 bg-white"}`}>
              <span className="flex h-14 w-12 shrink-0 items-center justify-center text-[#b88900]"><SearchIcon /></span>
              <input value={query} onFocus={() => setShowSuggestions(true)} onChange={(event) => { setQuery(event.target.value); setShowSuggestions(true); }} onKeyDown={(event) => { if (event.key === "Enter") launchSearch(); if (event.key === "Escape") setShowSuggestions(false); }} autoComplete="off" placeholder="Try “jobs in Gauteng”, “side tipper contract” or “driver in Pretoria”" className={`h-14 min-w-0 flex-1 bg-transparent pr-2 text-sm font-bold outline-none ${darkMode ? "placeholder:text-white/35" : "placeholder:text-black/40"}`} />
              <button onClick={() => launchSearch()} className="mr-1.5 h-11 rounded-xl bg-[#f6b800] px-4 text-xs font-black uppercase tracking-wide text-black">Search</button>
            </div>

            {showSuggestions ? (
              <div className={`absolute inset-x-0 top-[60px] z-40 max-h-[390px] overflow-y-auto rounded-2xl border shadow-2xl ${darkMode ? "border-white/15 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
                {suggestions.map((item) => (
                  <button key={item.id} onClick={() => launchSearch(item.href)} className={`flex w-full items-center justify-between gap-4 border-b px-4 py-3.5 text-left last:border-b-0 ${darkMode ? "border-white/10 hover:bg-white/5" : "border-black/5 hover:bg-[#fff6dc]"}`}>
                    <span className="min-w-0"><span className="block truncate text-sm font-black">{item.label}</span><span className={`mt-1 block truncate text-[11px] font-semibold ${darkMode ? "text-white/45" : "text-black/45"}`}>{item.meta}</span></span><ArrowIcon />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1 no-scrollbar">
            {quickCategories.map((category) => <button key={category.value} onClick={() => openCategory(category)} className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-black uppercase tracking-wide ${activeCategory === category.value ? "border-[#f6b800] bg-[#f6b800] text-black" : darkMode ? "border-white/15 bg-white/5 text-white/70" : "border-black/10 bg-black/[0.03] text-black/65"}`}>{category.label}</button>)}
          </div>
        </div>
      </section>

      <div ref={fabWrapperRef} className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-2">
        {fabOpen ? <div className={`w-64 overflow-hidden rounded-2xl border shadow-2xl ${darkMode ? "border-white/15 bg-black text-white" : "border-black/10 bg-white text-black"}`}><RequireAuthLink href="/jobs/list" className="block border-b border-black/10 px-4 py-3.5 text-sm font-black">Post a job</RequireAuthLink><RequireAuthLink href="/list-your-truck" className="block border-b border-black/10 px-4 py-3.5 text-sm font-black">List a truck</RequireAuthLink><RequireAuthLink href="/jobs/list?mode=contract" className="block px-4 py-3.5 text-sm font-black">Post a contract</RequireAuthLink></div> : null}
        <button onClick={() => setFabOpen((value) => !value)} aria-label="Open posting menu" className="flex h-14 w-14 items-center justify-center rounded-full border border-black bg-[#f6b800] text-black shadow-2xl"><PlusIcon open={fabOpen} /></button>
      </div>
    </>
  );
}

export function VerifiedBadge() { return <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#c99a17] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#b88900]"><CheckIcon />Verified</span>; }
function SearchIcon(){return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2"/><path d="m16 16 4.2 4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
function ArrowIcon(){return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function CheckIcon(){return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function PlusIcon({open}:{open:boolean}){return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={open?"rotate-45":""}><path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>}
