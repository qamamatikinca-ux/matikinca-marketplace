"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import LoadLinkIcon from "@/components/LoadLinkIcon";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { comparableAskingPrices, formatZar, type VehicleMarketRow } from "@/lib/vehicleMarketGuide";
import { truckCatalog } from "@/lib/truckCatalog";
import { findCatalogBrand, findCatalogModel } from "@/lib/truckCatalogLookup";
import { lightCommercialCatalog } from "@/lib/southAfricanLightCommercialCatalog";
import ModelFamilyPhotoCard from "@/components/ModelFamilyPhotoCard";

export default function CommercialVehiclePriceGuide() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [kind, setKind] = useState<"truck" | "bakkie">("truck");
  const [year, setYear] = useState("");
  const [rows, setRows] = useState<VehicleMarketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [referenceId, setReferenceId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setMake((params.get("make") || "").slice(0, 80));
    setModel((params.get("model") || "").slice(0, 80));
    setYear((params.get("year") || "").slice(0, 4));
    setReferenceId(params.get("exclude") || "");
    setKind(params.get("kind") === "bakkie" || params.get("category") === "bakkie" ? "bakkie" : "truck");
    setSearched(Boolean(params.get("make") && params.get("model")));
    let active = true;
    fetch("/api/job-listings", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Listing feed not available");
        return response.json();
      })
      .then((payload) => { if (active) setRows((payload.rows || []) as VehicleMarketRow[]); })
      .catch(() => { if (active) setError("Live asking prices could not be loaded. Please try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const results = useMemo(() => searched ? comparableAskingPrices(rows, make, model, year, referenceId) : null, [rows, make, model, year, referenceId, searched]);
  const muted = darkMode ? "text-white/60" : "text-black/60";
  const surface = darkMode ? "border-white/10 bg-[#151615]" : "border-black/10 bg-white";
  const input = darkMode ? "border-white/15 bg-[#1b1d1a] text-white" : "border-black/10 bg-[#fafaf8] text-black";
  const catalogBrand = useMemo(() => kind === "truck" ? findCatalogBrand(make) : null, [kind, make]);
  const commercialBrand = useMemo(() => kind === "bakkie"
    ? lightCommercialCatalog.find(item => item.name.toLowerCase() === make.trim().toLowerCase()) : null, [kind, make]);
  const catalogMatch = useMemo(() => kind === "truck"
    ? findCatalogModel(make, model, /^\d{4}$/.test(year) ? Number(year) : undefined) : null, [kind, make, model, year]);
  const availableModels = kind === "truck" ? (catalogBrand?.models || []) : (commercialBrand?.models || []);
  const selectedYear = /^\d{4}$/.test(year) ? Number(year) : undefined;
  const yearValid = !year || (/^\d{4}$/.test(year) && Number(year) >= 1970 && Number(year) <= new Date().getFullYear() + 1);

  return (
    <main className={darkMode ? "min-h-screen bg-[#090a09] text-white" : "min-h-screen bg-[#f7f5ef] text-[#161616]"} data-loadlink-price-guide="true">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <div className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6">
        <Link href="/tools" className={"inline-flex min-h-10 items-center gap-1 text-xs font-semibold " + muted}><LoadLinkIcon name="chevronLeft" size={16} /> All tools</Link>
        <h1 className="mt-5 text-[clamp(28px,6vw,42px)] font-bold leading-[1.12] tracking-[-.045em]">Commercial vehicle price guide</h1>
        <p className={"mt-3 max-w-2xl text-sm leading-6 " + muted}>Compare real advertised asking prices on LoadLink. Select a truck or bakkie and see its real model-family reference photo alongside current LoadLink asking prices. Photos are examples, not proof of a particular year or trim.</p>

        <section className={"mt-7 rounded-[22px] border p-5 shadow-sm sm:p-6 " + surface} aria-labelledby="compare-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="compare-heading" className="text-lg font-bold">Find comparable listings</h2>
            <div className={"flex rounded-full border p-1 " + (darkMode ? "border-white/15 bg-white/[.04]" : "border-black/10 bg-[#f3f3f3]")} role="group" aria-label="Vehicle type">
              {(["truck", "bakkie"] as const).map(value => <button key={value} type="button"
                onClick={() => { if (kind !== value) { setKind(value); setMake(""); setModel(""); setSearched(false); } }}
                aria-pressed={kind === value}
                className={"min-h-10 rounded-full px-5 text-xs font-bold transition-colors " + (kind === value ? "bg-[#f6b800] text-black" : "opacity-65")}>
                {value === "truck" ? "Trucks" : "Bakkies"}
              </button>)}
            </div>
          </div>
          <datalist id="loadlink-truck-makes">
            {(kind === "truck" ? truckCatalog : lightCommercialCatalog).map((brand) => <option key={brand.name} value={brand.name} />)}
          </datalist>
          <datalist id="loadlink-truck-models">
            {availableModels.map((item) => <option key={item.name} value={item.name} />)}
          </datalist>
          <form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={(event) => { event.preventDefault(); setSearched(true); }}>
            <label className="block text-xs font-semibold">Make
              <input type="text" autoComplete="off" maxLength={80} value={make} onChange={(e)=>{setMake(e.target.value);setSearched(false);}} placeholder="e.g. Volvo" list="loadlink-truck-makes" className={"mt-2 min-h-12 w-full rounded-xl border px-3 text-base outline-none focus:border-[#f6b800] " + input} required />
            </label>
            <label className="block text-xs font-semibold">Model
              <input type="text" autoComplete="off" maxLength={80} value={model} onChange={(e)=>{setModel(e.target.value);setSearched(false);}} placeholder="e.g. FH" list="loadlink-truck-models" className={"mt-2 min-h-12 w-full rounded-xl border px-3 text-base outline-none focus:border-[#f6b800] " + input} required />
            </label>
            <label className="block text-xs font-semibold">Year <span className={muted}>(optional ±2 years)</span>
              <input type="text" inputMode="numeric" maxLength={4} value={year} onChange={(e)=>{setYear(e.target.value.replace(/\D/g,""));setSearched(false);}} placeholder="e.g. 2022" className={"mt-2 min-h-12 w-full rounded-xl border px-3 text-base outline-none focus:border-[#f6b800] " + input} />
            </label>
            <div className="sm:col-span-3">
              <button type="submit" disabled={loading || Boolean(error) || make.trim().length < 2 || model.trim().length < 2 || !yearValid} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f6b800] px-5 text-sm font-bold text-black disabled:opacity-45 sm:w-auto">
                <LoadLinkIcon name="search" size={17} /> Compare asking prices
              </button>
              {!yearValid ? <p role="alert" className="mt-2 text-xs text-red-500">Enter a valid four-digit model year.</p> : null}
            </div>
          </form>
        </section>

        {make.trim() && model.trim() ? (
          <section className="mt-4" aria-label="Actual selected model photo">
            <ModelFamilyPhotoCard kind={kind} make={make} model={model} year={selectedYear} darkMode={darkMode} />
          </section>
        ) : null}

        {catalogMatch ? (
          <section className={"mt-4 rounded-2xl border p-5 sm:p-6 " + surface} aria-label="Truck model specifications reference">
            <p className={"text-[11px] font-semibold " + muted}>Model reference</p>
            <h2 className="mt-1.5 text-base font-bold">{catalogMatch.brand.name} {catalogMatch.model.name}</h2>
            <p className={"mt-1 text-xs leading-5 " + muted}>Model-family information; specifications vary by year, market and exact vehicle configuration.</p>
            <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-current/10 pt-4">
              <div><dt className={"text-[11px] " + muted}>Model years in catalog</dt><dd className="mt-1 text-sm font-semibold">{catalogMatch.model.from}–{catalogMatch.model.to}</dd></div>
              <div><dt className={"text-[11px] " + muted}>Fuel options</dt><dd className="mt-1 text-sm font-semibold">{catalogMatch.model.fuels.join(", ")}</dd></div>
              <div><dt className={"text-[11px] " + muted}>Gearbox options</dt><dd className="mt-1 text-sm font-semibold">{catalogMatch.model.transmissions.join(", ")}</dd></div>
              <div><dt className={"text-[11px] " + muted}>Axle configurations</dt><dd className="mt-1 text-sm font-semibold">{catalogMatch.model.axleConfigurations.join(", ")}</dd></div>
              <div className="col-span-2"><dt className={"text-[11px] " + muted}>Typical applications</dt><dd className="mt-1 text-sm font-semibold">{catalogMatch.model.applications.slice(0, 6).join(", ")}</dd></div>
            </dl>
            <p className={"mt-4 text-xs leading-5 " + muted}>These are possible configurations, not verified specifications of a particular listing. Confirm the exact truck's specification plate and documents before purchase.</p>
          </section>
        ) : make.trim() && model.trim() && catalogBrand && kind === "truck" ? (
          <p className={"mt-3 text-xs leading-5 " + muted}>That model/year combination is not confirmed in the truck catalog. You can still compare current advertised listings.</p>
        ) : null}

        {loading ? <p role="status" className={"mt-6 text-sm " + muted}>Checking current LoadLink listings…</p> : error ? (
          <p role="alert" className="mt-5 rounded-xl border border-red-500/30 p-4 text-sm">{error}</p>
        ) : searched && results ? (
          <section className={"mt-5 overflow-hidden rounded-2xl border " + surface} aria-label="Comparable asking prices">
            <div className="border-b border-current/10 p-5 sm:p-6">
              <p className={"text-xs " + muted}>{results.sampleSize} active, similarly described listings</p>
              <h2 className="mt-2 text-[clamp(25px,6vw,37px)] font-bold tracking-[-.04em]">{formatZar(results.median)}</h2>
              <p className={"mt-1 text-xs " + muted}>Median advertised asking price, not a vehicle valuation</p>
              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-current/10 pt-4">
                <div><p className={"text-xs " + muted}>Lowest asking price</p><p className="mt-1 font-semibold">{formatZar(results.low)}</p></div>
                <div><p className={"text-xs " + muted}>Highest asking price</p><p className="mt-1 font-semibold">{formatZar(results.high)}</p></div>
              </div>
            </div>
            <h3 className="px-5 pt-5 text-sm font-bold sm:px-6">Listings used for comparison</h3>
            <div className="px-5 pb-5 sm:px-6">{results.listings.map((item) =>
              <Link href={"/vehicles/" + encodeURIComponent(item.id)} key={item.id} className="flex min-h-14 items-center justify-between gap-3 border-b border-current/10 py-3 text-sm last:border-0">
                <span className="min-w-0"><strong className="block truncate">{item.title || "Commercial vehicle"}</strong><small className={muted}>{item.city || "South Africa"}</small></span>
                <span className="shrink-0 text-right font-semibold">{formatZar(item.askingPrice)}</span>
              </Link>
            )}</div>
          </section>
        ) : searched ? (
          <section className={"mt-5 rounded-2xl border p-5 " + surface}>
            <h2 className="text-base font-bold">Not enough comparable listings yet</h2>
            <p className={"mt-2 text-sm leading-6 " + muted}>LoadLink needs at least three current listings with the same make and model, an explicit sale price, and a similar model year if supplied. Try removing the year filter or browse available stock. We won't invent a value.</p>
            <Link href="/list-your-vehicle#vehicle-marketplace" className="mt-4 inline-flex min-h-10 items-center rounded-xl border border-current/15 px-4 text-xs font-semibold">Browse commercial vehicles</Link>
          </section>
        ) : null}
        <p className={"mt-6 text-xs leading-6 " + muted}>Asking prices can differ because of mileage, condition, service history, equipment, VAT and location. These comparisons are not independently verified, and should not be used as a bank, insurance or trade-in valuation.</p>
      </div>
    </main>
  );
}
