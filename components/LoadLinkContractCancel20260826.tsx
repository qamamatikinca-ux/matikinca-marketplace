"use client";
import {useState} from "react";
import {createPortal} from "react-dom";

const DRAFT_PREFIX="loadlink-contract-draft-v20260823";
export default function LoadLinkContractCancel20260826({darkMode}:{darkMode:boolean}){
 const [open,setOpen]=useState(false);
 function clearContractDraft(){
  try{
   const keys=Array.from({length:localStorage.length},(_,index)=>localStorage.key(index)).filter(Boolean) as string[];
   keys.filter(key=>key===DRAFT_PREFIX||key.startsWith(`${DRAFT_PREFIX}:`)).forEach(key=>localStorage.removeItem(key));
  }catch{}
  window.location.assign("/contracts");
 }
 return <>
  <button type="button" onClick={()=>setOpen(true)}
   className={`h-12 rounded-[16px] border px-4 text-xs font-bold ${darkMode?"border-white/14 bg-white/[.025] text-white/70":"border-black/12 bg-white/30 text-black/65"}`}>Cancel</button>
  {open && typeof document!=="undefined"?createPortal(
   <div className="fixed inset-0 z-[2147483500] flex items-center justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-[6px]"
    role="dialog" aria-modal="true" aria-label="Cancel contract listing">
    <section className={`w-full max-w-md rounded-[26px] border p-5 shadow-2xl ${darkMode?"border-white/12 bg-[#101010] text-white":"border-black/10 bg-white text-black"}`}>
     <p className="text-[10px] font-black uppercase tracking-[.12em] opacity-45">Listing draft</p>
     <h2 className="mt-2 text-2xl font-black tracking-[-.035em]">Cancel contract listing?</h2>
     <p className="mt-2 text-sm font-medium leading-6 opacity-60">Your draft will be cleared from this device. Nothing will be published.</p>
     <div className="mt-5 grid grid-cols-2 gap-2">
      <button type="button" onClick={()=>setOpen(false)} className={`min-h-12 rounded-[15px] border px-3 text-sm font-bold ${darkMode?"border-white/14 bg-white/[.035]":"border-black/10 bg-black/[.025]"}`}>Keep editing</button>
      <button type="button" onClick={clearContractDraft} className="min-h-12 rounded-[15px] bg-[#f6b800] px-3 text-sm font-black text-black">Cancel listing</button>
     </div>
    </section>
   </div>,document.body):null}
 </>;
}
