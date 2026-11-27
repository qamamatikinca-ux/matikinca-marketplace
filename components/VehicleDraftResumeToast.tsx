"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { clearVehicleDraft, hasVehicleDraft, readVehicleDraft, readVehicleWizardStep, scopeVehicleDraft, vehicleDraftHref, type VehicleDraft } from "@/lib/vehicleDraft";
import LoadLinkIcon from "@/components/LoadLinkIcon";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

const dismissKey=(owner:string)=>`loadlink:dismissed-vehicle-resume:${owner}`;
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Africa/Johannesburg",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
// Do not use updatedAt: every keystroke would re-arm a dismissed reminder.
function draftIdentity(draft:VehicleDraft,step:number){
 return [draft.submissionId||"",draft.vehicleCategory||"",draft.brand||"",draft.modelName||"",step].join(":");
}
function wasDismissed(owner:string,identity:string){
 try{return localStorage.getItem(dismissKey(owner))===`${today()}:${identity}`}catch{return false}
}
export default function VehicleDraftResumeToast(){
 const {darkMode}=useLoadLinkTheme();
 const pathname=usePathname(),router=useRouter();
 const [visible,setVisible]=useState<{owner:string;draft:VehicleDraft;step:number}|null>(null);
 useEffect(()=>{
  // Home is the only place for this non-blocking reminder. Navigation clears
  // the card immediately; entering Home again rechecks the current draft.
  if(pathname!=="/"){
   const clear=window.setTimeout(()=>setVisible(null),0);
   return()=>window.clearTimeout(clear);
  }
  let alive=true;
  let pending:number|null=null;
  const queue=(owner:string)=>{
   if(pending!==null)window.clearTimeout(pending);
   if(!owner){setVisible(null);return}
   scopeVehicleDraft(owner);
   const draft=readVehicleDraft(owner);
   if(!hasVehicleDraft(draft)){setVisible(null);return}
   const step=readVehicleWizardStep(owner,String(draft?.submissionId||""));
   if(wasDismissed(owner,draftIdentity(draft!,step))){setVisible(null);return}
   // Keep the homepage immediately usable. On every new visit the reminder
   // is eligible again unless the user explicitly dismissed this draft today.
   pending=window.setTimeout(()=>{
    if(alive&&!document.hidden)setVisible({owner,draft:draft!,step});
   },1800);
  };
  const check=()=>{void supabase.auth.getUser().then(({data})=>{
   if(alive)queue(data.user?.id||"");
  }).catch(()=>{if(alive)setVisible(null)})};
  check();
  const refresh=()=>{if(!document.hidden)check()};
  window.addEventListener("focus",refresh);
  window.addEventListener("pageshow",refresh);
  window.addEventListener("loadlink-vehicle-draft-changed",refresh);
  document.addEventListener("visibilitychange",refresh);
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
   if(event==="SIGNED_OUT")window.setTimeout(()=>{if(alive)queue("")},0);
   if(event==="SIGNED_IN"||event==="INITIAL_SESSION")window.setTimeout(()=>{if(alive)queue(session?.user.id||"")},0);
  });
  return()=>{
   alive=false;
   if(pending!==null)window.clearTimeout(pending);
   window.removeEventListener("focus",refresh);
   window.removeEventListener("pageshow",refresh);
   window.removeEventListener("loadlink-vehicle-draft-changed",refresh);
   document.removeEventListener("visibilitychange",refresh);
   subscription.unsubscribe();
  };
 },[pathname]);
 const dismiss=()=>{
  if(!visible)return;
  try{localStorage.setItem(dismissKey(visible.owner),`${today()}:${draftIdentity(visible.draft,visible.step)}`)}catch{}
  setVisible(null);
 };
 if(pathname!=="/"||!visible)return null;
 const {draft,step}=visible;
 const categoryNames:Record<string,string>={truck:"Truck",bakkie_van:"Bakkie / van",trailer:"Trailer",mobile_unit:"Mobile unit"};
 const category=categoryNames[String(draft.vehicleCategory||"")]||"Vehicle";
 const identity=[draft.year&&Number(draft.year)>1970?draft.year:null,draft.brand,draft.modelName].filter(Boolean).map(String).join(" ");
 const stages=["Vehicle type","Vehicle details","Photos & documents","Review"];
 const updated=typeof draft.updatedAt==="number"&&Number.isFinite(draft.updatedAt)
  ? new Date(draft.updatedAt).toLocaleString("en-ZA",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})
  : "Saved on this device";
 return (
  <aside role="status" aria-label="Continue unfinished vehicle listing" aria-live="polite"
   className={`fixed bottom-[max(96px,env(safe-area-inset-bottom))] left-3 right-3 z-[950] mx-auto max-w-[390px] rounded-xl border p-3 shadow-[0_8px_22px_rgba(0,0,0,.12)] ${darkMode?"border-white/15 bg-[#181818] text-white":"border-black/10 bg-white text-black"}`}>
   <div className="flex items-start gap-3">
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${darkMode?"bg-white/10":"bg-[#f3f3f3]"}`}><LoadLinkIcon name="truck" size={18}/></span>
    <div className="min-w-0 flex-1">
     <p className="text-sm font-semibold">Continue your vehicle listing</p>
     <p className="mt-0.5 truncate text-xs font-medium">{identity||String(draft.title||category)}</p>
     <p className="mt-1 text-[11px] opacity-60">{category} · Step {step+1} of 4 · {stages[step]}</p>
     <p className="mt-0.5 text-[11px] opacity-50">Saved {updated}</p>
    </div>
    <button type="button" onClick={dismiss} aria-label="Dismiss saved listing reminder"
     className="grid h-9 w-9 shrink-0 place-items-center rounded-lg opacity-65"><LoadLinkIcon name="close" size={18}/></button>
   </div>
   <div className="mt-3 grid grid-cols-2 gap-2">
    <button type="button" onClick={()=>{clearVehicleDraft(visible.owner);setVisible(null);router.push("/list-your-vehicle?entry=vehicle#listing-form")}}
     className={`min-h-10 rounded-lg border px-3 text-xs font-semibold ${darkMode?"border-white/20":"border-black/15"}`}>Start fresh</button>
    <button type="button" onClick={()=>{router.push(vehicleDraftHref(draft));dismiss()}}
     className="min-h-10 rounded-lg bg-[#f6b800] px-3 text-xs font-semibold text-black">Keep editing</button>
   </div>
  </aside>
 );
}
