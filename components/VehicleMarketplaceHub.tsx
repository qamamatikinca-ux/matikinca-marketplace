"use client";

import LoadLinkSortControl from "@/components/LoadLinkSortControl";


import LoadLinkImage from "@/components/LoadLinkImage";

import LoadLinkIcon from "@/components/LoadLinkIcon";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LoadLinkPagination from "@/components/LoadLinkPagination";
import DealershipListingActions20260822 from "@/components/DealershipListingActions20260822";
import { formatListingRate } from "@/lib/formatCurrency";
import { normaliseSearch } from "@/lib/smartSearch";
import { truckCatalog } from "@/lib/truckCatalog";
import { lightCommercialCatalog } from "@/lib/southAfricanLightCommercialCatalog";
import VehicleMakeModelPicker, { type MarketBrand } from "@/components/VehicleMakeModelPicker";

type VehicleRow = {
  id: string;
  title?: string | null;
  city?: string | null;
  vehicle_group?: string | null;
  rate?: string | null;
  description?: string | null;
  photos?: string[] | null;
  listing_kind?: string | null;
  sponsored?: boolean | null;
  boost_expires_at?: string | null;
  display_tier?: number | null;
  created_at?: string | null;
  posted_by?: string | null;
  poster_photo?: string | null;
  dealership_id?: string | null;
  dealership_name?: string | null;
  dealership_slug?: string | null;
  dealership_logo?: string | null;
};

type ViewMode = "all" | "vehicles" | "trucks" | "trailers_units";
type EquipmentKind = "vehicle" | "truck" | "trailer" | "mobile_unit" | "equipment";
type Intent = "all" | "sale" | "rental";
type SortMode = "newest" | "price_low" | "price_high";

const SEEN_KEY = "loadlink-seen-listings-v2";
const RECENT_KEY = "loadlink-recent-viewed-jobs";
const LISTINGS_PER_PAGE = 7;

function readMeta(description: string | null | undefined, label: string) {
  return String(description || "").match(new RegExp(`^${label}:\\s*([^\\n]+)`, "im"))?.[1]?.trim() || "";
}

function isVehicleListing(row: VehicleRow) {
  const kind = String(row.listing_kind || "").toLowerCase();
  if (["vehicle", "asset", "truck_sale", "vehicle_listing"].includes(kind)) return true;
  return /^Listing type:\s*(Truck|Bakkie|Van|Trailer|Mobile Unit)/im.test(String(row.description || ""));
}

function isMobileUnit(row: VehicleRow) {
  const type = readMeta(row.description, "Listing type").toLowerCase();
  return type.includes("mobile unit") || String(row.vehicle_group || "").toLowerCase().includes("mobile unit");
}

// Respect the listing's explicit category, including legacy records such as
// "Listing type: Mobile fridge". Never default unrecognised stock to Trucks.
function equipmentKind(row: VehicleRow): EquipmentKind {
  const type = readMeta(row.description, "Listing type").toLowerCase();
  const subtype = readMeta(row.description, "Vehicle subtype").toLowerCase();
  const group = String(row.vehicle_group || "").toLowerCase();
  const title = String(row.title || "").toLowerCase();
  const mobilePattern = /mobile[\s_-]*(?:unit|fridge|freezer|kitchen|toilet|clinic|office|workshop|classroom|accommodation|shower)|food[\s-]*truck|cold[\s-]*room|portable[\s-]*(?:unit|fridge|freezer|office)/i;
  const trailerPattern = /trailer|tautliner|lowbed|low-bed|flatbed|flat-bed|car carrier|semi[\s-]*trailer/i;
  const truckPattern = /truck|tractor[\s-]*unit|prime[\s-]*mover|side[\s-]*tipper|tipper[\s-]*truck|rigid[\s-]*truck/i;

  // Form-generated descriptions have the strongest evidence.
  if (mobilePattern.test(type) || type === "mobile unit") return "mobile_unit";
  if (trailerPattern.test(type)) return "trailer";
  if (truckPattern.test(type)) return "truck";
  if (/equipment|generator|compressor|excavator|forklift|earthmoving/.test(type)) return "equipment";
  if (/car|bakkie|van|suv|sedan|pickup|motorbike|motorcycle|bus|vehicle/i.test(type)) return "vehicle";

  // Handle older listings where listing type is a specific product, not a category.
  if (mobilePattern.test(subtype) || mobilePattern.test(title) || mobilePattern.test(group)) return "mobile_unit";
  if (trailerPattern.test(subtype) || trailerPattern.test(title) || group.includes("trailers") && !group.includes("trucks")) return "trailer";
  if (truckPattern.test(subtype) || truckPattern.test(title) || group === "trucks") return "truck";
  if (/equipment|generator|compressor|excavator|forklift|earthmoving/.test(`${subtype} ${title} ${group}`)) return "equipment";
  return "vehicle";
}

function equipmentMatches(kind: EquipmentKind, view: ViewMode) {
  return view === "all" ||
    (view === "vehicles" && kind === "vehicle") ||
    (view === "trucks" && kind === "truck") ||
    (view === "trailers_units" && (kind === "trailer" || kind === "mobile_unit" || kind === "equipment"));
}

const MOBILE_EQUIPMENT_TYPES = [
  { value: "all", label: "All trailers, mobile units & equipment", pattern: null },
  { value: "trailers", label: "All trailers", pattern: /trailer|tautliner|lowbed|flatbed|tipper|car carrier|superlink/i },
  { value: "lowbed", label: "Lowbed trailers", pattern: /lowbed|low-bed/i },
  { value: "flatbed", label: "Flatbed trailers", pattern: /flatbed|flat-bed/i },
  { value: "tautliner", label: "Tautliner trailers", pattern: /tautliner|curtainsider/i },
  { value: "refrigerated", label: "Refrigerated trailers", pattern: /reefer|refrigerated trailer/i },
  { value: "mobile_kitchen", label: "Mobile kitchens", pattern: /mobile kitchen|food truck|food trailer|catering unit/i },
  { value: "mobile_fridge", label: "Mobile fridges & freezers", pattern: /mobile fridge|mobile freezer|cold room|refrigerated mobile unit/i },
  { value: "mobile_toilet", label: "Mobile toilets", pattern: /mobile toilet|ablution|portable toilet/i },
  { value: "mobile_office", label: "Mobile offices", pattern: /mobile office|site office|portable office/i },
  { value: "mobile_clinic", label: "Mobile clinics", pattern: /mobile clinic|medical unit/i },
  { value: "mobile_unit", label: "Other mobile units", pattern: /mobile unit|mobile classroom|mobile workshop|mobile accommodation|mobile shower/i },
  { value: "equipment", label: "Equipment", pattern: /equipment|generator|compressor|excavator|forklift|earthmoving/i },
] as const;

function matchedSubtype(row: VehicleRow, value: string) {
  if (value === "all") return true;
  const kind = equipmentKind(row);
  if (value === "trailers") return kind === "trailer";
  if (value === "equipment") return kind === "equipment";
  const selected = MOBILE_EQUIPMENT_TYPES.find(item => item.value === value);
  return !selected?.pattern || selected.pattern.test([
    row.title, row.vehicle_group, readMeta(row.description, "Listing type"),
    readMeta(row.description, "Vehicle subtype"), readMeta(row.description, "Unit type"),
  ].join(" "));
}

function catalogueMake(name: string) {
  return name.replace(/\s+(?:Trucks|Truck & Bus|Motors)$/i, "").trim();
}
function rowHasMake(row: VehicleRow, make: string) {
  const wanted = normaliseSearch(make);
  const explicit = normaliseSearch(readMeta(row.description, "Make") || readMeta(row.description, "Brand"));
  if (explicit) return explicit === wanted || explicit.startsWith(wanted + " ") || wanted.startsWith(explicit + " ");
  return (" " + normaliseSearch(row.title || "") + " ").includes(" " + wanted + " ");
}
function rowHasModel(row: VehicleRow, model: string) {
  const wanted = normaliseSearch(model);
  const explicit = normaliseSearch(readMeta(row.description, "Model") || readMeta(row.description, "Variant"));
  if (explicit) return explicit === wanted || explicit.startsWith(wanted + " ") || wanted.startsWith(explicit + " ");
  return (" " + normaliseSearch(row.title || "") + " ").includes(" " + wanted + " ");
}

function intentMatch(row: VehicleRow, intent: Intent) {
  if (intent === "all") return true;
  const offer = readMeta(row.description, "Offer").toLowerCase();
  const title = String(row.title || "").toLowerCase();
  const rate = String(row.rate || "").toLowerCase();
  const forSale = Boolean(readMeta(row.description, "Sale price")) ||
    /sale|purchase|buy/.test(offer) ||
    /for sale|available to buy/.test(title);
  const forRent = Boolean(readMeta(row.description, "Rental rate")) ||
    /rent|hire|lease/.test(offer) ||
    /for (?:hire|rent)|to rent/.test(title) ||
    /(?:\b(?:a|per)\s*(?:day|week|month)\b|\/(?:day|week|month)\b)/.test(rate);
  return intent === "sale" ? forSale : forRent;
}

function numericPrice(row: VehicleRow, intent: Intent) {
  const explicit = intent === "rental" ? readMeta(row.description, "Rental rate")
    : intent === "sale" ? readMeta(row.description, "Sale price")
    : readMeta(row.description, "Sale price") || readMeta(row.description, "Rental rate");
  const raw = explicit || (intent === "all" ? String(row.rate || "") : "");
  const match = raw.replace(/[\s,]/g, "").match(/(?:R|ZAR)?(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function truckMileage(row: VehicleRow) {
  const raw = readMeta(row.description, "Mileage");
  const match = raw.match(/^([\d\s,.]+)\s*(?:km|kilometres?)?$/i);
  if (!match) return null;
  const number = Number(match[1].replace(/[^0-9]/g, ""));
  return Number.isFinite(number) && number >= 0 ? number.toLocaleString("en-ZA") + " km" : null;
}

function isActiveVehiclePromotion(row: VehicleRow) {
  return Boolean(row.sponsored) && Boolean(row.boost_expires_at) &&
    new Date(String(row.boost_expires_at)).getTime() > Date.now();
}

function cardSpecifications(row: VehicleRow, kind: EquipmentKind) {
  const fields = kind === "truck"
    ? ["Year", "Make", "Model", "Mileage"]
    : kind === "trailer"
    ? ["Year", "Vehicle subtype", "Axle configuration", "Condition"]
    : kind === "mobile_unit"
    ? ["Vehicle subtype", "Condition", "Temperature range", "Power supply"]
    : ["Year", "Make", "Model", "Mileage", "Condition"];
  return fields.map((field) => {
    const value = readMeta(row.description, field);
    return value ? { label: field === "Vehicle subtype" ? "Type" : field, value } : null;
  }).filter((item): item is { label: string; value: string } => Boolean(item)).slice(0, 4);
}

function readSeenIds() {
  const ids = new Set<string>();
  try {
    const saved = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
    if (Array.isArray(saved)) saved.forEach((id) => id && ids.add(String(id)));
  } catch {}
  try {
    const recent = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    if (Array.isArray(recent)) recent.forEach((item) => item?.id && ids.add(String(item.id)));
  } catch {}
  return ids;
}

function postedLabel(value: string | null | undefined) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Recently listed";
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short" }).format(date);
}

export default function VehicleMarketplaceHub({ darkMode }: { darkMode: boolean }) {
  const [rows, setRows] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ViewMode>("all");
  const [sort, setSort] = useState<SortMode>("newest");
  const [intent,setIntent]=useState<Intent>("all");
  const [makeQuery, setMakeQuery] = useState("");
  const [modelQuery, setModelQuery] = useState("");
  const [unitType, setUnitType] = useState("all");
  const [makePickerOpen, setMakePickerOpen] = useState(false);
  const [pickerPanel, setPickerPanel] = useState<"makes" | "models">("makes");
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const refreshSeen = () => setSeen(readSeenIds());
    refreshSeen();
    window.addEventListener("loadlink-seen-listings-updated", refreshSeen);
    window.addEventListener("loadlink-recent-activity-updated", refreshSeen);
    return () => {
      window.removeEventListener("loadlink-seen-listings-updated", refreshSeen);
      window.removeEventListener("loadlink-recent-activity-updated", refreshSeen);
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`/api/job-listings?t=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (active) setRows(((payload.rows || []) as VehicleRow[]).filter(isVehicleListing));
      })
      .catch(() => active && setRows([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    function syncHash() {
      if (window.location.hash === "#vehicle-marketplace-units") setMode("trailers_units");
      if (window.location.hash === "#vehicle-marketplace-vehicles") setMode("vehicles");
    }
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const onModeChange = (next: ViewMode) => {
    if (next === mode) return;
    setMode(next);
    setMakeQuery("");
    setModelQuery("");
    setUnitType("all");
    setMakePickerOpen(false);
  };
  const makeModelVisible = mode === "trucks" || mode === "vehicles";
  const brandOptions = useMemo<MarketBrand[]>(() => {
    if (mode !== "trucks" && mode !== "vehicles") return [];
    const stock = rows.filter(row => equipmentMatches(equipmentKind(row), mode));
    const catalogue = mode === "trucks" ? truckCatalog : lightCommercialCatalog;
    const brands = new Map<string, Set<string>>();
    for (const brand of catalogue) {
      const name = catalogueMake(brand.name);
      brands.set(name, new Set(brand.models.map(model => model.name)));
    }
    for (const row of stock) {
      const make = readMeta(row.description, "Make") || readMeta(row.description, "Brand");
      if (!make) continue;
      if (!brands.has(make)) brands.set(make, new Set());
      const model = readMeta(row.description, "Model");
      if (model) brands.get(make)?.add(model);
    }
    return [...brands.entries()].map(([name, modelNames]) => {
      const matches = stock.filter(row => rowHasMake(row, name));
      return {
        name, count: matches.length,
        models: [...modelNames].sort((a,b) => a.localeCompare(b)).map(model => ({
          name: model, count: matches.filter(row => rowHasModel(row, model)).length,
        })),
      };
    }).sort((a,b) => a.name.localeCompare(b.name));
  }, [mode, rows]);

  const visible=useMemo(()=>{
    const filtered=rows.filter(row => {
      if (!equipmentMatches(equipmentKind(row), mode) || !intentMatch(row, intent)) return false;
      if (mode === "trailers_units") return matchedSubtype(row, unitType);
      if (mode === "trucks" || mode === "vehicles") {
        return (!makeQuery || rowHasMake(row, makeQuery)) && (!modelQuery || rowHasModel(row, modelQuery));
      }
      return true;
    });
    return [...filtered].sort((first,second)=>{
      if(sort!=="newest"){
        const a=numericPrice(first,intent),b=numericPrice(second,intent);
        if(!Number.isFinite(a))return Number.isFinite(b)?1:0;
        if(!Number.isFinite(b))return -1;
        return sort==="price_low"?a-b:b-a;
      }
      return new Date(second.created_at||0).getTime()-new Date(first.created_at||0).getTime();
    });
  },[mode,rows,sort,intent,makeQuery,modelQuery,unitType]);

  const promoted = useMemo(() =>
    rows.filter(isActiveVehiclePromotion).sort((a,b) => Number(b.display_tier || 1) - Number(a.display_tier || 1) ||
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 6), [rows]);
  const totalPages = Math.max(1, Math.ceil(visible.length / LISTINGS_PER_PAGE));
  const paginatedVisible = useMemo(() => {
    const start = (currentPage - 1) * LISTINGS_PER_PAGE;
    return visible.slice(start, start + LISTINGS_PER_PAGE);
  }, [currentPage, visible]);

  useEffect(() => { setCurrentPage(1); }, [mode, sort, intent, makeQuery, modelQuery, unitType]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  function changePage(nextPage: number) {
    setCurrentPage(Math.min(totalPages, Math.max(1, nextPage)));
    requestAnimationFrame(() => document.getElementById("vehicle-marketplace")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function markSeen(id: string) {
    setSeen((current) => {
      const next = new Set(current);
      next.add(id);
      try { localStorage.setItem(SEEN_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
    window.dispatchEvent(new Event("loadlink-seen-listings-updated"));
  }

  const surface = darkMode ? "border-white/10 bg-[#0b0b0b] text-white" : "border-black/10 bg-white text-black";
  const muted = darkMode ? "text-white/52" : "text-black/52";
  const softPill = darkMode ? "bg-white/10 text-white" : "bg-[#eef2f8] text-[#263246]";

  return (
    <section id="vehicle-marketplace" className={`scroll-mt-24 border-t px-4 py-10 md:px-6 md:py-14 ${darkMode ? "border-white/10 bg-[#050505]" : "border-black/10 bg-[#f8f8f7]"}`}>
      <span id="vehicle-marketplace-vehicles" className="block scroll-mt-24" aria-hidden="true" />
      <span id="vehicle-marketplace-units" className="block scroll-mt-24" aria-hidden="true" />
      <div className="mx-auto max-w-5xl">
        {!loading && promoted.length > 0 ? (
          <section aria-labelledby="promoted-vehicle-heading" className={`mb-10 rounded-[24px] border p-4 sm:p-6 ${darkMode ? "border-white/12 bg-[#111111]" : "border-black/10 bg-white"}`}>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="promoted-vehicle-heading" className="mt-1 text-2xl font-black tracking-[-.04em] sm:text-3xl">Promoted listings</h2>
                <p className={`mt-1 text-xs font-semibold ${muted}`}>Paid placements, clearly marked and prioritised on LoadLink.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {promoted.map((row) => (
                <Link key={row.id} href={`/vehicles/${row.id}`} onClick={() => markSeen(String(row.id))}
                  className={`group overflow-hidden rounded-2xl border ${darkMode ? "border-white/12 bg-[#101010]" : "border-black/10 bg-white"}`}>
                  <div className="relative aspect-[16/9] overflow-hidden bg-black">
                    <LoadLinkImage src={row.photos?.[0] || "/images/truck-1.jpg"} alt={row.title || "Commercial vehicle"}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]" />
                    <span className="absolute left-3 top-3 rounded-full bg-[#f6b800] px-3 py-1 text-[10px] font-black uppercase text-black">Promoted</span>
                  </div>
                  <div className="p-4">
                    <p className={`text-xs font-semibold ${muted}`}>{equipmentKind(row).replace("_", " ")} · {row.city || "South Africa"}</p>
                    <h3 className="mt-1 line-clamp-2 text-base font-black">{row.title || "Commercial vehicle"}</h3>
                    <p className={`mt-2 text-xl font-black ${darkMode ? "text-white" : "text-black"}`}>{formatListingRate(row.rate)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-4xl font-black tracking-[-.05em] md:text-5xl">{darkMode ? "Vehicles" : "Bakkies"}, trucks and mobile units available</h2>
            <p className={`mt-3 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>Approved commercial stock, presented with the same clear marketplace pattern as LoadLink jobs.</p>
          </div>
          <LoadLinkSortControl darkMode={darkMode} value={sort} onChange={value=>setSort(value as SortMode)}
 options={[{value:"newest",label:"Newest first"},{value:"price_low",label:"Price: low to high"},{value:"price_high",label:"Price: high to low"}]}
 equipment={{value:mode,onChange:value=>onModeChange(value as ViewMode),options:[{value:"all",label:"All equipment"},{value:"trucks",label:"Trucks"},{value:"vehicles",label:darkMode ? "Vehicles" : "Bakkies"},{value:"trailers_units",label:"Trailers, mobile units & equipment"}]}}
 filter={{value:intent,onChange:value=>setIntent(value as Intent),resultCount:visible.length,options:[{value:"all",label:"All listings"},{value:"sale",label:"For sale",description:"Available to buy"},{value:"rental",label:"For rent",description:"Available to hire or rent"}]}}
 />
        </div>

        {makeModelVisible ? (
          <section data-loadlink-vehicle-make-search="category-only"
            className={"loadlink-glass mt-6 rounded-[24px] border p-4 shadow-[0_20px_60px_rgba(0,0,0,.12)] backdrop-blur-xl md:p-5 " +
              (darkMode ? "border-white/20 bg-black/72 text-white" : "border-white/55 bg-[#b7b4ab]/85 text-black")}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block min-w-0">
                <span className={"mb-2 block text-[10px] font-black uppercase tracking-[.15em] " +
                  (darkMode ? "text-white/70" : "text-[#70716f]")}>Make / manufacturer</span>
                <button type="button" onClick={() => { setPickerPanel("makes"); setMakePickerOpen(true); }}
                  className="flex h-12 w-full items-center justify-between gap-3 rounded-xl border border-[#dedede] bg-white px-4 text-left text-base font-semibold text-[#171717]">
                  <span className={makeQuery ? "truncate" : "truncate text-[#929292]"}>{makeQuery || "Select a make"}</span>
                  <span aria-hidden="true">›</span>
                </button>
              </label>
              <label className="block min-w-0">
                <span className={"mb-2 block text-[10px] font-black uppercase tracking-[.15em] " +
                  (darkMode ? "text-white/70" : "text-[#70716f]")}>Model or variant</span>
                <button type="button" onClick={() => { setPickerPanel("models"); setMakePickerOpen(true); }}
                  className="flex h-12 w-full items-center justify-between gap-3 rounded-xl border border-[#dedede] bg-white px-4 text-left text-base font-semibold text-[#171717]">
                  <span className={modelQuery ? "truncate" : "truncate text-[#929292]"}>{modelQuery || "Select a model"}</span>
                  <span aria-hidden="true">›</span>
                </button>
              </label>
            </div>
            <button type="button"
              onClick={() => document.getElementById("loadlink-vehicle-results")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="mt-4 min-h-12 w-full rounded-xl border border-[#f6b800] bg-[#f6b800] px-7 text-sm font-black uppercase tracking-wide text-black transition active:scale-[.99]">
              Search {mode === "vehicles" && !darkMode ? "Bakkies" : mode}
            </button>
            {makeQuery || modelQuery ? <button type="button" onClick={() => { setMakeQuery(""); setModelQuery(""); }}
              className={"mt-2 min-h-9 w-full text-xs font-semibold " + (darkMode ? "text-white/70" : "text-black/60")}>Clear make and model</button> : null}
          </section>
        ) : null}

        <div className="mt-6 flex max-w-full gap-2 overflow-x-auto pb-1">
          {([["all", "All equipment"], ["trucks", "Trucks"], ["vehicles", darkMode ? "Vehicles" : "Bakkies"], ["trailers_units", "Trailers, mobile units & equipment"]] as Array<[ViewMode, string]>).map(([value, label]) => (
            <button key={value} type="button" onClick={() => onModeChange(value)} className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-black transition ${mode === value ? "border-[#f6b800] bg-[#f6b800] text-black" : surface}`}>{label}</button>
          ))}
        </div>

        {mode === "trailers_units" ? (
          <label className={"mt-5 flex min-h-12 max-w-xl flex-wrap items-center gap-3 rounded-xl border px-4 " +
            (darkMode ? "border-white/15 bg-[#141414] text-white" : "border-black/10 bg-white text-black")}>
            <span className={"shrink-0 text-xs font-bold " + muted}>Type</span>
            <select value={unitType} onChange={event => setUnitType(event.target.value)}
              aria-label="Choose trailer, mobile unit or equipment type"
              className="min-h-11 min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none">
              {MOBILE_EQUIPMENT_TYPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
        ) : null}
        {makePickerOpen && makeModelVisible ? (
          <VehicleMakeModelPicker darkMode={darkMode} title={mode === "trucks" ? "Trucks" : (darkMode ? "Vehicles" : "Bakkies")}
            brands={brandOptions} currentMake={makeQuery} currentModel={modelQuery} initialPanel={pickerPanel}
            onChoose={(make, model) => { setMakeQuery(make); setModelQuery(model); setMakePickerOpen(false); }}
            onClose={() => setMakePickerOpen(false)} />
        ) : null}

        <div id="loadlink-vehicle-results" className="scroll-mt-28" />
        {!loading && visible.length ? <div className={`mt-5 text-xs font-bold ${muted}`}>{visible.length} approved listing{visible.length === 1 ? "" : "s"}</div> : null}

        {loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3].map((item) => <div key={item} className={`h-72 animate-pulse rounded-[24px] border ${surface}`} />)}</div>
        ) : visible.length ? (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {paginatedVisible.map((row) => {
                const type = readMeta(row.description, "Vehicle subtype") || readMeta(row.description, "Listing type") || row.vehicle_group || "Commercial vehicle";
                const offer = readMeta(row.description, "Offer") || "Available";
                const kind = equipmentKind(row);

                const kindLabel = kind === "mobile_unit" ? "Mobile unit" : kind === "trailer" ? "Trailer" : kind === "truck" ? "Truck" : "Vehicle";
                const wasSeen = seen.has(String(row.id));
                const href = `/vehicles/${row.id}`;
                return (
                  <article
                    key={row.id}
                    data-listing-card="true"
                    data-loadlink-vehicle-card="true"
                    data-listing-id={row.id}
                    className={`min-w-0 overflow-hidden rounded-[22px] border shadow-[0_10px_32px_rgba(0,0,0,.07)] ${surface}`}
                  >
                    <Link href={href} onClick={() => markSeen(String(row.id))} className="group relative block w-full overflow-hidden bg-black text-left">
                      <div className="aspect-[16/11] w-full overflow-hidden sm:aspect-[16/10]">
                        {row.photos?.[0]
                          ? <LoadLinkImage src={row.photos[0]} alt={row.title || "Seller vehicle photograph"} className="h-full w-full object-cover transition duration-500 md:group-hover:scale-[1.02]" />
                          : <div className="flex h-full w-full items-center justify-center bg-[#252725] px-4 text-center text-sm font-semibold text-white/80">Seller photo not provided</div>}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/45" />
                      <span className="absolute left-3 top-3 rounded-full bg-[#f6b800] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.08em] text-black">{offer}</span>
                      {row.photos?.length ? <span className="absolute bottom-3 left-3 rounded-full bg-black/75 px-3 py-1.5 text-[10px] font-semibold text-white">{row.photos.length} photo{row.photos.length === 1 ? "" : "s"}</span> : null}
                      {isActiveVehiclePromotion(row) ? <span className="absolute right-3 top-3 rounded-full bg-[#f6b800] px-3 py-1.5 text-[10px] font-black uppercase text-black">Promoted</span> : null}
                      {wasSeen ? <span className="absolute bottom-3 right-3 rounded-full bg-black/75 px-3 py-1.5 text-[10px] font-black text-white backdrop-blur">Seen</span> : null}
                    </Link>

                    <div className="p-4 sm:p-5">
                      <p className={`text-2xl font-black tracking-[-.04em] ${darkMode ? "text-white" : "text-black"}`}>{formatListingRate(row.rate)}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#2f9f5b] px-3 py-1.5 text-[10px] font-black uppercase text-white">{kindLabel}</span>
                        <span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase ${softPill}`}>{type}</span>
                      </div>
                      <Link href={href} onClick={() => markSeen(String(row.id))} className="mt-3 block text-xl font-black leading-snug tracking-[-.035em] hover:underline hover:underline-offset-4">{row.title || "Commercial vehicle"}</Link>
                      <p className={`mt-2 text-sm font-semibold ${muted}`}>{row.city || "South Africa"} · {postedLabel(row.created_at)}</p>
                      {cardSpecifications(row, kind).length ? (
                        <dl className={`mt-4 grid grid-cols-2 gap-x-3 gap-y-3 rounded-xl border p-3 ${darkMode ? "border-white/10 bg-white/[.035]" : "border-black/10 bg-black/[.025]"}`}>
                          {cardSpecifications(row, kind).map((spec) => (
                            <div key={spec.label} className="min-w-0">
                              <dt className={`text-[10px] font-bold uppercase tracking-[.08em] ${muted}`}>{spec.label}</dt>
                              <dd className="mt-1 truncate text-xs font-black" title={spec.value}>{spec.value}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                      {row.posted_by ? <p className={`mt-2 text-sm ${muted}`}>Listed by <strong className={darkMode ? "text-white" : "text-black"}>{row.dealership_name || row.posted_by}</strong></p> : null}

                      <DealershipListingActions20260822
                        dealershipId={row.dealership_id}
                        dealershipSlug={row.dealership_slug}
                        dealershipName={row.dealership_name}
                        darkMode={darkMode}
                      />

                      <Link href={href} onClick={() => markSeen(String(row.id))} className={`mt-5 flex min-h-12 w-full items-center justify-between border-t pt-4 text-sm font-black ${darkMode ? "border-white/10" : "border-black/10"}`}>
                        <span>View full details</span><span aria-hidden="true"><LoadLinkIcon name="chevronRight" size={18} className="inline-block shrink-0 align-middle" /></span>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
            {visible.length > LISTINGS_PER_PAGE ? <LoadLinkPagination current={currentPage} total={totalPages} onChange={changePage} darkMode={darkMode} label="Vehicle listing pages" /> : null}
          </>
        ) : (
          <div className={`loadlink-glass mt-6 rounded-[24px] border p-8 text-center ${surface}`}>
            <h3 className="text-xl font-black">No approved listings in this category yet</h3>
            <p className={`mx-auto mt-2 max-w-md text-sm font-semibold leading-6 ${muted}`}>Try All equipment and All listings, or change your filters.</p>
            {(mode !== "all" || intent !== "all" || makeQuery || modelQuery || unitType !== "all") ? <button type="button" onClick={() => {onModeChange("all");setIntent("all");setUnitType("all");}} className="mt-4 min-h-10 rounded-full bg-[#f6b800] px-5 text-xs font-black text-black">Clear filters</button> : null}
          </div>
        )}
      </div>
    </section>
  );
}
