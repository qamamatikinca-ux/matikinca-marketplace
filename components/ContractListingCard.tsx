"use client";
import {useState} from "react";
import Link from "next/link";
import LoadLinkImage from "@/components/LoadLinkImage";
import ListingReportDialog from "@/components/ListingReportDialog";
import ContractApplicationDraft from "@/components/ContractApplicationDraft";

export type ContractListingRow={
 id:string;title?:string|null;city?:string|null;vehicle_group?:string|null;
 rate?:string|null;posted_by?:string|null;description?:string|null;photos?:string[]|null;
 created_at?:string|null;work_starts_at?:string|null;listing_kind?:string|null;
 contact_number?:string|null;whatsapp_number?:string|null;poster_photo?:string|null;
 status?:string|null;moderation_status?:string|null;
};
function field(description:string,label:string){
 const lines=description.split(/\r?\n/);
 for(const line of lines){const matched=line.match(/^([^:]{2,60}):\s*(.+)$/);if(matched?.[1]?.trim().toLowerCase()===label.toLowerCase())return matched[2].trim()}
 return "";
}
function relativeCreated(value:string|null|undefined){
 if(!value)return "Posted recently";
 const ms=new Date(value).getTime();
 if(!Number.isFinite(ms))return "Posted recently";
 const diff=Math.max(0,Date.now()-ms);
 if(diff<3600000)return "Posted recently";
 const days=Math.floor(diff/86400000);
 return days===0?"Posted today":days<30?`Posted ${days} day${days===1?"":"s"} ago`:new Date(ms).toLocaleDateString("en-ZA",{day:"numeric",month:"short",year:"numeric"});
}
function contractDescription(value:string|null|undefined){
 return String(value||"").split(/\r?\n/).filter(line=>!/^Listing type:|^Vehicle needed:|^Needed by:/i.test(line)).join("\n").trim();
}
function startLabel(value:string|null|undefined){
 if(!value)return "";
 const d=new Date(value);
 return Number.isFinite(d.getTime())?`Starts ${d.toLocaleDateString("en-ZA",{day:"numeric",month:"short",year:"numeric"})}`:"";
}
function formatRate(rate:string|null|undefined){
 const raw=String(rate||"").trim();
 if(!raw)return "Rate on request";
 if(/^\d+(?:\.\d{1,2})?$/.test(raw))return "R"+Number(raw).toLocaleString("en-ZA");
 return raw;
}
export default function ContractListingCard({row,darkMode,expandedDefault=false}:{row:ContractListingRow;darkMode:boolean;expandedDefault?:boolean}){
 const [reportOpen,setReportOpen]=useState(false);
 const [applyOpen,setApplyOpen]=useState(false);
 const [photo,setPhoto]=useState(0);
 const photos=row.photos||[];
 const requested=field(String(row.description||""),"Vehicle needed");
 const start=startLabel(row.work_starts_at||field(String(row.description||""),"Needed by"));
 const details=contractDescription(row.description);
 const shell=darkMode?"border-white/10 bg-[#0b0b0b]":"border-black/10 bg-white";
 async function share(){
  const url=window.location.origin+`/contracts/${row.id}`;
  try{if(navigator.share){await navigator.share({title:row.title||"LoadLink contract",url});return}
  await navigator.clipboard.writeText(url);window.dispatchEvent(new CustomEvent("loadlink:toast",{detail:{kind:"success",title:"Link copied",message:"Contract link copied to clipboard."}}))}
  catch{}
 }
 return <article data-listing-id={row.id} data-loadlink-unified-contract-card="true" className={`overflow-hidden rounded-[22px] border ${shell}`}>
  <div className="relative overflow-hidden bg-black">
   <Link href={`/contracts/${row.id}`} aria-label="Open contract details" className="block aspect-[4/3] overflow-hidden md:aspect-[16/9]">
    <LoadLinkImage src={photos[photo]||"/images/contracts-1.jpg"} alt={row.title||"Transport contract"} className="h-full w-full object-cover"/>
   </Link>
   {photos.length>1?<div className="absolute bottom-3 left-3 flex gap-2">
      <button type="button" onClick={()=>setPhoto(i=>(i+photos.length-1)%photos.length)} className="h-9 w-9 rounded-full bg-black/75 text-white" aria-label="Previous contract photo">‹</button>
      <button type="button" onClick={()=>setPhoto(i=>(i+1)%photos.length)} className="h-9 w-9 rounded-full bg-black/75 text-white" aria-label="Next contract photo">›</button>
    </div>:null}
   <span className="absolute bottom-3 right-3 rounded-full bg-black/75 px-3 py-1.5 text-xs font-black text-white">{photos.length||1} photo{photos.length===1?"":"s"}</span>
  </div>
  <div className="p-5 sm:p-6">
   <div className="flex min-w-0 items-start justify-between gap-3"><p className="min-w-0 text-[clamp(23px,5vw,30px)] font-black tracking-[-.035em]">{formatRate(row.rate)}</p><span className="shrink-0 rounded-full bg-[#269c58] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white">Contract</span></div>
   <div className="mt-3 flex flex-wrap gap-2">
    {row.vehicle_group?<span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase ${darkMode?"bg-white/10 text-white":"bg-[#eef2f8] text-[#263246]"}`}>{row.vehicle_group}</span>:null}
    {requested?<span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase ${darkMode?"bg-white/10 text-white":"bg-[#eef2f8] text-[#263246]"}`}>{requested}</span>:null}
    {start?<span className="rounded-full bg-[#fff2bf] px-3 py-1.5 text-[10px] font-black uppercase text-[#725300]">{start}</span>:null}
   </div>
   <h2 className="mt-4 break-words text-[clamp(21px,4.6vw,27px)] font-black leading-[1.18] tracking-[-.03em]">{row.title||"Logistics contract"}</h2>
   <p className={`mt-2 text-sm font-semibold ${darkMode?"text-white/60":"text-black/60"}`}>{[row.city,row.vehicle_group].filter(Boolean).join(" · ")||"South Africa"}</p>
   <p className={`mt-3 text-sm ${darkMode?"text-white/55":"text-black/55"}`}>Posted by <strong className={darkMode?"text-white":"text-black"}>{row.posted_by||"LoadLink user"}</strong> · {relativeCreated(row.created_at)}</p>
   <div className="mt-5 grid gap-2 sm:grid-cols-2"><button type="button" onClick={()=>setApplyOpen(true)} className="flex min-h-12 items-center justify-center rounded-xl bg-[#f6b800] px-4 text-sm font-black text-black">Apply with proposal</button><Link href={`/messages?listing=${encodeURIComponent(row.id)}`} className={`flex min-h-12 items-center justify-center rounded-xl border px-4 text-sm font-bold ${darkMode?"border-white/15":"border-black/15"}`}>Message poster</Link></div>
   <details open={expandedDefault?true:undefined} className={`mt-5 border ${darkMode?"border-white/10":"border-black/10"}`}>
    <summary className="cursor-pointer list-none px-4 py-4 text-sm font-black uppercase tracking-wide">View full details</summary>
    <div className={`border-t p-4 ${darkMode?"border-white/10":"border-black/10"}`}>
     {details?<p className={`whitespace-pre-wrap break-words text-sm leading-7 ${darkMode?"text-white/70":"text-black/65"}`}>{details}</p>:<p className="text-sm opacity-60">Contact the poster for the full contract requirements.</p>}
     <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <Link href={`/messages?listing=${encodeURIComponent(row.id)}`} className="flex min-h-12 items-center justify-center rounded-xl bg-[#f6b800] px-4 text-sm font-black text-black">Message on LoadLink</Link>
      {row.contact_number?<a href={`tel:${row.contact_number}`} className={`flex min-h-12 items-center justify-center rounded-xl border px-4 text-sm font-black ${darkMode?"border-white/15":"border-black/15"}`}>Call poster</a>:null}
     </div>
     {!expandedDefault?<Link href={`/contracts/${row.id}`} className="mt-4 inline-flex text-xs font-bold underline underline-offset-4">Open contract page</Link>:null}
    </div>
   </details>
   <div className={`mt-4 grid grid-cols-2 overflow-hidden border ${darkMode?"border-white/10":"border-black/10"}`}>
    <button type="button" onClick={()=>void share()} className={`flex min-h-12 items-center justify-center border-r text-xs font-black uppercase ${darkMode?"border-white/10":"border-black/10"}`}>Share</button>
    <button type="button" onClick={()=>setReportOpen(true)} className="min-h-12 text-xs font-black uppercase text-red-500">Report</button>
   </div>
  </div>
  {applyOpen?<ContractApplicationDraft listingId={row.id} title={row.title||"Transport contract"} city={row.city||""} rate={row.rate||""} vehicle={requested||row.vehicle_group||""} darkMode={darkMode} onClose={()=>setApplyOpen(false)}/>:null}
  {reportOpen?<ListingReportDialog listingId={row.id} title={row.title||"Contract"} darkMode={darkMode} onClose={()=>setReportOpen(false)}/>:null}
 </article>;
}
