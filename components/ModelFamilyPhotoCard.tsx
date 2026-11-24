"use client";

import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {modelFamilyPhoto} from "@/lib/modelFamilyPhoto";

type Props={
 kind:"truck"|"bakkie";make:string;model:string;year?:number;darkMode:boolean;compact?:boolean;
};
export default function ModelFamilyPhotoCard({kind,make,model,year,darkMode}:Props){
 const photo=modelFamilyPhoto(kind,make,model,year);
 const [unavailable,setUnavailable]=useState(false);
 const [expanded,setExpanded]=useState(false);
 useEffect(()=>{setUnavailable(false);setExpanded(false)},[photo?.src]);
 useEffect(()=>{
  if(!expanded)return;
  const handle=(event:KeyboardEvent)=>{if(event.key==="Escape")setExpanded(false)};
  document.addEventListener("keydown",handle);
  return()=>document.removeEventListener("keydown",handle);
 },[expanded]);
 if(!photo)return null;
 return <>
  <figure className={`min-w-0 overflow-hidden rounded-[19px] border ${darkMode?"border-white/10 bg-[#121212]":"border-black/10 bg-white"}`}>
   <div className="relative">
    {!unavailable?
      <button type="button" onClick={()=>setExpanded(true)} aria-label={`View larger photo of ${photo.name}`}
       className={`relative block aspect-[16/10] w-full overflow-hidden bg-[#eeeeec] text-left sm:aspect-[16/9] ${darkMode?"bg-[#1d1d1d]":""}`}>
       <img key={photo.src} src={photo.src} alt={`Model-family reference photograph of ${photo.name}`}
        loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setUnavailable(true)}
        className="h-full w-full object-cover object-center"/>
       <span className="absolute bottom-3 right-3 rounded-lg bg-black/75 px-3 py-2 text-[11px] font-bold text-white backdrop-blur-md">View larger</span>
      </button>
    :<div role="status" className="flex min-h-[200px] items-center justify-center px-4 text-center text-sm opacity-60">Model reference photo unavailable</div>}
   </div>
   <figcaption className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-4 py-3.5 sm:px-5">
    <div className="min-w-0">
     <p className="text-[10px] font-bold uppercase tracking-[.11em] opacity-55">Model reference photo</p>
     <h3 className="mt-1 text-[17px] font-extrabold leading-tight">{photo.name}</h3>
    </div>
    <p className="max-w-[350px] text-[11px] leading-5 opacity-60">{photo.caption}. Check the exact vehicle's year, trim and configuration before listing.</p>
   </figcaption>
  </figure>
  {expanded&&!unavailable&&typeof document!=="undefined"?createPortal(
   <div className="fixed inset-0 z-[2147483550] flex flex-col items-center justify-center bg-black/95 p-3 text-white" role="dialog" aria-modal="true" aria-label={`Model reference photo of ${photo.name}`}>
    <button type="button" className="absolute inset-0" aria-label="Close full-size photo" onClick={()=>setExpanded(false)}/>
    <div className="relative z-10 flex max-h-[90dvh] w-full max-w-5xl flex-col items-end">
     <button type="button" onClick={()=>setExpanded(false)} className="mb-3 flex h-11 items-center rounded-full border border-white/30 px-4 text-sm font-bold">Close ×</button>
     <img src={photo.src} alt={`Model-family reference photograph of ${photo.name}`} className="max-h-[72dvh] w-full rounded-xl object-contain" referrerPolicy="no-referrer"/>
     <p className="mt-3 self-start text-xs text-white/65">{photo.name} · {photo.caption}</p>
    </div>
   </div>,document.body):null}
 </>;
}
