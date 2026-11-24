"use client";
import {useEffect,useState} from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import {useLoadLinkTheme} from "@/lib/useLoadLinkTheme";
import JobContractHistory from "@/components/history/JobContractHistory";
import DriverHistoryOverview from "@/components/history/DriverHistoryOverview";

type Tab="job"|"contract"|"driver";
export default function HistoryPage(){
 const {darkMode,toggleTheme}=useLoadLinkTheme();
 const [tab,setTab]=useState<Tab>("job");
 useEffect(()=>{
  if(["#driver-records","#driver-assignments","#driver-history"].includes(window.location.hash))setTab("driver");
  else if(window.location.hash==="#contracts")setTab("contract");
 },[]);
 const tabs=[{id:"job",title:"Jobs"},{id:"contract",title:"Contracts"},{id:"driver",title:"Drivers"}] as const;
 return <main className={`min-h-screen ${darkMode?"bg-black text-white":"bg-[#f8f8f7] text-black"}`}>
  <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme}/>
  <div className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6">
   <header className="mb-6">
    <h1 className="text-4xl font-black tracking-[-.05em] sm:text-5xl">History</h1>
    <p className="mt-2 text-sm opacity-65">Your completed LoadLink jobs, contracts and driver records.</p>
   </header>
   <nav data-loadlink-folder-tabs="v2619-fixed" aria-label="History sections" className="loadlink-folder-tabs grid min-w-0 grid-cols-3 gap-2" role="tablist">
    {tabs.map(item=><button key={item.id} type="button" role="tab" aria-selected={tab===item.id} onClick={()=>setTab(item.id)}
      className={`min-w-0 whitespace-nowrap rounded-xl border px-2 py-3 text-xs font-black transition ${tab===item.id?"border-[#f6b800] bg-[#f6b800] text-black shadow-sm":darkMode?"border-white/12 bg-[#0b0b0b] text-white/75":"border-black/10 bg-white text-black/65"}`}>
      {item.title}
    </button>)}
   </nav>
   <div className="mt-5" role="region" aria-label={`${tab} history`}>
    {tab==="driver"?<DriverHistoryOverview/>:<JobContractHistory kind={tab}/>}
   </div>
  </div>
 </main>;
}