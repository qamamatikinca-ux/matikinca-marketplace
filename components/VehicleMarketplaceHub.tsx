"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
};

type ViewMode = "all" | "vehicles" | "units";
type SortMode = "newest" | "price_low" | "price_high";

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

function numericPrice(row: VehicleRow) {
  const explicit = readMeta(row.description, "Sale price") || String(row.rate || "");
  const clean = explicit.replace(/\s+/g, "").replace(/,/g, "");
  const match = clean.match(/(?:R|ZAR)?([0-9]+(?:\.[0-9]+)?)/i);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

export default function VehicleMarketplaceHub({ darkMode }: { darkMode: boolean }) {
  const [rows, setRows] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ViewMode>("all");
  const [sort, setSort] = useState<SortMode>("newest");

  useEffect(() => {
    let active = true;
    fetch(`/api/job-listings?t=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (active) setRows(((payload.rows || []) as VehicleRow[]).filter(isVehicleListing));
      })
      .catch(() => {
        if (active) setRows([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function syncHash() {
      if (window.location.hash === "#vehicle-marketplace-units") setMode("units");
      if (window.location.hash === "#vehicle-marketplace-vehicles") setMode("vehicles");
    }
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const visible = useMemo(() => {
    const filtered = rows.filter((row) => mode === "all" || (mode === "units" ? isMobileUnit(row) : !isMobileUnit(row)));
    return [...filtered].sort((first, second) => {
      if (sort === "price_low") return numericPrice(first) - numericPrice(second);
      if (sort === "price_high") return numericPrice(second) - numericPrice(first);
      return new Date(second.created_at || 0).getTime() - new Date(first.created_at || 0).getTime();
    });
  }, [mode, rows, sort]);

  const surface = darkMode ? "border-white/10 bg-black/62 text-white" : "border-white/75 bg-white/70 text-black";
  const muted = darkMode ? "text-white/50" : "text-black/50";

  return (
    <section id="vehicle-marketplace" className={`border-t px-4 py-10 md:px-6 md:py-14 ${darkMode ? "border-white/10 bg-[#050505]" : "border-black/10 bg-[#f4efe3]"}`}>
      <span id="vehicle-marketplace-vehicles" className="block scroll-mt-24" aria-hidden="true" />
      <span id="vehicle-marketplace-units" className="block scroll-mt-24" aria-hidden="true" />
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#b88900]">Approved LoadLink listings</p>
            <h2 className="mt-2 text-4xl font-black tracking-[-.05em] md:text-5xl">Vehicles and mobile units available</h2>
            <p className={`mt-3 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>Browse approved trucks, trailers and commercial mobile units from the same portal used to list stock.</p>
          </div>
          <label className={`loadlink-sort-control w-fit border ${surface}`}>
            <span>Sort by</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
              <option value="newest">Newest first</option>
              <option value="price_low">Price low to high</option>
              <option value="price_high">Price high to low</option>
            </select>
          </label>
        </div>

        <div className="mt-6 flex max-w-full gap-2 overflow-x-auto pb-1">
          {([
            ["all", "All approved"],
            ["vehicles", "Trucks & trailers"],
            ["units", "Mobile units"],
          ] as Array<[ViewMode, string]>).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-black transition ${mode === value ? "border-[#f6b800] bg-[#f6b800] text-black" : surface}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((item) => <div key={item} className={`h-72 animate-pulse rounded-[24px] border ${surface}`} />)}
          </div>
        ) : visible.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {visible.map((row) => {
              const type = readMeta(row.description, "Vehicle subtype") || readMeta(row.description, "Listing type") || row.vehicle_group || "Commercial vehicle";
              const offer = readMeta(row.description, "Offer") || "Available";
              return (
                <Link
                  key={row.id}
                  href={`/jobs?portal=asset&search=${encodeURIComponent(row.title || "vehicle")}#job-${row.id}`}
                  className={`loadlink-glass group overflow-hidden rounded-[24px] border shadow-[0_12px_34px_rgba(0,0,0,.06)] ${surface}`}
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-black/10">
                    {row.photos?.[0] ? <img src={row.photos[0]} alt={row.title || "LoadLink vehicle"} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.015]" /> : <div className="flex h-full items-center justify-center text-sm font-black opacity-35">LoadLink</div>}
                    <span className="absolute left-3 top-3 rounded-full bg-black/78 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.1em] text-white">{offer}</span>
                  </div>
                  <div className="p-4">
                    <p className={`text-[10px] font-black uppercase tracking-[.1em] ${muted}`}>{type} · {row.city || "South Africa"}</p>
                    <h3 className="mt-2 text-xl font-black tracking-[-.03em]">{row.title || "Commercial vehicle"}</h3>
                    <p className="mt-3 text-2xl font-black text-[#b88900]">{formatListingRate(row.rate)}</p>
                    <span className="mt-4 inline-block text-xs font-black underline underline-offset-4">View full listing</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className={`loadlink-glass mt-6 rounded-[24px] border p-8 text-center ${surface}`}>
            <h3 className="text-xl font-black">No approved listings in this category yet</h3>
            <p className={`mx-auto mt-2 max-w-md text-sm font-semibold leading-6 ${muted}`}>Try All approved or return later as new verified stock is added.</p>
          </div>
        )}
      </div>
    </section>
  );
}
