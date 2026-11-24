"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useParams} from "next/navigation";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import ContractListingCard,{type ContractListingRow} from "@/components/ContractListingCard";
import {useLoadLinkTheme} from "@/lib/useLoadLinkTheme";

export default function ContractDetailPage(){
 const params=useParams<{id:string}>();
 const id=String(params?.id||"");
 const {darkMode,toggleTheme}=useLoadLinkTheme();
 const [row,setRow]=useState<ContractListingRow|null>(null);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  let active=true;
  fetch(`/api/job-listings?t=${Date.now()}`,{cache:"no-store"})
   .then(async response=>{if(!response.ok)throw new Error("Unable to load contract");return response.json()})
   .then(data=>{
     if(!active)return;
     const match=((data.rows||[]) as ContractListingRow[]).find(x=>x.id===id
      &&(String(x.listing_kind||"")==="contract"||/^Listing type:\s*Contract/im.test(String(x.description||"")))
      &&(!x.status||x.status==="active")&&(!x.moderation_status||x.moderation_status==="approved"));
     setRow(match||null);
   }).catch(()=>{if(active)setRow(null)}).finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[id]);
 return <main className={`min-h-screen ${darkMode?"bg-black text-white":"bg-[#f8f8f7] text-black"}`}>
  <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme}/>
  <section className="mx-auto max-w-4xl px-4 pb-20 pt-5 sm:px-6">
   <Link href="/contracts" className={`mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold ${darkMode?"border-white/15":"border-black/10 bg-white"}`}>
    <span aria-hidden="true">←</span> Back to contracts
   </Link>
   {loading?<div className="h-80 animate-pulse rounded-2xl bg-black/10"/>:!row?
    <div className="rounded-2xl border border-current/10 p-6"><h1 className="text-2xl font-black">Contract unavailable</h1>
     <p className="mt-2 text-sm opacity-60">This contract may have been removed or closed.</p></div>:
    <ContractListingCard row={row} darkMode={darkMode} expandedDefault/>}
  </section>
 </main>;
}
