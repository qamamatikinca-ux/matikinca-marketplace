"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import PosterTransportPriceGuide from "@/components/PosterTransportPriceGuide";
import {formatZar,type VehicleMarketRow,vehiclePriceSignal} from "@/lib/vehicleMarketGuide";

export default function SmartPriceAssistant({darkMode}:{darkMode:boolean}){
 const [open,setOpen]=useState(false);
 const [mode,setMode]=useState<"vehicle"|"job"|"contract">("vehicle");
 const [rows,setRows]=useState<VehicleMarketRow[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [make,setMake]=useState("");const [model,setModel]=useState("");const [year,setYear]=useState("");
 const [mileage,setMileage]=useState("");const [condition,setCondition]=useState("Good");const [asking,setAsking]=useState("");
 const [copied,setCopied]=useState("");
 useEffect(()=>{
  if(!open||mode!=="vehicle")return;
  let active=true;setLoading(true);
  fetch("/api/job-listings",{cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error("Price comparisons are currently unavailable");return r.json()})
   .then(data=>{if(active){setRows((data.rows||[]) as VehicleMarketRow[]);setError("")}})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:"Comparisons unavailable")})
   .finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[open,mode]);
 const signal=useMemo(()=>{
  if(!make.trim()||!model.trim()||!asking.trim()||!Number.isFinite(Number(asking))||Number(asking)<=0)return null;
  const placeholder:VehicleMarketRow={id:"new-valuation",listing_kind:"vehicle",description:`Listing type: Truck\nMake: ${make}\nModel: ${model}\nYear: ${year}\nCondition: ${condition}\nMileage: ${mileage}\nSale price: ${asking}`};
  return vehiclePriceSignal(rows,placeholder,{condition,mileage:mileage?Number(mileage):null,asking:Number(asking)});
 },[rows,make,model,year,mileage,condition,asking]);
 const frame=darkMode?"border-white/10 bg-[#121212] text-white":"border-black/10 bg-white text-black";
 const input=darkMode?"border-white/15 bg-[#222] text-white":"border-black/10 bg-[#fafafa] text-black";
 return <section className="mx-auto max-w-6xl px-4 pt-5 sm:px-6" aria-label="LoadLink smart pricing">
  <div className={`overflow-hidden rounded-[20px] border ${frame}`}>
   <button type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)} className="flex w-full items-center justify-between gap-3 p-4 text-left sm:px-6">
    <span className="flex min-w-0 items-center gap-3"><span className="rounded-lg bg-black px-2.5 py-2 text-[11px] font-black text-[#f6b800]">AI</span><span className="min-w-0">
     <strong className="block text-sm font-black">LoadLink Smart Pricing</strong>
     <span className="mt-0.5 block text-xs opacity-65">Vehicle value comparisons and transport rate guidance</span>
    </span></span>
    <span aria-hidden="true" className="text-xl font-bold">{open?"−":"+"}</span>
   </button>
   {open?<div className="border-t border-current/10 p-4 sm:p-6">
    <p className="mb-3 text-xs leading-5 opacity-65">Evidence-based price guidance: compares available LoadLink asking prices for vehicles and calculates job or contract rates from your entered costs. Not a guaranteed valuation or independent AI appraisal.</p>
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="What would you like to price?">
     {([{id:"vehicle",name:"Vehicle sale"},{id:"job",name:"Transport job"},{id:"contract",name:"Contract rate"}] as const).map(t=>
      <button key={t.id} type="button" aria-pressed={mode===t.id} onClick={()=>setMode(t.id)}
       className={`min-h-11 rounded-xl px-2 text-xs font-bold ${mode===t.id?"bg-[#f6b800] text-black":darkMode?"border border-white/15":"border border-black/10"}`}>{t.name}</button>)}
    </div>
    {mode==="vehicle"?<div className="mt-4">
     <div className="grid gap-3 sm:grid-cols-3">
      {([{label:"Make",value:make,set:setMake,placeholder:"e.g. Volvo"},{label:"Model",value:model,set:setModel,placeholder:"e.g. FH"},{label:"Year",value:year,set:setYear,placeholder:"e.g. 2022"},{label:"Mileage (km)",value:mileage,set:setMileage,placeholder:"e.g. 280000"},{label:"Asking price (R)",value:asking,set:setAsking,placeholder:"e.g. 850000"}] as const).map(f=>
       <label key={f.label} className="text-xs font-bold">{f.label}<input value={f.value} onChange={e=>f.set(e.target.value.slice(0,80))} placeholder={f.placeholder}
         inputMode={["Year","Mileage (km)","Asking price (R)"].includes(f.label)?"numeric":"text"}
         className={`mt-2 h-11 w-full rounded-xl border px-3 text-[16px] outline-none focus:border-[#f6b800] ${input}`}/></label>)}
      <label className="text-xs font-bold">Condition<select value={condition} onChange={e=>setCondition(e.target.value)} className={`mt-2 h-11 w-full rounded-xl border px-3 text-[16px] ${input}`}>
       {["Excellent","Good","Fair","Needs attention"].map(x=><option key={x}>{x}</option>)}</select></label>
     </div>
     {loading?<p className="mt-4 text-sm opacity-60">Checking active listings…</p>:error?<p role="alert" className="mt-4 text-xs text-red-600">{error}</p>:
       make.trim()&&model.trim()&&asking.trim()?
       signal?<div className={`mt-4 rounded-2xl border p-4 ${darkMode?"border-white/15 bg-white/[.03]":"border-black/10 bg-[#f7f7f4]"}`}>
        <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${signal.label==="Overpriced"?"bg-[#fff0d7] text-[#955b04]":"bg-[#def1e3] text-[#267746]"}`}>{signal.label}</span>
        <p className="mt-3 text-xs font-bold opacity-65">Indicative asking range</p>
        <p className="mt-1 text-xl font-black">{formatZar(signal.low)} – {formatZar(signal.high)}</p>
        <p className="mt-2 text-xs leading-5 opacity-65">Based on {signal.sampleSize} similar LoadLink asking prices. Adjusted for stated condition{mileage?", and mileage where available":""}. Actual selling prices and mechanical condition are not verified.</p>
       </div>:<p className="mt-4 text-xs opacity-65">Not enough matching LoadLink listings for a defensible price rating. Enter an exact make and model or use the full comparison tool.</p>:
       <p className="mt-4 text-xs opacity-65">Enter the vehicle details to check the current comparable listings.</p>}
     <Link href="/tools/vehicle-price-guide" className="mt-4 inline-flex text-xs font-bold underline underline-offset-4">Full commercial vehicle comparison</Link>
    </div>:
    <div className="mt-2">
     <PosterTransportPriceGuide key={mode} darkMode={darkMode} contract={mode==="contract"} initialExpanded onUseRate={value=>{
      void navigator.clipboard.writeText(value).then(()=>setCopied(value)).catch(()=>setCopied("Could not copy the rate"));
     }}/>
     {copied?<p role="status" className="mt-2 text-xs font-semibold">{copied.startsWith("Could")?copied:`Copied rate: ${copied}`}</p>:null}
    </div>}
   </div>:null}
  </div>
 </section>;
}
