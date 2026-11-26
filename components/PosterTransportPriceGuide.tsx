"use client";
import { useMemo, useState } from "react";
import { estimateTrip, estimateContractSpend, formatZar } from "@/lib/tripProfitability";

type Props = {darkMode:boolean;onUseRate:(value:string)=>void;contract?:boolean;initialExpanded?:boolean};
type NumericKey = "loadedKm"|"emptyKm"|"litresPer100Km"|"dieselRandPerLitre"|
  "tolls"|"driverExpenses"|"maintenanceRandPerKm"|"otherCosts"|"targetMarginPercent";

export default function PosterTransportPriceGuide({
  darkMode, onUseRate, contract=false, initialExpanded=false,
}: Props) {
  const [expanded,setExpanded]=useState(initialExpanded);
  const [values,setValues]=useState<Record<NumericKey,string>>({
    loadedKm:"",emptyKm:"",litresPer100Km:"",dieselRandPerLitre:"",
    tolls:"",driverExpenses:"",maintenanceRandPerKm:"",otherCosts:"",targetMarginPercent:"15",
  });
  const [tripsPerMonth,setTripsPerMonth]=useState("");
  const [months,setMonths]=useState("");

  const estimate=useMemo(()=>{
    const required=["loadedKm","litresPer100Km","dieselRandPerLitre"] as const;
    if(required.some(key=>!values[key].trim() || Number(values[key])<=0))return null;
    const input=Object.fromEntries(
      Object.entries(values).map(([key,val])=>[key,val.trim()?Number(val):0])
    ) as Record<NumericKey,number>;
    return estimateTrip({...input,offeredRevenue:0});
  },[values]);
  const contractSpend=useMemo(()=>contract&&estimate&&tripsPerMonth&&months
    ?estimateContractSpend(estimate.suggestedRate,Number(tripsPerMonth),Number(months))
    :null,[contract,estimate,tripsPerMonth,months]);
  const anyInvalid=Object.values(values).some(value=>value.trim() && (!Number.isFinite(Number(value))||Number(value)<0)) ||
    (values.targetMarginPercent.trim()!=="" && Number(values.targetMarginPercent)>95);
  const input=darkMode?"border-white/20 bg-[#171717] text-white":"border-black/15 bg-white text-black";
  const field=(key:NumericKey,label:string,placeholder:string)=>(
    <label className="block min-w-0 text-xs font-semibold" key={key}>{label}
      <input type="number" min="0" max={key==="targetMarginPercent"?"95":undefined}
        step="any" inputMode="decimal" placeholder={placeholder} value={values[key]}
        onChange={event=>setValues(previous=>({...previous,[key]:event.target.value}))}
        className={`mt-1.5 h-11 w-full min-w-0 rounded-lg border px-3 text-base outline-none focus:border-[#f6b800] ${input}`}/>
    </label>
  );
  const scheduleField=(label:string,value:string,onChange:(v:string)=>void,placeholder:string,max:number)=>(
    <label className="block min-w-0 text-xs font-semibold">{label}
      <input type="number" min="1" max={max} step="1" inputMode="numeric" placeholder={placeholder}
        value={value} onChange={event=>onChange(event.target.value)}
        className={`mt-1.5 h-11 w-full min-w-0 rounded-lg border px-3 text-base outline-none focus:border-[#f6b800] ${input}`}/>
    </label>
  );
  const other=estimate?estimate.totalCost-estimate.fuelCost-estimate.maintenanceCost:0;

  return <section data-loadlink-post-price-guide="true" className="min-w-0 border-t border-current/10 pt-3">
    <button type="button" aria-expanded={expanded} onClick={()=>setExpanded(open=>!open)}
      className="flex min-h-11 w-full items-center justify-between gap-3 text-left">
      <span><strong className="block text-sm font-semibold">Price determination</strong>
        <span className="mt-1 block text-xs opacity-65">Optional cost-based transport rate.</span>
      </span>
      <span className="text-base opacity-65" aria-hidden="true">{expanded?"−":"+"}</span>
    </button>
    {expanded?<div className="min-w-0 pb-3 pt-4">
      <p className="mb-4 text-xs leading-5 opacity-70">Enter actual route distance, fuel costs and operating expenses. LoadLink calculates a suggested rate from these figures.</p>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        {field("loadedKm","Loaded distance (km)","Required")}
        {field("emptyKm","Empty or return distance (km)","0")}
        {field("litresPer100Km","Fuel consumption (L/100 km)","Required")}
        {field("dieselRandPerLitre","Diesel price (R/L)","Required")}
        {field("tolls","Tolls (R)","0")}
        {field("driverExpenses","Driver expenses (R)","0")}
        {field("maintenanceRandPerKm","Maintenance (R/km)","0")}
        {field("otherCosts","Other operating costs (R)","0")}
        {field("targetMarginPercent","Target profit margin (%)","15")}
      </div>
      {contract?<div className="mt-4 border-t border-current/10 pt-4">
        <p className="mb-3 text-xs font-semibold">Contract schedule · optional</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {scheduleField("Trips per month",tripsPerMonth,setTripsPerMonth,"e.g. 20",10000)}
          {scheduleField("Contract length (months)",months,setMonths,"e.g. 12",240)}
        </div>
        <p className="mt-2 text-xs leading-5 opacity-65">Totals are calculated only when you provide both figures. The per-trip estimate remains separate.</p>
      </div>:null}
      {estimate?<div role="status" className="mt-4 border-t border-current/10 pt-4">
        <p className="text-xs font-semibold opacity-65">Suggested rate per trip · excluding VAT</p>
        <p className="mt-1 text-xl font-bold">{formatZar(estimate.suggestedRate)}</p>
        <details className="mt-3 text-xs" open>
          <summary className="cursor-pointer font-semibold">Calculation breakdown</summary>
          <div className="mt-2 space-y-1 leading-5 opacity-80">
            <p>Distance: {estimate.totalKm} km · Fuel: {estimate.fuelLitres} L ({formatZar(estimate.fuelCost)})</p>
            <p>Maintenance: {formatZar(estimate.maintenanceCost)}</p>
            <p>Other costs: {formatZar(other)}</p>
            <p>Break-even: {formatZar(estimate.breakEvenRate)}</p>
            <p>Target margin: {values.targetMarginPercent || "0"}%</p>
          </div>
        </details>
        {contractSpend?<div className="mt-3 border-t border-current/10 pt-3 text-xs leading-5">
          <p><strong>Projected monthly: {formatZar(contractSpend.monthly)}</strong></p>
          <p><strong>Projected full contract: {formatZar(contractSpend.contractTotal)}</strong></p>
        </div>:null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={()=>onUseRate(`R${estimate.suggestedRate.toFixed(2)}${contract?" per trip":""}`)}
            className="min-h-10 rounded-lg bg-[#f6b800] px-4 text-xs font-semibold text-black">
            Use per-trip rate
          </button>
          {contractSpend?<button type="button" onClick={()=>onUseRate(`${formatZar(contractSpend.contractTotal)} total contract`)}
            className="min-h-10 rounded-lg border border-current/20 px-4 text-xs font-semibold">
            Use contract total
          </button>:null}
        </div>
      </div>:<p role="status" className="mt-4 text-xs leading-5 opacity-65">
        {anyInvalid ? "Enter non-negative costs and a target margin between 0% and 95%." :
          "Enter positive loaded distance, fuel consumption and diesel price to calculate your rate."}
      </p>}
      <p className="mt-3 text-[11px] leading-5 opacity-55">
        Indicative planning calculation, not a market quote. VAT and unentered costs are excluded. Confirm actual route and contractual terms before posting.
      </p>
    </div>:null}
  </section>;
}
