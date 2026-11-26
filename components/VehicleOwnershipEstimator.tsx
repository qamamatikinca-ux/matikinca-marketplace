"use client";
import {useMemo,useState} from "react";
import {estimateVehicleOwnership, type VehicleOwnershipInput} from "@/lib/vehicleOwnershipCost";
import {formatZar} from "@/lib/vehicleMarketGuide";
type Props={darkMode:boolean;category?:string;make?:string;model?:string;condition?:string;fuelType?:string;initialFuel?:string;onFuelChange?:(v:string)=>void;posting?:boolean};
export default function VehicleOwnershipEstimator({darkMode,category="",make="",model="",condition="",fuelType="",initialFuel="",onFuelChange,posting=false}:Props){
 const [fuel,setFuel]=useState(initialFuel);
 const [expanded,setExpanded]=useState(posting);
 const [values,setValues]=useState({annualKm:"",dieselRandPerLitre:"",maintenanceRandPerKm:"",insuranceMonthly:"",licenceAnnual:"",tyresAnnual:"",financeMonthly:"",depreciationAnnual:""});
 const powered=!/trailer|mobile.unit/i.test(category);
 const electric=powered && /electric|battery|\bev\b/i.test(fuelType);
 const actualFuel=onFuelChange?initialFuel:fuel;
 const update=(key:keyof typeof values,value:string)=>setValues(s=>({...s,[key]:value}));
 const estimate=useMemo(()=>{
  const entry:VehicleOwnershipInput={
   energySource:electric?"electric":"fuel",
   ...Object.fromEntries(Object.entries(values).map(([k,v])=>[k,Number(v||0)])),
   litresPer100Km:powered?Number(actualFuel||0):0,
  } as VehicleOwnershipInput;
  if(!values.annualKm||Number(values.annualKm)<=0)return null;
  if(powered&&(!actualFuel||!values.dieselRandPerLitre))return null;
  if(Object.entries(entry).some(([key,value])=>key!=="energySource" && (typeof value!=="number"||!Number.isFinite(value)||value<0)))return null;
  return estimateVehicleOwnership(entry);
 },[values,actualFuel,powered,electric]);
 const input=darkMode?"border-white/15 bg-[#202020] text-white":"border-black/10 bg-white text-black";
 const fields=[
  {key:"annualKm",label:"Estimated kilometres per year",hint:"e.g. 80000"},
  ...(powered?[{key:"dieselRandPerLitre",label:electric?"Electricity price (R/kWh)":"Fuel price (R/L)",hint:electric?"Enter actual electricity tariff":"Enter current pump price"}]:[]),
  {key:"maintenanceRandPerKm",label:"Maintenance allowance (R/km)",hint:"e.g. 2.50"},
  {key:"insuranceMonthly",label:"Insurance per month (R)",hint:"Optional"},
  {key:"licenceAnnual",label:"Licensing per year (R)",hint:"Optional"},
  {key:"tyresAnnual",label:"Tyres per year (R)",hint:"Optional"},
  {key:"financeMonthly",label:"Finance interest per month (R)",hint:"Interest only; not loan principal"},
  {key:"depreciationAnnual",label:"Depreciation per year (R)",hint:"Optional"}
 ] as Array<{key:keyof typeof values;label:string;hint:string}>;
 return <section data-loadlink-vehicle-costs="true" className="min-w-0 border-t border-current/10 pt-3">
  <div className="group">
   <button type="button" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)} className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 py-2 text-left">
    <span className="min-w-0"><strong className="block text-sm font-semibold">Cost of ownership calculator</strong>
     <span className="mt-1 block text-xs opacity-65">{make||model?`${make} ${model}`.trim()+" · ":""}Estimate annual running costs before deciding on a price.</span></span>
    <span className="text-base opacity-65" aria-hidden="true">{expanded?"−":"+"}</span>
   </button>
   {expanded ? <div className="min-w-0 pb-4 pt-3">
    <p className="mb-3 text-xs leading-5 opacity-75">This is a transparent calculation from your own inputs, not an insurance quote, verified vehicle specification or live diesel-price feed.{condition?" Seller-reported condition: "+condition+".":""}</p>
    <div className="grid gap-3 sm:grid-cols-2">
     {powered?<label className="min-w-0 text-xs font-semibold">{electric?"Energy use (kWh/100 km)":"Fuel use (L/100 km)"}<input type="number" min="0" max={electric?"500":"150"} step="any" placeholder="Use actual vehicle records" value={actualFuel}
      onChange={e=>{if(onFuelChange)onFuelChange(e.target.value);else setFuel(e.target.value)}}
      className={`mt-1.5 h-11 w-full min-w-0 max-w-full rounded-lg border px-3 text-base outline-none focus:border-[#f6b800] ${input}`}/></label>:null}
     {fields.map(f=><label key={f.key} className="min-w-0 text-xs font-semibold">{f.label}<input type="number" min="0" max={f.key==="annualKm"?"500000":undefined} step="any" value={values[f.key]}
      onChange={e=>update(f.key,e.target.value)} placeholder={f.hint} className={`mt-1.5 h-11 w-full min-w-0 max-w-full rounded-lg border px-3 text-base outline-none focus:border-[#f6b800] ${input}`}/></label>)}
    </div>
    {estimate?<div className="mt-4 grid grid-cols-1 gap-3 border-t border-current/10 pt-3 sm:grid-cols-3">
     <div><p className="text-[10px] opacity-65">Per year</p><strong className="mt-1 block break-words text-sm">{formatZar(estimate.annualTotal)}</strong></div>
     <div><p className="text-[10px] opacity-65">Per month</p><strong className="mt-1 block break-words text-sm">{formatZar(estimate.monthlyTotal)}</strong></div>
     <div><p className="text-[10px] opacity-65">Per km</p><strong className="mt-1 block break-words text-sm">{formatZar(estimate.costPerKm)}</strong></div>
     <p className="sm:col-span-3 border-t border-current/10 pt-2 text-[11px] leading-5 opacity-75">{electric?"Electricity":"Fuel"} {formatZar(estimate.annualFuel)} · Maintenance {formatZar(estimate.annualMaintenance)} · Other entered costs {formatZar(estimate.annualFixed)}</p>
    </div>:<p role="status" className="mt-4 text-xs leading-5 opacity-65">Enter annual distance{powered?electric?", energy use and electricity tariff":", fuel use and fuel price":""} to calculate ownership costs. Values must be non-negative and annual distance must not exceed 500,000 km. Missing optional costs count as zero.</p>}
    <p className="mt-3 text-[10px] leading-4 opacity-55">Excludes VAT, unexpected breakdowns and unentered costs. Finance must be interest only: including principal repayments and depreciation together would double-count vehicle capital costs.</p>
   </div> : null}
  </div>
 </section>;
}
