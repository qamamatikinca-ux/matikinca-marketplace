"use client";

import { useEffect, useMemo, useState } from "react";
import MarketplaceCard, { type MarketplaceCardItem } from "@/components/platform/MarketplaceCard";
import EmptyState from "@/components/platform/EmptyState";
import FilterDrawer from "@/components/platform/FilterDrawer";
import ProfessionalFooter from "@/components/platform/ProfessionalFooter";
import ProfessionalHeader from "@/components/platform/ProfessionalHeader";
import LoadLinkPagination from "@/components/LoadLinkPagination";
import { COMMERCIAL_VEHICLE_TYPES, SOUTH_AFRICAN_PROVINCES, VEHICLE_SORT_OPTIONS } from "@/lib/marketplace/taxonomy";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { authenticatedFetch } from "@/lib/client/authenticatedFetch";
import AccessibleDialog from "@/components/platform/AccessibleDialog";

const PER_PAGE = 7;

type Filters = {
  search: string;
  type: string;
  province: string;
  make: string;
  minYear: string;
  maxYear: string;
  minPrice: string;
  maxPrice: string;
  transmission: string;
  fuel: string;
  sort: string;
};

const emptyFilters: Filters = { search: "", type: "", province: "", make: "", minYear: "", maxYear: "", minPrice: "", maxPrice: "", transmission: "", fuel: "", sort: "newest" };

function numericPrice(item: MarketplaceCardItem & Record<string, unknown>) {
  if (typeof item.price_amount === "number") return item.price_amount;
  const match = String(item.rate || "").replace(/\s/g, "").match(/\d[\d,.]*/);
  return match ? Number(match[0].replace(/,/g, "")) || 0 : 0;
}

export default function VehiclesPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [items, setItems] = useState<(MarketplaceCardItem & Record<string, unknown>)[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [saveSearchOpen, setSaveSearchOpen] = useState(false);
  const [searchName, setSearchName] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters({
      ...emptyFilters,
      search: params.get("search") || "",
      type: params.get("type") || "",
      province: params.get("province") || "",
      make: params.get("make") || "",
      minYear: params.get("minYear") || "",
      maxYear: params.get("maxYear") || "",
      minPrice: params.get("minPrice") || "",
      maxPrice: params.get("maxPrice") || "",
      transmission: params.get("transmission") || "",
      fuel: params.get("fuel") || "",
      sort: params.get("sort") || "newest",
    });
    setPage(Math.max(1, Number(params.get("page") || 1)));
    try { setCompareIds(new Set(JSON.parse(localStorage.getItem("loadlink-vehicle-compare") || "[]"))); } catch { setCompareIds(new Set()); }

    let active = true;
    fetch("/api/job-listings?kind=vehicle&limit=200", { cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Vehicles could not load."); return data; })
      .then((data) => { if (active) setItems(data.rows || []); })
      .catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "Vehicles could not load."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const makes = useMemo(() => Array.from(new Set(items.map((item) => String(item.brand || "").trim()).filter(Boolean))).sort(), [items]);
  const filtered = useMemo(() => {
    const query = filters.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const minYear = Number(filters.minYear || 0);
    const maxYear = Number(filters.maxYear || 9999);
    const minPrice = Number(filters.minPrice || 0);
    const maxPrice = Number(filters.maxPrice || Number.MAX_SAFE_INTEGER);
    const next = items.filter((item) => {
      const text = [item.title, item.city, item.province, item.vehicle_type, item.vehicle_group, item.brand, item.model, item.body_type, item.description].map((value) => String(value || "").toLowerCase()).join(" ");
      const year = Number(item.vehicle_year || 0);
      const price = numericPrice(item);
      return (!query.length || query.every((token) => text.includes(token)))
        && (!filters.type || String(item.vehicle_type || item.body_type || "").toLowerCase().includes(filters.type.toLowerCase()))
        && (!filters.province || String(item.province || item.city || "").toLowerCase().includes(filters.province.toLowerCase()))
        && (!filters.make || String(item.brand || "").toLowerCase() === filters.make.toLowerCase())
        && (!minYear || year >= minYear)
        && (!filters.maxYear || year <= maxYear)
        && (!minPrice || price >= minPrice)
        && (!filters.maxPrice || price <= maxPrice)
        && (!filters.transmission || String(item.transmission || "").toLowerCase().includes(filters.transmission.toLowerCase()))
        && (!filters.fuel || String(item.fuel_type || "").toLowerCase().includes(filters.fuel.toLowerCase()));
    });
    next.sort((a, b) => {
      if (filters.sort === "price-low") return numericPrice(a) - numericPrice(b);
      if (filters.sort === "price-high") return numericPrice(b) - numericPrice(a);
      if (filters.sort === "year-new") return Number(b.vehicle_year || 0) - Number(a.vehicle_year || 0);
      if (filters.sort === "mileage-low") return Number(a.odometer_km || Number.MAX_SAFE_INTEGER) - Number(b.odometer_km || Number.MAX_SAFE_INTEGER);
      return new Date(String(b.created_at || 0)).getTime() - new Date(String(a.created_at || 0)).getTime();
    });
    return next;
  }, [filters, items]);

  const activeCount = Object.entries(filters).filter(([key, value]) => key !== "sort" && Boolean(value)).length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value && !(key === "sort" && value === "newest")) params.set(key, value); });
    if (page > 1) params.set("page", String(page));
    const url = `${window.location.pathname}${params.size ? `?${params.toString()}` : ""}`;
    window.history.replaceState(null, "", url);
  }, [filters, page]);

  function update<K extends keyof Filters>(key: K, value: Filters[K]) { setFilters((current) => ({ ...current, [key]: value })); setPage(1); }
  function clear() { setFilters(emptyFilters); setPage(1); }
  async function saveCurrentSearch() {
    try {
      const response = await authenticatedFetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: searchName.trim() || "Vehicle search", marketplaceArea: "vehicles", filters, alertsEnabled: true }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Search could not be saved.");
      setMessage("Search saved. Matching-vehicle alerts are enabled.");
      setSaveSearchOpen(false);
      setSearchName("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign in to save this search.");
    }
  }

  function toggleCompare(item: MarketplaceCardItem) {
    setCompareIds((current) => {
      const next = new Set(current);
      if (next.has(item.id)) next.delete(item.id);
      else if (next.size < 4) next.add(item.id);
      else setMessage("You can compare up to four vehicles at a time.");
      localStorage.setItem("loadlink-vehicle-compare", JSON.stringify([...next]));
      return next;
    });
  }

  const pageClass = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const fieldClass = `h-12 w-full rounded-xl border px-3 text-sm font-bold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-[#111] text-white" : "border-black/10 bg-white text-black"}`;
  const filterControls = <div className="grid gap-4"><label className="grid gap-2 text-xs font-black uppercase tracking-[.1em]">Vehicle type<select className={fieldClass} value={filters.type} onChange={(event) => update("type", event.target.value)}><option value="">All vehicle types</option>{COMMERCIAL_VEHICLE_TYPES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label><label className="grid gap-2 text-xs font-black uppercase tracking-[.1em]">Province<select className={fieldClass} value={filters.province} onChange={(event) => update("province", event.target.value)}><option value="">All South Africa</option>{SOUTH_AFRICAN_PROVINCES.map((item) => <option key={item}>{item}</option>)}</select></label><label className="grid gap-2 text-xs font-black uppercase tracking-[.1em]">Make<select className={fieldClass} value={filters.make} onChange={(event) => update("make", event.target.value)}><option value="">All makes</option>{makes.map((item) => <option key={item}>{item}</option>)}</select></label><div className="grid grid-cols-2 gap-2"><label className="grid gap-2 text-xs font-black uppercase tracking-[.1em]">From year<input className={fieldClass} inputMode="numeric" value={filters.minYear} onChange={(event) => update("minYear", event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="2015" /></label><label className="grid gap-2 text-xs font-black uppercase tracking-[.1em]">To year<input className={fieldClass} inputMode="numeric" value={filters.maxYear} onChange={(event) => update("maxYear", event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="2026" /></label></div><div className="grid grid-cols-2 gap-2"><label className="grid gap-2 text-xs font-black uppercase tracking-[.1em]">Min price<input className={fieldClass} inputMode="numeric" value={filters.minPrice} onChange={(event) => update("minPrice", event.target.value.replace(/\D/g, ""))} placeholder="R 100 000" /></label><label className="grid gap-2 text-xs font-black uppercase tracking-[.1em]">Max price<input className={fieldClass} inputMode="numeric" value={filters.maxPrice} onChange={(event) => update("maxPrice", event.target.value.replace(/\D/g, ""))} placeholder="R 2 000 000" /></label></div><label className="grid gap-2 text-xs font-black uppercase tracking-[.1em]">Transmission<select className={fieldClass} value={filters.transmission} onChange={(event) => update("transmission", event.target.value)}><option value="">Any transmission</option><option>Manual</option><option>Automatic</option><option>Automated manual</option></select></label><label className="grid gap-2 text-xs font-black uppercase tracking-[.1em]">Fuel<select className={fieldClass} value={filters.fuel} onChange={(event) => update("fuel", event.target.value)}><option value="">Any fuel</option><option>Diesel</option><option>Petrol</option><option>Electric</option><option>Hybrid</option></select></label></div>;

  return <main className={`min-h-screen ${pageClass}`}><ProfessionalHeader darkMode={darkMode} onToggleTheme={toggleTheme} /><section className="border-b border-current/10 px-5 py-10 md:px-12"><div className="mx-auto max-w-7xl"><p className="text-xs font-black uppercase tracking-[.2em] text-[#b88900]">Professional commercial marketplace</p><h1 className="mt-3 text-4xl font-black tracking-[-.04em] md:text-6xl">Find the right commercial vehicle</h1><p className={`mt-4 max-w-3xl text-sm leading-7 ${darkMode ? "text-white/55" : "text-black/55"}`}>Search approved trucks, trailers and mobile units using logistics-specific filters. Every result opens a shareable detail page.</p><div className="mt-7 flex gap-2"><label className="sr-only" htmlFor="vehicle-search">Search vehicles</label><input id="vehicle-search" className={`${fieldClass} flex-1`} value={filters.search} onChange={(event) => update("search", event.target.value)} placeholder="Try side tipper Gauteng, refrigerated truck or Scania" /><button onClick={() => setDrawerOpen(true)} className="h-12 shrink-0 rounded-xl border border-current/15 px-4 text-xs font-black uppercase lg:hidden">Filters {activeCount ? `(${activeCount})` : ""}</button></div></div></section><section className="px-5 py-8 md:px-12"><div className="mx-auto grid max-w-7xl gap-7 lg:grid-cols-[280px_1fr]"><aside className={`hidden self-start rounded-[22px] border p-5 lg:block ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-black">Filters</h2><button onClick={clear} className="text-xs font-black uppercase text-[#b88900]">Clear</button></div>{filterControls}</aside><div><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-black">{filtered.length} vehicle{filtered.length === 1 ? "" : "s"}</p><p className={`mt-1 text-xs ${darkMode ? "text-white/45" : "text-black/45"}`}>{activeCount ? `${activeCount} active filter${activeCount === 1 ? "" : "s"}` : "All active approved stock"}</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => { setSearchName(filters.search ? `${filters.search} vehicles` : "My vehicle search"); setSaveSearchOpen(true); }} className="hidden h-12 rounded-xl border border-current/15 px-4 text-xs font-black uppercase sm:inline-flex sm:items-center">Save search</button><select aria-label="Sort vehicles" className={`${fieldClass} w-auto min-w-[180px]`} value={filters.sort} onChange={(event) => update("sort", event.target.value)}>{VEHICLE_SORT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>{compareIds.size ? <a href="/compare" className="flex h-12 items-center rounded-xl bg-[#f6b800] px-4 text-xs font-black uppercase text-black">Compare {compareIds.size}</a> : null}</div></div>{message ? <p className="mt-4 rounded-xl border border-[#f6b800]/40 bg-[#f6b800]/10 p-3 text-sm font-bold">{message}</p> : null}{loading ? <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 7 }).map((_, index) => <div key={index} className={`aspect-[3/4] animate-pulse rounded-[22px] ${darkMode ? "bg-white/5" : "bg-black/5"}`} />)}</div> : visible.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map((item) => <MarketplaceCard key={item.id} item={item} darkMode={darkMode} compare={compareIds.has(item.id)} onCompare={toggleCompare} />)}</div> : <div className="mt-6"><EmptyState darkMode={darkMode} title="No exact vehicles match" body="Remove one filter, expand the price or year range, or search a wider location. LoadLink will never fill empty results with unrelated stock." actionLabel="Clear all filters" actionHref="/vehicles" /></div>}<LoadLinkPagination current={page} total={totalPages} onChange={(next) => { setPage(next); window.scrollTo({ top: 0, behavior: "smooth" }); }} darkMode={darkMode} label="Vehicle result pages" /></div></div></section><FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Vehicle filters" activeCount={activeCount} resultCount={filtered.length} darkMode={darkMode} onApply={() => setDrawerOpen(false)} onClear={clear}>{filterControls}</FilterDrawer><AccessibleDialog open={saveSearchOpen} onClose={() => setSaveSearchOpen(false)} title="Save this vehicle search" description="LoadLink stores the active filters in your account so you can return later and receive matching-stock alerts." darkMode={darkMode}><label className="grid gap-2 text-xs font-black uppercase tracking-wide">Search name<input value={searchName} onChange={(event) => setSearchName(event.target.value)} className="h-12 rounded-xl border border-current/15 bg-transparent px-4 text-base outline-none focus:border-[#f6b800]" maxLength={80} /></label><button type="button" onClick={() => void saveCurrentSearch()} className="mt-4 h-12 w-full rounded-xl bg-[#f6b800] font-black text-black">Save search and alerts</button></AccessibleDialog><ProfessionalFooter darkMode={darkMode} /></main>;
}
