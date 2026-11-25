"use client";
import {useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabaseClient";
import {formatZar} from "@/lib/vehicleMarketGuide";
import VehicleOwnershipEstimator from "@/components/VehicleOwnershipEstimator";
type Rec={available?:boolean;sample_count?:number;low_cents?:number;recommended_cents?:number;high_cents?:number;confidence?:string;reason?:string};
type Review={summary:string;checks:string[];priceCaution:string};
type Props={darkMode:boolean;category:string;make:string;model:string;year:number;condition:string;mileage:string;
 salePrice:string;offerMode:string;serviceHistory:string;accidentHistory:string;engineCondition:string;tyreCondition:string;
 roadworthy:string;description:string;fuelUse:string;onFuelUseChange?:(value:string)=>void;posting?:boolean};
export default function VehicleIntelligentPricingPanel(props:Props){
 const {darkMode,category,make,model,year,condition,mileage,salePrice,offerMode,serviceHistory,accidentHistory,engineCondition,tyreCondition,roadworthy,description,fuelUse,onFuelUseChange,posting=true}=props;
 const [market,setMarket]=useState<Rec|null>(null);
 const [checking,setChecking]=useState(false);
 const [marketError,setMarketError]=useState("");
 const [review,setReview]=useState<Review|null>(null);
 const [reviewing,setReviewing]=useState(false);
 const [reviewError,setReviewError]=useState("");
 const asking=useMemo(()=>{
  const value=Number(String(salePrice).replace(/[^0-9.]/g,""));return Number.isFinite(value)&&value>0?value:null;
 },[salePrice]);
 useEffect(()=>{
  let active=true;
  setMarket(null);setMarketError("");setReview(null);
  if(make.trim().length<2||model.trim().length<2||year<1970)return;
  const timer=setTimeout(async()=>{
   if(!active)return;
   setChecking(true);
   try{
    const {data,error}=await supabase.rpc("loadlink_vehicle_market_recommendation",{
      p_brand:make.trim(),p_model:model.trim(),p_year:year,p_condition:condition,
      p_odometer_km:mileage&&Number.isFinite(Number(mileage))?Number(mileage):null,
      p_body_type:null
    });
    if(error)throw error;
    if(active)setMarket(data as Rec);
   }catch{if(active)setMarketError("Market comparison is unavailable. Your listing details are unchanged.");}
   finally{if(active)setChecking(false);}
  },400);
  return()=>{active=false;clearTimeout(timer)};
 },[make,model,year,condition,mileage]);
 const hasSale=offerMode==="sale"||offerMode==="sale_or_rental";
 const hasData=Boolean(market?.available&&market.recommended_cents&&Number(market.sample_count)>=3);
 const suggested=(market?.recommended_cents||0)/100;
 const badge=hasData&&asking!==null?asking<suggested*.85?"Low price":asking>suggested*1.15?"Above comparison":"Within comparison":null;
 async function analyze(){
  if(reviewing||!make.trim()||!model.trim())return;
  setReviewing(true);setReviewError("");setReview(null);
  try{
   const result=await fetch("/api/loadlink-ai/vehicle-advice",{
    method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",
    body:JSON.stringify({make,model,year,condition,mileageKm:Number(mileage)||0,serviceHistory,accidentHistory,
      engineCondition,tyreCondition,roadworthy,description})
   });
   const d=await result.json();
   if(!result.ok)throw new Error(String(d.error||"Analysis unavailable."));
   setReview(d as Review);
  }catch(e){setReviewError(e instanceof Error?e.message:"Analysis could not finish.");}
  finally{setReviewing(false);}
 }
 return <div data-loadlink-intelligent-pricing="true" className="space-y-3">
  <section className={`overflow-hidden rounded-[20px] border ${darkMode?"border-[#f6b800]/45 bg-[#161513] text-white":"border-[#e9bc47] bg-[#fffaf0] text-[#171717]"}`}>
   <div className="flex items-center gap-3 border-b border-[#f6b800]/25 p-4 sm:px-5">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#101010] text-sm font-black text-[#f6b800]">AI</div>
    <div className="min-w-0 flex-1"><h3 className="text-base font-black">LoadLink Price Intelligence</h3><p className="mt-0.5 text-xs opacity-65">Market comparison · Vehicle condition · Cost evidence</p></div>
    <span className="shrink-0 rounded-lg bg-[#f6b800]/20 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#b88900]">BETA</span>
   </div>
   <div className="p-4 sm:p-5">
    {make&&model?<p className="text-sm font-semibold">{year} {make} {model} · {condition||"Condition not stated"}</p>:<p className="text-sm opacity-65">Select your make and model to check available evidence.</p>}
    {!hasSale?<p className="mt-3 text-xs leading-5 opacity-65">Market sale comparisons do not apply to rental-only or price-on-application listings.</p>:
      checking?<p role="status" className="mt-3 text-xs opacity-65">Checking approved comparable vehicles…</p>:
      marketError?<p role="status" className="mt-3 text-xs opacity-65">{marketError}</p>:
      hasData?<div className="mt-3">
       <div className="flex flex-wrap items-center gap-2">
        {badge?<span className="rounded-lg bg-[#f6b800] px-3 py-1.5 text-xs font-black text-black">{badge}</span>:null}
        <p className="text-xs opacity-70">Compared with {market?.sample_count} approved LoadLink listings</p>
       </div>
       <p className="mt-3 text-[11px] font-bold uppercase tracking-wide opacity-60">Adjusted comparable asking price</p>
       <p className="mt-1 text-2xl font-black">{formatZar(suggested)}</p>
       <p className="mt-1 text-xs opacity-70">Comparable range: {formatZar(Number(market?.low_cents||0)/100)} – {formatZar(Number(market?.high_cents||0)/100)}</p>
      </div>:<p role="status" className="mt-3 text-xs leading-5 opacity-70">No defensible market value yet. {market?.sample_count||0} comparable approved vehicle listings found; at least 3 are required. LoadLink will not invent a selling price.</p>}
    <p className="mt-3 text-[10px] leading-5 opacity-60">These are LoadLink asking-price comparisons, not completed sale values, independent dealer appraisals or live external market prices.</p>
    {posting?<div className="mt-4 border-t border-[#f6b800]/20 pt-4">
      <button type="button" onClick={()=>void analyze()} disabled={reviewing||!make||!model} className="min-h-10 rounded-xl border border-[#f6b800] px-4 text-xs font-black transition-colors hover:bg-[#f6b800]/10 disabled:opacity-45">
       {reviewing?"Analyzing…":"Check condition with LoadLink AI"}
      </button>
      {reviewError?<p role="status" className="mt-2 text-xs leading-5 opacity-70">{reviewError}</p>:null}
      {review?<div className="mt-3 space-y-2 text-xs leading-5">
       <p className="font-bold">{review.summary}</p>
       <ul className="list-disc space-y-1 pl-5">{review.checks.map((item,i)=><li key={i}>{item}</li>)}</ul>
       <p className="opacity-65">{review.priceCaution}</p>
      </div>:null}
     </div>:null}
   </div>
  </section>
  <VehicleOwnershipEstimator darkMode={darkMode} category={category} make={make} model={model} condition={condition}
    initialFuel={fuelUse} onFuelChange={onFuelUseChange} posting={posting}/>
 </div>;
}
