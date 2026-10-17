"use client";

import LoadLinkSortControl from "@/components/LoadLinkSortControl";


import LoadLinkImage from "@/components/LoadLinkImage";

import LoadLinkIcon from "@/components/LoadLinkIcon";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LoadLinkPagination from "@/components/LoadLinkPagination";
import DealershipListingActions20260822 from "@/components/DealershipListingActions20260822";
import { formatListingRate } from "@/lib/formatCurrency";

type VehicleRow = {
  id: string;
  title?: string | null;
  city?: string | null;
  vehicle_group?: string | null;
  rate?: string | null;
  description?: string | null;
  photos?: string[] | null;
  listing_kind?: string | null;
  created_at?: string | null;
  posted_by?: string | null;
  poster_photo?: string | null;
  dealership_id?: string | null;
  dealership_name?: string | null;
  dealership_slug?: string | null;
  dealership_logo?: string | null;
};

type ViewMode = "all" | "vehicles" | "trucks" | "trailers_units";
type EquipmentKind = "vehicle" | "truck" | "trailer" | "mobile_unit";
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
  return /^Listing type:\s*(Truck|Trailer|Mobile Unit)/im.test(String(row.description || ""));
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
  const mobilePattern = /mobile[\\s_-]*(?:unit|fridge|freezer|kitchen|toilet|clinic|office|workshop|classroom|accommodation|shower)|food[\\s-]*truck|cold[\\s-]*room|portable[\\s-]*(?:unit|fridge|freezer|office)/i;
  const trailerPattern = /trailer|tautliner|lowbed|low-bed|flatbed|flat-bed|car carrier|semi[\\s-]*trailer/i;
  const truckPattern = /truck|tractor[\\s-]*unit|prime[\\s-]*mover|side[\\s-]*tipper|tipper[\\s-]*truck|rigid[\\s-]*truck/i;

  // Form-generated descriptions have the strongest evidence.
  if (mobilePattern.test(type) || type === "mobile unit") return "mobile_unit";
  if (trailerPattern.test(type)) return "trailer";
  if (truckPattern.test(type)) return "truck";
  if (/car|bakkie|van|suv|sedan|pickup|motorbike|motorcycle|bus|vehicle/i.test(type)) return "vehicle";

  // Handle older listings where listing type is a specific product, not a category.
  if (mobilePattern.test(subtype) || mobilePattern.test(title) || mobilePattern.test(group)) return "mobile_unit";
  if (trailerPattern.test(subtype) || trailerPattern.test(title) || group.includes("trailers") && !group.includes("trucks")) return "trailer";
  if (truckPattern.test(subtype) || truckPattern.test(title) || group === "trucks") return "truck";
  return "vehicle";
}

function equipmentMatches(kind: EquipmentKind, view: ViewMode) {
  return view === "all" ||
    (view === "vehicles" && kind === "vehicle") ||
    (view === "trucks" && kind === "truck") ||
    (view === "trailers_units" && (kind === "trailer" || kind === "mobile_unit"));
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
    /\\b(?:a|per)\\s*(?:day|week|month)\\b|\\/(?:day|week|month)\\b/.test(rate);
  return intent === "sale" ? forSale : forRent;
}

function numericPrice(row: VehicleRow, intent: Intent) {
  const explicit = intent === "rental" ? readMeta(row.description, "Rental rate")
    : intent === "sale" ? readMeta(row.description, "Sale price")
    : readMeta(row.description, "Sale price") || readMeta(row.description, "Rental rate");
  const raw = explicit || (intent === "all" ? String(row.rate || "") : "");
  const match = raw.replace(/[\\s,]/g, "").match(/(?:R|ZAR)?(\\d+(?:\\.\\d+)?)/i);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function truckMileage(row: VehicleRow) {
  const raw = readMeta(row.description, "Mileage");
  const match = raw.match(/^([\\d\\s,.]+)\\s*(?:km|kilometres?)?$/i);
  if (!match) return null;
  const number = Number(match[1].replace(/[^0-9]/g, ""));
  return Number.isFinite(number) && number >= 0 ? number.toLocaleString("en-ZA") + " km" : null;
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

  const visible=useMemo(()=>{
    const filtered=rows.filter(row=>equipmentMatches(equipmentKind(row),mode)&&intentMatch(row,intent));
    return [...filtered].sort((first,second)=>{
      if(sort!=="newest"){
        const a=numericPrice(first,intent),b=numericPrice(second,intent);
        if(!Number.isFinite(a))return Number.isFinite(b)?1:0;
        if(!Number.isFinite(b))return -1;
        return sort==="price_low"?a-b:b-a;
      }
      return new Date(second.created_at||0).getTime()-new Date(first.created_at||0).getTime();
    });
  },[mode,rows,sort,intent]);

  const totalPages = Math.max(1, Math.ceil(visible.length / LISTINGS_PER_PAGE));
  const paginatedVisible = useMemo(() => {
    const start = (currentPage - 1) * LISTINGS_PER_PAGE;
    return visible.slice(start, start + LISTINGS_PER_PAGE);
  }, [currentPage, visible]);

  useEffect(() => { setCurrentPage(1); }, [mode, sort, intent]);
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
    <section id="vehicle-marketplace" className={`scroll-mt-24 border-t px-4 py-10 md:px-6 md:py-14 ${darkMode ? "border-white/10 bg-[#050505]" : "border-black/10 bg-[#f4efe3]"}`}>
      <span id="vehicle-marketplace-vehicles" className="block scroll-mt-24" aria-hidden="true" />
      <span id="vehicle-marketplace-units" className="block scroll-mt-24" aria-hidden="true" />
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-4xl font-black tracking-[-.05em] md:text-5xl">Vehicles and mobile units available</h2>
            <p className={`mt-3 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>Approved commercial stock, presented with the same clear marketplace pattern as LoadLink jobs.</p>
          </div>
          <LoadLinkSortControl darkMode={darkMode} value={sort} onChange={value=>setSort(value as SortMode)}
 options={[{value:"newest",label:"Newest first"},{value:"price_low",label:"Price: low to high"},{value:"price_high",label:"Price: high to low"}]}
 equipment={{value:mode,onChange:value=>setMode(value as ViewMode),options:[{value:"all",label:"All equipment"},{value:"vehicles",label:"Vehicles"},{value:"trucks",label:"Trucks"},{value:"trailers_units",label:"Trailers & mobile units"}]}}
 filter={{value:intent,onChange:value=>setIntent(value as Intent),resultCount:visible.length,options:[{value:"all",label:"All listings"},{value:"sale",label:"For sale",description:"Available to buy"},{value:"rental",label:"For rent",description:"Available to hire or rent"}]}}
 />
        </div>

        <div className="mt-6 flex max-w-full gap-2 overflow-x-auto pb-1">
          {([["all", "All equipment"], ["vehicles", "Vehicles"], ["trucks", "Trucks"], ["trailers_units", "Trailers & mobile units"]] as Array<[ViewMode, string]>).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setMode(value)} className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-black transition ${mode === value ? "border-[#f6b800] bg-[#f6b800] text-black" : surface}`}>{label}</button>
          ))}
        </div>

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
                const mileage = kind === "truck" ? truckMileage(row) : null;
                const kindLabel = kind === "mobile_unit" ? "Mobile unit" : kind === "trailer" ? "Trailer" : kind === "truck" ? "Truck" : "Vehicle";
                const wasSeen = seen.has(String(row.id));
                const href = `/vehicles/${row.id}`;
                return (
                  <article
                    key={row.id}
                    data-listing-card="true"
                    data-loadlink-vehicle-card="true"
                    data-listing-id={row.id}
                    className={`overflow-hidden border ${surface}`}
                  >
                    <Link href={href} onClick={() => markSeen(String(row.id))} className="group relative block w-full overflow-hidden bg-black text-left">
                      <div className="aspect-[4/3] w-full overflow-hidden md:aspect-[16/9]">
                        <LoadLinkImage src={row.photos?.[0] || "/images/truck-1.jpg"} alt={row.title || "LoadLink vehicle"} className="h-full w-full object-cover transition duration-500 md:group-hover:scale-[1.02]" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/45" />
                      <span className="absolute left-3 top-3 rounded-full bg-[#f6b800] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-black">{offer}</span>
                      {wasSeen ? <span className="absolute bottom-3 right-3 rounded-full bg-black/75 px-3 py-1.5 text-[10px] font-black text-white backdrop-blur">Seen</span> : null}
                    </Link>

                    <div className="p-5">
                      <p className="text-3xl font-black tracking-[-.04em] text-[#b88900]">{formatListingRate(row.rate)}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#2f9f5b] px-3 py-1.5 text-[10px] font-black uppercase text-white">{kindLabel}</span>
                        <span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase ${softPill}`}>{type}</span>
                      </div>
                      <Link href={href} onClick={() => markSeen(String(row.id))} className="mt-4 block text-2xl font-black tracking-[-.03em] hover:underline hover:underline-offset-4">{row.title || "Commercial vehicle"}</Link>
                      <p className={`mt-2 text-sm font-semibold ${muted}`}>{row.city || "South Africa"} · {postedLabel(row.created_at)}</p>
                      {mileage ? <p className={`mt-2 text-sm font-semibold ${muted}`}>Mileage: <strong className={darkMode ? "text-white" : "text-black"}>{mileage}</strong></p> : null}
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
            {(mode !== "all" || intent !== "all") ? <button type="button" onClick={() => {setMode("all");setIntent("all");}} className="mt-4 min-h-10 rounded-full bg-[#f6b800] px-5 text-xs font-black text-black">Clear filters</button> : null>
          </div>
        )}
      </div>
    </section>
  );
}
