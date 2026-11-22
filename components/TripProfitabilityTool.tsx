"use client";

import { useMemo, useState } from "react";
import LoadLinkDocumentPreview from "@/components/LoadLinkDocumentPreview";
import { estimateTrip, formatZar, type TripInputs } from "@/lib/tripProfitability";

type Field = { id: keyof TripInputs; label: string; hint: string; required?: boolean };
const FIELDS: Field[] = [
  { id:"offeredRevenue", label:"Transport offer / quoted revenue (R)", hint:"The amount you will receive before VAT" },
  { id:"loadedKm", label:"Loaded trip distance (km)", hint:"Distance from collection to delivery", required:true },
  { id:"emptyKm", label:"Expected empty / return distance (km)", hint:"Include unladen distance you must pay for" },
  { id:"litresPer100Km", label:"Truck fuel consumption (L/100 km)", hint:"Use this vehicle's actual average", required:true },
  { id:"dieselRandPerLitre", label:"Diesel price (R/litre)", hint:"Enter the price you expect to pay", required:true },
  { id:"tolls", label:"Toll fees (R)", hint:"Total tolls for this trip" },
  { id:"driverExpenses", label:"Driver expenses (R)", hint:"Driver allocation, allowances, accommodation and meals" },
  { id:"maintenanceRandPerKm", label:"Maintenance and tyre allowance (R/km)", hint:"Set aside a rate for all kilometres" },
  { id:"otherCosts", label:"Other trip costs (R)", hint:"Insurance allocation, vehicle finance, loading or other relevant expenses" },
  { id:"targetMarginPercent", label:"Target profit margin (%)", hint:"Percentage of the final selling price, not markup", required:true },
];
const defaults: Record<keyof TripInputs,string> = {
  offeredRevenue:"",loadedKm:"",emptyKm:"",litresPer100Km:"",dieselRandPerLitre:"",
  tolls:"",driverExpenses:"",maintenanceRandPerKm:"",otherCosts:"",targetMarginPercent:"15",
};
function isValidNumber(raw: string): boolean {
  return raw.trim() !== "" && Number.isFinite(Number(raw)) && Number(raw) >= 0;
}
export default function TripProfitabilityTool({darkMode,workspaceTab}:{darkMode:boolean;workspaceTab:"details"|"preview"}) {
  const [values,setValues]=useState(defaults);
  const [feedback,setFeedback]=useState("");
  const inputClass = `mt-1.5 h-11 w-full rounded-xl border px-3 text-sm font-semibold outline-none focus:border-[#f6b800] ${darkMode?"border-white/15 bg-white/[.035] text-white":"border-black/15 bg-[#faf9f5] text-black"}`;
  const ready = FIELDS.filter(f=>f.required).every(f=>isValidNumber(values[f.id]));
  const hasInvalid = Object.values(values).some(raw=>raw.trim()!=="" && (!Number.isFinite(Number(raw)) || Number(raw)<0));
  const estimate = useMemo(()=>ready && !hasInvalid ? estimateTrip(Object.fromEntries(
    Object.entries(values).map(([key,value])=>[key,Number(value||0)])
  ) as unknown as TripInputs):null,[ready,hasInvalid,values]);
  const lines = estimate ? [
    "LOADLINK TRIP PROFITABILITY & RATE ESTIMATE",
    "Logistics Made Easier",
    "",
    "Loaded distance: "+estimate.totalKm+" km total including empty travel",
    "Loaded kilometres: "+values.loadedKm+" km",
    "Empty kilometres: "+(values.emptyKm||"0")+" km",
    "Fuel consumption: "+values.litresPer100Km+" L/100 km",
    "Diesel price: "+formatZar(Number(values.dieselRandPerLitre))+" per litre",
    "",
    "Estimated diesel usage: "+estimate.fuelLitres+" litres",
    "Estimated fuel cost: "+formatZar(estimate.fuelCost),
    "Estimated tyre and maintenance allowance: "+formatZar(estimate.maintenanceCost),
    "Tolls: "+formatZar(Number(values.tolls||0)),
    "Driver expenses: "+formatZar(Number(values.driverExpenses||0)),
    "Other costs: "+formatZar(Number(values.otherCosts||0)),
    "Estimated total cost / break-even rate: "+formatZar(estimate.totalCost),
    "Target margin: "+Number(values.targetMarginPercent)+"%",
    "Cost-based suggested selling rate: "+formatZar(estimate.suggestedRate),
    ...(values.offeredRevenue.trim() ? [
      "Quoted revenue: "+formatZar(Number(values.offeredRevenue)),
      "Estimated profit / loss: "+formatZar(estimate.profit),
      "Estimated profit margin: "+(estimate.marginPercent===null?"Not applicable":estimate.marginPercent.toFixed(1)+"%"),
    ]:[]),
    "",
    "All inputs and results exclude VAT. This is a cost-based estimate based only on amounts supplied by the user, not a verified market tariff.",
    "Check actual mileage, diesel usage, wages, insurance, finance, maintenance, downtime and applicable taxes before committing to any rate.",
    "Private financial estimate. Do not share unless you intend the recipient to see your costs.",
  ].join("\n") : "";
  async function copy() {
    try { await navigator.clipboard.writeText(lines); setFeedback("Estimate copied."); }
    catch {setFeedback("Your browser blocked copying. Select the text from the preview.");}
  }
  async function share() {
    if(navigator.share) {try{await navigator.share({title:"LoadLink trip estimate",text:lines});return;}catch{}}
    await copy();
  }
  return <div className="grid gap-5 p-4 md:grid-cols-[.9fr_1.1fr] md:p-6">
    <div className={`${workspaceTab==="details"?"grid":"hidden"} min-w-0 gap-3 md:grid`}>
      <div className={`rounded-xl border p-3 text-xs leading-5 ${darkMode?"border-white/10 bg-white/[.035] text-white/75":"border-black/10 bg-[#faf9f5] text-black/75"}`}>
        Enter your own truck and trip costs. LoadLink calculates the break-even rate and a suggested selling price. It does not invent market rates.
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map(f=><label key={f.id} className="min-w-0 text-xs font-bold">{f.label}
          <input type="number" min="0" max={f.id==="targetMarginPercent"?"99":undefined} step="any"
            inputMode="decimal" value={values[f.id]} onChange={e=>setValues(s=>({...s,[f.id]:e.target.value}))}
            aria-label={f.label} className={inputClass} placeholder={f.required?"Required":"0"}/>
          <span className={`mt-1 block text-[10px] font-medium leading-4 ${darkMode?"text-white/55":"text-black/55"}`}>{f.hint}</span>
        </label>)}
      </div>
      <p className={`text-xs font-semibold ${darkMode?"text-white/65":"text-black/65"}`}>All values are entered exclusive of VAT. Your private costs are not sent to the job poster.</p>
    </div>
    <div className={`${workspaceTab==="preview"?"grid":"hidden"} min-w-0 content-start gap-3 md:grid`}>
      {estimate ? <>
        <div className={`grid grid-cols-2 gap-3 rounded-2xl border p-4 ${darkMode?"border-white/10":"border-black/10"}`}>
          <div><p className="text-xs opacity-60">Break-even rate</p><p className="mt-1 text-lg font-black">{formatZar(estimate.breakEvenRate)}</p></div>
          <div><p className="text-xs opacity-60">Suggested rate</p><p className="mt-1 text-lg font-black">{formatZar(estimate.suggestedRate)}</p></div>
          {values.offeredRevenue.trim()?<>
            <div><p className="text-xs opacity-60">Estimated profit / loss</p><p className="mt-1 text-lg font-black">{formatZar(estimate.profit)}</p></div>
            <div><p className="text-xs opacity-60">Estimated margin</p><p className="mt-1 text-lg font-black">{estimate.marginPercent?.toFixed(1)??"0.0"}%</p></div>
          </>:null}
        </div>
        <details className={`rounded-xl border p-3 text-xs ${darkMode?"border-white/10":"border-black/10"}`} open>
          <summary className="cursor-pointer font-black">How LoadLink calculated the recommendation</summary>
          <div className="mt-3 space-y-1.5">
            <p>Distance: {estimate.totalKm} km, including {Number(values.emptyKm||0)} km empty.</p>
            <p>Fuel: {estimate.fuelLitres} litres × {formatZar(Number(values.dieselRandPerLitre))} = {formatZar(estimate.fuelCost)}</p>
            <p>Maintenance: {formatZar(estimate.maintenanceCost)}</p>
            <p>Other entered trip costs: {formatZar(estimate.totalCost-estimate.fuelCost-estimate.maintenanceCost)}</p>
            <p><strong>Total cost: {formatZar(estimate.totalCost)}</strong></p>
            <p>Suggested rate = total cost ÷ (1 − {Number(values.targetMarginPercent)}% target margin).</p>
          </div>
        </details>
        <LoadLinkDocumentPreview darkMode={darkMode} documentType="Trip profitability estimate" body={lines}/>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={()=>void copy()} type="button" className="h-11 rounded-full bg-[#f6b800] text-xs font-black text-black">Copy</button>
          <button onClick={()=>void share()} type="button" className="h-11 rounded-full border border-current/20 text-xs font-bold">Share</button>
        </div>
      </> : <p role="status" className="rounded-xl border border-current/15 p-4 text-sm font-semibold">Enter the loaded distance, fuel consumption, diesel price and target margin to calculate an estimate. Other costs default to zero if left blank; this can underestimate the true cost.</p>}
      {feedback?<p role="status" className="text-xs font-semibold">{feedback}</p>:null}
    </div>
  </div>;
}
