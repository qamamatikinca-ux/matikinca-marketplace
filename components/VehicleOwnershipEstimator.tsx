"use client";
import {useMemo,useState} from "react";
import {estimateVehicleOwnership, type VehicleOwnershipInput} from "@/lib/vehicleOwnershipCost";
import {formatZar} from "@/lib/vehicleMarketGuide";
type Props={darkMode:boolean;category?:string;make?:string;model?:string;condition?:string;initialFuel?:string;onFuelChange?:(v:string)=>void;posting?:boolean};
export default function VehicleOwnershipEstimator({darkMode,category="",make="",model="",condition="",initialFuel="",onFuelChange,posting=false}:Props){
 const [fuel,setFuel]=useState(initialFuel);
 const [values,setValues]=useState({annualKm:"",dieselRandPerLitre:"",maintenanceRandPerKm:"",insuranceMonthly:"",licenceAnnual:"",tyresAnnual:"",financeMonthly:"",depreciationAnnual:""});
 const powered=!/trailer|mobile.unit/i.test(category);
 const actualFuel=onFuelChange?initialFuel:fuel;
 const update=(key:keyof typeof values,value:string)=>setValues(s=>({...s,[key]:value}));
 const estimate=useMemo(()=>{
  const entry:VehicleOwnershipInput={
   ...Object.fromEntries(Object.entries(values).map(([k,v])=>[k,Number(v||0)])),
   litresPer100Km:powered?Number(actualFuel||0):0,
  } as VehicleOwnershipInput;
  if(!values.annualKm||Number(values.annualKm)<=0)return null;
  if(powered&&(!actualFuel||!values.dieselRandPerLitre))return null;
  if(Object.values(entry).some(n=>!Number.isFinite(n)||n<0))return null;
  return estimateVehicleOwnership(entry);
 },[values,actualFuel,powered]);
 const input=darkMode?"border-white/15 bg-[#202020] text-white":"border-black/10 bg-white text-black";
 const fields=[
  {key:"annualKm",label:"Estimated kilometres per year",hint:"e.g. 80000"},
  ...(powered?[{key:"dieselRandPerLitre",label:"Diesel price (R/L)",hint:"Enter current pump price"}]:[]),
  {key:"maintenanceRandPerKm",label:"Maintenance allowance (R/km)",hint:"e.g. 2.50"},
  {key:"insuranceMonthly",label:"Insurance per month (R)",hint:"Optional"},
  {key:"licenceAnnual",label:"Licensing per year (R)",hint:"Optional"},
  {key:"tyresAnnual",label:"Tyres per year (R)",hint:"Optional"},
  {key:"financeMonthly",label:"Finance per month (R)",hint:"Optional"},
  {key:"depreciationAnnual",label:"Depreciation per year (R)",hint:"Optional"}
 ] as Array<{key:keyof typeof values;label:string;hint:string}>;
 return <section data-loadlink-vehicle-costs="true" className={`overflow-hidden rounded-[20px] border ${darkMode?"border-[#f6b800]/35 bg-[#111] text-white":"border-[#ecc455]/70 bg-[#fffaf0] text-[#171717]"}`}>
  <details open={posting?undefined:undefined} className="group" defaultOpen={posting}>
   <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:px-5">
    <span className="min-w-0"><span className="block text-[10px] font-black uppercase tracking-[.12em] text-[#bd8800]">LoadLink vehicle intelligence</span>
     <strong className="mt-1 block text-base font-black">Cost of ownership</strong>
     <span className="mt-1 block text-xs opacity-65">{make||model?`${make} ${model}`.trim()+" · ":""}Estimate annual running costs before deciding on a price.</span></span>
    <span className="text-xl font-bold text-[#db9e00]" aria-hidden="true">+</span>
   </summary>
   <div className="border-t border-current/10 px-4 pb-5 pt-4 sm:px-5">
    <p className="mb-3 text-xs leading-5 opacity-75">This is a transparent calculation from your own inputs, not an insurance quote, verified vehicle specification or live diesel-price feed.{condition?" Seller-reported condition: "+condition+".":""}</p>
    <div className="grid gap-3 sm:grid-cols-2">
     {powered?<label className="text-xs font-bold">Vehicle fuel use (L/100 km)<input type="number" min="0" max="150" step="any" placeholder="Use actual vehicle records" value={actualFuel}
      onChange={e=>{if(onFuelChange)onFuelChange(e.target.value);else setFuel(e.target.value)}}
      className={`mt-1.5 h-11 w-full rounded-xl border px-3 text-base outline-none focus:border-[#f6b800] ${input}`}/></label>:null}
     {fields.map(f=><label key={f.key} className="text-xs font-bold">{f.label}<input type="number" min="0" step="any" value={values[f.key]}
      onChange={e=>update(f.key,e.target.value)} placeholder={f.hint} className={`mt-1.5 h-11 w-full rounded-xl border px-3 text-base outline-none focus:border-[#f6b800] ${input}`}/></label>)}
    </div>
    {estimate?<div className={`mt-4 grid grid-cols-3 gap-2 rounded-xl border p-3 ${darkMode?"border-white/15":"border-black/10"}`}>
     <div><p className="text-[10px] opacity-65">Per year</p><strong className="mt-1 block break-words text-sm">{formatZar(estimate.annualTotal)}</strong></div>
     <div><p className="text-[10px] opacity-65">Per month</p><strong className="mt-1 block break-words text-sm">{formatZar(estimate.monthlyTotal)}</strong></div>
     <div><p className="text-[10px] opacity-65">Per km</p><strong className="mt-1 block break-words text-sm">{formatZar(estimate.costPerKm)}</strong></div>
     <p className="col-span-3 border-t border-current/10 pt-2 text-[11px] leading-5 opacity-75">Fuel {formatZar(estimate.annualFuel)} · Maintenance {formatZar(estimate.annualMaintenance)} · Other entered costs {formatZar(estimate.annualFixed)}</p>
    </div>:<p role="status" className="mt-4 text-xs leading-5 opacity-65">Enter annual distance{powered?", actual fuel use and diesel price":""} to calculate ownership costs. Missing optional costs count as zero and may understate the total.</p>}
    <p className="mt-3 text-[10px] leading-4 opacity-55">Excludes VAT, unexpected breakdowns and any unentered costs. Confirm maintenance intervals and actual consumption for this vehicle.</p>
   </div>
  </details>
 </section>;
}
