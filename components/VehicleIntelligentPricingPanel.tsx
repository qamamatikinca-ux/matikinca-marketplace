"use client";
import {useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabaseClient";
import {formatZar} from "@/lib/vehicleMarketGuide";

type Rec={available?:boolean;sample_count?:number;low_cents?:number;recommended_cents?:number;high_cents?:number};
type Props={darkMode:boolean;category:string;make:string;model:string;year:number;condition:string;mileage:string;
 salePrice:string;offerMode:string;serviceHistory:string;accidentHistory:string;engineCondition:string;tyreCondition:string;
 roadworthy:string;description:string;fuelUse:string;onFuelUseChange?:(value:string)=>void;posting?:boolean};

/** Opt-in comparison using approved LoadLink asking prices, not an AI appraisal. */
export default function VehicleIntelligentPricingPanel({
 darkMode,make,model,year,condition,mileage,salePrice,offerMode
}:Props){
 const [open,setOpen]=useState(false);
 const [market,setMarket]=useState<Rec|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const asking=useMemo(()=>{
  const n=Number(String(salePrice).replace(/[^0-9.]/g,""));
  return Number.isFinite(n)&&n>0?n:null;
 },[salePrice]);
 const sale=offerMode==="sale"||offerMode==="sale_or_rental";
 const ready=make.trim().length>=2&&model.trim().length>=2&&Number.isInteger(year)&&year>=1970;
 useEffect(()=>{
  let active=true;
  setMarket(null);setError("");
  if(!open||!sale||!ready){setLoading(false);return;}
  const timer=window.setTimeout(async()=>{
   if(!active)return;
   setLoading(true);
   try{
    const {data,error:requestError}=await supabase.rpc("loadlink_vehicle_market_recommendation",{
     p_brand:make.trim(),p_model:model.trim(),p_year:year,p_condition:condition,
     p_odometer_km:mileage&&Number.isFinite(Number(mileage))?Number(mileage):null,
     p_body_type:null
    });
    if(requestError)throw requestError;
    if(active)setMarket((data||null) as Rec|null);
   }catch{
    if(active)setError("Price comparisons are unavailable at the moment.");
   }finally{if(active)setLoading(false);}
  },350);
  return()=>{active=false;window.clearTimeout(timer)};
 },[open,sale,ready,make,model,year,condition,mileage]);
 const supported=Boolean(market?.available&&Number(market.sample_count)>=3&&market.recommended_cents);
 const expected=Number(market?.recommended_cents||0)/100;
 const comparison=supported&&asking!==null?(asking<expected*.85?"Below comparable asking prices":asking>expected*1.15?"Above comparable asking prices":"Within comparable asking prices"):null;
 return <section data-loadlink-market-guide="true" className="min-w-0">
  <button type="button" aria-expanded={open} aria-controls="loadlink-vehicle-price-comparison" onClick={()=>setOpen(current=>!current)}
   className="flex min-h-14 w-full min-w-0 items-center gap-3 rounded-full border border-[#b99748] bg-[#18140e] px-3.5 py-3 text-left text-white shadow-sm transition-colors hover:bg-[#242016] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6b800] sm:px-5">
   <span className="shrink-0 rounded-lg bg-[#f6b800] px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-black">Guide</span>
   <span className="min-w-0 flex-1 truncate text-[13px] font-bold sm:text-sm">Compare LoadLink vehicle prices</span>
   <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f6b800] text-lg font-semibold leading-none text-black">{open?"−":"+"}</span>
  </button>
  {open?<div id="loadlink-vehicle-price-comparison"
    className={"mx-2 mt-2 rounded-xl border px-4 py-3 text-sm leading-6 "+(darkMode?"border-white/15 bg-[#181818] text-white":"border-black/10 bg-white text-[#171717]")}>
    {!sale?<p>This guide compares sale prices only. Rental rates are not included.</p>:
      !ready?<p>Choose a make, model and year above to compare similar vehicles.</p>:
      loading?<p role="status">Checking available LoadLink listings…</p>:
      error?<p role="status">{error}</p>:
      supported?<div className="space-y-1">
       <p className="font-bold">{formatZar(expected)} <span className="text-xs font-normal opacity-70">adjusted comparable asking price</span></p>
       <p className="text-xs opacity-75">{market?.sample_count} comparable approved listings{comparison?" · "+comparison:""}.</p>
       <p className="text-xs opacity-65">These are seller asking prices, not verified sale values or a guaranteed valuation.</p>
      </div>:
      <p role="status">Not enough matching LoadLink sale listings to compare prices reliably. At least three are needed.</p>}
  </div>:null}
 </section>;
}
