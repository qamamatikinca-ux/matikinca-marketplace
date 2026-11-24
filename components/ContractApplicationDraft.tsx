"use client";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {supabase} from "@/lib/supabaseClient";
import {loginHref} from "@/lib/auth";

type Props={listingId:string;title:string;city:string;rate:string;vehicle:string;darkMode:boolean;onClose:()=>void};
export default function ContractApplicationDraft({listingId,title,city,rate,vehicle,darkMode,onClose}:Props){
 const [business,setBusiness]=useState("");
 const [name,setName]=useState("");
 const [vehicleOffered,setVehicleOffered]=useState("");
 const [proposedRate,setProposedRate]=useState("");
 const [note,setNote]=useState("");
 const [draft,setDraft]=useState("");
 const [edited,setEdited]=useState(false);
 const [saving,setSaving]=useState(false);
 useEffect(()=>{
  let alive=true;
  void(async()=>{
   const {data:{user}}=await supabase.auth.getUser();
   if(!alive||!user)return;
   const {data}=await supabase.from("profiles").select("full_name,company_name").eq("id",user.id).maybeSingle();
   if(!alive)return;
   setName(String(data?.full_name||user.user_metadata?.full_name||"").trim());
   setBusiness(String(data?.company_name||"").trim());
  })();
  return()=>{alive=false};
 },[]);
 const generated=[
  "LOADLINK | TRANSPORT CONTRACT PROPOSAL",
  `Contract: ${title}`,
  city?`Operating area: ${city}`:"",
  vehicle?`Vehicle required: ${vehicle}`:"",
  rate?`Advertised terms: ${rate}`:"",
  "",
  `Applicant: ${name||"Your name"}`,
  business?`Company: ${business}`:"",
  vehicleOffered?`Vehicle / capacity offered: ${vehicleOffered}`:"",
  proposedRate?`Proposed rate: ${proposedRate}`:"Rate: To be confirmed",
  "",
  `Hello, I would like to apply for this transport contract on LoadLink. ${note||"Please consider our available transport capacity and let us know the next steps."}`,
  "Please confirm the route, volume, term, payment schedule and compliance documents required.",
  "",
  "This proposal is subject to your acceptance and agreed written terms.",
 ].filter((line,index)=>line!==""||index===5).join("\n");
 const content=edited?draft:generated;
 function proceed(){
  if(saving)return;
  setSaving(true);
  void supabase.auth.getUser().then(({data:{user}})=>{
   if(!user){window.location.assign(loginHref(`/messages?listing=${encodeURIComponent(listingId)}`));return}
   window.location.assign(`/messages?listing=${encodeURIComponent(listingId)}&draft=${encodeURIComponent(content.slice(0,3400))}`);
  }).finally(()=>setSaving(false));
 }
 return typeof document!=="undefined"?createPortal(
  <div role="dialog" aria-modal="true" aria-labelledby="loadlink-contract-application-title" className="fixed inset-0 z-[2147483590] flex items-center justify-center overflow-y-auto bg-black/65 p-3 backdrop-blur-sm">
   <section className={`flex max-h-[min(88dvh,730px)] w-full max-w-xl flex-col overflow-hidden rounded-[23px] border shadow-2xl ${darkMode?"border-white/15 bg-[#111] text-white":"border-black/10 bg-white text-black"}`}>
    <header className="flex shrink-0 items-start justify-between border-b border-current/10 p-4 sm:p-5">
     <div><p className="text-[10px] font-black uppercase tracking-wider text-[#b88600]">LoadLink contract application</p>
      <h2 id="loadlink-contract-application-title" className="mt-1 text-xl font-black">Prepared proposal</h2></div>
     <button type="button" aria-label="Close" onClick={onClose} className="h-10 w-10 rounded-full border border-current/15 text-xl">×</button>
    </header>
    <div className="min-h-0 space-y-3 overflow-y-auto p-4 sm:p-5">
     <p className="text-xs leading-5 opacity-65">A suggested application is prepared using the advertised contract. Review it before submitting; no message is sent automatically.</p>
     <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-bold">Your name<input value={name} onChange={e=>setName(e.target.value)} maxLength={100} className="mt-1 h-11 w-full rounded-lg border border-current/15 bg-transparent px-3 text-sm"/></label>
      <label className="text-xs font-bold">Company (optional)<input value={business} onChange={e=>setBusiness(e.target.value)} maxLength={120} className="mt-1 h-11 w-full rounded-lg border border-current/15 bg-transparent px-3 text-sm"/></label>
      <label className="text-xs font-bold">Truck / trailer available<input value={vehicleOffered} onChange={e=>setVehicleOffered(e.target.value)} maxLength={160} placeholder="e.g. 34t side tipper" className="mt-1 h-11 w-full rounded-lg border border-current/15 bg-transparent px-3 text-sm"/></label>
      <label className="text-xs font-bold">Your rate (optional)<input value={proposedRate} onChange={e=>setProposedRate(e.target.value)} maxLength={80} placeholder="e.g. R28/km excl. VAT" className="mt-1 h-11 w-full rounded-lg border border-current/15 bg-transparent px-3 text-sm"/></label>
     </div>
     <label className="block text-xs font-bold">Why your fleet is suitable<textarea rows={2} value={note} onChange={e=>setNote(e.target.value)} maxLength={500} className="mt-1 w-full rounded-lg border border-current/15 bg-transparent p-3 text-sm" placeholder="Availability, experience, compliance…"/></label>
     <label className="block text-xs font-bold">Review application document
      <textarea aria-label="Editable contract application" rows={8} value={content} onChange={e=>{setEdited(true);setDraft(e.target.value)}} maxLength={3500} className="mt-1 w-full resize-y rounded-lg border border-current/15 bg-transparent p-3 font-mono text-xs leading-5"/>
     </label>
     <p className="text-[11px] opacity-60">The poster receives your proposal only when you send it in LoadLink Messages. This does not guarantee a contract award.</p>
    </div>
    <footer className="grid shrink-0 grid-cols-[1fr_1.6fr] gap-2 border-t border-current/10 p-3 sm:p-4">
     <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-current/15 text-xs font-bold">Cancel</button>
     <button type="button" disabled={!content.trim()||saving} onClick={proceed} className="min-h-11 rounded-xl bg-[#f6b800] px-3 text-xs font-black text-black disabled:opacity-45">{saving?"Opening…":"Continue to Messages"}</button>
    </footer>
   </section>
  </div>,document.body):null;
}
