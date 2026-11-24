"use client";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {supabase} from "@/lib/supabaseClient";
import {loginHref} from "@/lib/auth";
import LoadLinkDocumentPreview from "@/components/LoadLinkDocumentPreview";

type Props={listingId:string;title:string;city:string;rate:string;vehicle:string;darkMode:boolean;onClose:()=>void;kind?:"job"|"contract"};

export default function ContractApplicationDraft({listingId,title,city,rate,vehicle,darkMode,onClose,kind="contract"}:Props){
 const [name,setName]=useState("");
 const [company,setCompany]=useState("");
 const [email,setEmail]=useState("");
 const [phone,setPhone]=useState("");
 const [area,setArea]=useState("");
 const [identityLoaded,setIdentityLoaded]=useState(false);
 const [offer,setOffer]=useState("");
 const [message,setMessage]=useState("");
 const [customDraft,setCustomDraft]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const [preview,setPreview]=useState(false);
 useEffect(()=>{
  let mounted=true;
  void(async()=>{
   try{
    const {data:{user}}=await supabase.auth.getUser();
    if(!mounted||!user)return;
    const {data}=await supabase.from("profiles").select("full_name,company_name,email,phone,city,province").eq("id",user.id).maybeSingle();
    if(!mounted)return;
    setName(String(data?.full_name||user.user_metadata?.full_name||user.user_metadata?.name||"").trim());
    setCompany(String(data?.company_name||"").trim());
    setEmail(String(data?.email||user.email||"").trim());
    setPhone(String(data?.phone||"").trim());
    setArea([data?.city,data?.province].filter(Boolean).join(", "));
   }finally{if(mounted)setIdentityLoaded(true)}
  })();
  return()=>{mounted=false};
 },[]);
 const proposal=[
  "LOADLINK APPLICATION",
  `${kind==="job"?"Job":"Contract"}: ${title}`,
  city?`Location: ${city}`:"",
  vehicle?`Requested vehicle: ${vehicle}`:"",
  rate?`Advertised rate: ${rate}`:"",
  "",
  `Applicant: ${name||"LoadLink member"}`,
  company?`Company: ${company}`:"",
  email?`Email: ${email}`:"",
  phone?`Contact: ${phone}`:"",
  area?`Operating area: ${area}`:"",
  offer.trim()?`Proposed rate: ${offer.trim()}`:"",
  "",
  `Hello, I would like to apply for this ${kind==="job"?"job":"contract"} through LoadLink.`,
  message.trim()?message.trim():"Please let me know the next steps and any supporting documents needed.",
  "",
  "Subject to the poster's acceptance and agreed terms.",
 ].filter(Boolean).join("\n");
 const prepared=customDraft??proposal;
 function continueToMessages(){
  if(busy||!prepared.trim())return;
  setBusy(true);
  void supabase.auth.getUser().then(({data:{user}})=>{
   const href=`/messages?listing=${encodeURIComponent(listingId)}&draft=${encodeURIComponent(prepared.slice(0,3400))}`;
   if(!user){window.location.assign(loginHref(href));return;}
   window.location.assign(href);
  }).finally(()=>setBusy(false));
 }
 const inputClass=`mt-2 h-11 w-full rounded-xl border px-3 text-base outline-none focus:border-[#e5b52b] ${darkMode?"border-white/20 bg-[#222] text-white":"border-[#dedede] bg-white text-black"}`;
 return typeof document!=="undefined"?createPortal(
  <div role="dialog" aria-modal="true" aria-labelledby="loadlink-apply-heading" className="fixed inset-0 z-[2147483590] flex items-center justify-center bg-black/65 px-3 py-4 backdrop-blur-[3px]" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
   <section className={`flex max-h-[min(88dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-[22px] border shadow-[0_24px_72px_rgba(0,0,0,.28)] ${darkMode?"border-white/15 bg-[#111] text-white":"border-black/10 bg-white text-[#141414]"}`}>
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-current/10 px-5 py-4">
     <div className="min-w-0"><h2 id="loadlink-apply-heading" className="text-[21px] font-black tracking-tight">Apply with LoadLink profile</h2>
      <p className="mt-1 text-xs opacity-60">Review your prepared proposal</p></div>
     <button type="button" onClick={onClose} aria-label="Close application" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-current/15 text-xl">×</button>
    </header>
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
     <div className={`rounded-xl border px-4 py-3 ${darkMode?"border-white/10 bg-white/[.04]":"border-black/10 bg-[#f8f8f7]"}`}>
      <p className="line-clamp-2 text-[14px] font-bold leading-5">{title}</p>
      <p className="mt-1 text-xs opacity-60">{city||"South Africa"}{vehicle?` · ${vehicle}`:""}</p>
     </div>
     <div className="flex items-center justify-between gap-3">
      <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide opacity-50">Your LoadLink profile</p>
       <p className="mt-1 truncate text-sm font-semibold">{name||"Your account"}{company?` · ${company}`:""}</p>
       {(email||phone)?<p className="mt-1 truncate text-[11px] opacity-60">{[email,phone].filter(Boolean).join(" · ")}</p>:null}</div>
      <span className={`shrink-0 text-xs ${identityLoaded?"opacity-60":"opacity-40"}`}>{identityLoaded?"Prefilled":"Loading…"}</span>
     </div>
     <label className="block text-xs font-bold">Your offer <span className="font-normal opacity-55">(optional)</span>
      <input className={inputClass} value={offer} onChange={e=>{setOffer(e.target.value.slice(0,100));setCustomDraft(null)}} placeholder="e.g. R28/km or R20 000" />
     </label>
     <label className="block text-xs font-bold">Message <span className="font-normal opacity-55">(optional)</span>
      <textarea value={message} onChange={e=>{setMessage(e.target.value.slice(0,600));setCustomDraft(null)}} rows={2} placeholder="Availability, fleet suitability or conditions…" className={`mt-2 min-h-20 w-full resize-y rounded-xl border p-3 text-[14px] leading-5 outline-none focus:border-[#e5b52b] ${darkMode?"border-white/20 bg-[#222] text-white":"border-[#dedede] bg-white text-black"}`}/>
     </label>
     <div className={`overflow-hidden rounded-xl border ${darkMode?"border-white/15":"border-black/10"}`}>
      <button type="button" onClick={()=>setPreview(v=>!v)} aria-expanded={preview} className="flex min-h-11 w-full items-center justify-between px-3 text-left text-xs font-bold">Preview and edit proposal <span>{preview?"−":"+"}</span></button>
      {preview?<div className="space-y-3 border-t border-current/10 p-3">
        <LoadLinkDocumentPreview darkMode={darkMode} documentType={kind==="job"?"Job application":"Contract application"} route={title} clientName={title} vehicle={vehicle} body={prepared} compact/>
        <label className="block text-xs font-bold">Edit application text
          <textarea aria-label="Edit application document" rows={6} value={prepared} onChange={e=>setCustomDraft(e.target.value)} maxLength={3400} className={`mt-2 w-full resize-y rounded-lg border p-3 font-mono text-[12px] leading-5 ${darkMode?"border-white/15 bg-[#181818]":"border-black/10 bg-[#fafafa]"}`}/>
        </label>
       </div>:null}
     </div>
     <p className="text-[11px] leading-5 opacity-55">The branded PDF can be downloaded from the preview. You approve the message in LoadLink Messages; private documents are never attached without your permission.</p>
    </div>
    <footer className="grid shrink-0 grid-cols-[1fr_1.45fr] gap-2 border-t border-current/10 p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
     <button type="button" onClick={onClose} className="min-h-12 rounded-xl border border-current/15 text-sm font-semibold">Cancel</button>
     <button type="button" disabled={busy||!prepared.trim()} onClick={continueToMessages} className="min-h-12 rounded-xl bg-[#f6b800] px-3 text-sm font-bold text-black disabled:opacity-40">{busy?"Opening…":"Continue"}</button>
    </footer>
   </section>
  </div>,document.body):null;
}
