"use client";
import { useMemo, useState } from "react";
import { estimateTrip,formatZar } from "@/lib/tripProfitability";
type Props={darkMode:boolean;onUseRate:(value:string)=>void;contract?:boolean};
export default function PosterTransportPriceGuide({darkMode,onUseRate,contract=false}:Props){
 const [expanded,setExpanded]=useState(false);
 const [values,setValues]=useState({loadedKm:"",emptyKm:"",litresPer100Km:"",dieselRandPerLitre:"",tolls:"",driverExpenses:"",maintenanceRandPerKm:"",otherCosts:"",targetMarginPercent:"15"});
 const field=(key:keyof typeof values,label:string,placeholder:string)=><label className="block text-xs font-semibold">
   {label}<input className={`mt-1.5 h-11 w-full rounded-xl border px-3 text-sm focus:border-[#f6b800] ${darkMode?"border-white/20 bg-black text-white":"border-black/15 bg-white text-black"}`} type="number" inputMode="decimal" min="0" max={key==="targetMarginPercent"?"99":undefined} step="any" placeholder={placeholder} value={values[key]} onChange={e=>setValues(s=>({...s,[key]:e.target.value}))}/>
 </label>;
 const estimate=useMemo(()=>{
   const required=["loadedKm","litresPer100Km","dieselRandPerLitre"] as const;
   if(required.some(k=>!values[k].trim()))return null;
   const obj=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,Number(v||0)]));
   return estimateTrip({...obj,offeredRevenue:0} as Parameters<typeof estimateTrip>[0]);
 },[values]);
 const totalOther=estimate?estimate.totalCost-estimate.fuelCost-estimate.maintenanceCost:0;
 return <div className={`mt-4 rounded-2xl border p-4 ${darkMode?"border-white/15 bg-white/[.03]":"border-black/10 bg-[#fafafa]"}`}>
    <button type="button" aria-expanded={expanded} onClick={()=>setExpanded(s=>!s)} className="flex w-full items-center justify-between gap-3 text-left">
      <span><strong className="block text-sm">LoadLink transport price guide</strong>
      <span className="mt-1 block text-xs opacity-65">Calculate an indicative price from the trip costs you provide.</span></span>
      <span className="text-xl font-semibold" aria-hidden="true">{expanded?"−":"+"}</span>
    </button>
    {expanded?<div className="mt-4">
      <p className="mb-3 text-xs opacity-70">Estimate a selling rate using your distance, fuel, operating costs and target margin. Review every calculation before using it.</p>
      <div className="grid gap-3 sm:grid-cols-2">
       {field("loadedKm","Loaded distance (km)","Required")}
       {field("emptyKm","Empty / return distance (km)","0")}
       {field("litresPer100Km","Vehicle fuel use (L/100 km)","Required")}
       {field("dieselRandPerLitre","Diesel price (R/litre)","Required")}
       {field("tolls","Tolls (R)","0")}
       {field("driverExpenses","Driver expenses (R)","0")}
       {field("maintenanceRandPerKm","Maintenance allowance (R/km)","0")}
       {field("otherCosts","Other operating costs (R)","0")}
       {field("targetMarginPercent","Target profit margin (%)","15")}
      </div>
      {estimate?<div className={`mt-4 rounded-xl border p-4 ${darkMode?"border-white/15":"border-black/10"}`}>
        <p className="text-xs font-semibold opacity-65">Estimated selling rate (excluding VAT)</p>
        <p className="mt-1 text-2xl font-black">{formatZar(estimate.suggestedRate)}</p>
        <details className="mt-3 text-xs" open>
         <summary className="cursor-pointer font-black">How we calculated this estimate</summary>
         <div className="mt-2 space-y-1 opacity-80">
           <p>Distance: {estimate.totalKm} km, including empty travel</p>
           <p>Fuel: {estimate.fuelLitres} L = {formatZar(estimate.fuelCost)}</p>
           <p>Maintenance: {formatZar(estimate.maintenanceCost)}</p>
           <p>Other entered expenses: {formatZar(totalOther)}</p>
           <p><strong>Break-even: {formatZar(estimate.breakEvenRate)}</strong></p>
           <p>Selling rate = break-even ÷ (1 − {values.targetMarginPercent}% target margin).</p>
         </div>
        </details>
        <button type="button" onClick={()=>onUseRate(`R${estimate.suggestedRate.toFixed(2)}${contract?" per trip":""}`)} className="mt-4 rounded-xl bg-[#f6b800] px-4 py-3 text-xs font-black text-black">Use this suggested rate</button>
      </div>:<p className="mt-3 text-xs opacity-65">Add a positive loaded distance, fuel consumption and diesel price. Optional costs left blank count as zero and may underestimate the true rate.</p>}
      <p className="mt-3 text-[11px] leading-5 opacity-55">This is a planning calculation, not a market quote or guaranteed price. Confirm road, cargo, vehicle, finance, VAT and contractual costs. {contract?"This example estimates one trip, not the full contract.":""}</p>
    </div>:null}
 </div>;
}
