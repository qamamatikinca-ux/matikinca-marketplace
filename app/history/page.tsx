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
   <nav data-loadlink-folder-tabs="v2619-fixed" aria-label="History sections" className="loadlink-folder-tabs grid min-w-0 grid-cols-3 gap-1 rounded-full bg-[#8585780d] p-1" role="tablist">
    {tabs.map(item=><button key={item.id} type="button" role="tab" aria-selected={tab===item.id} aria-controls={`history-panel-${item.id}`} onClick={()=>setTab(item.id)}
      className={`min-h-10 min-w-0 whitespace-nowrap rounded-full border-0 px-2 py-2.5 text-[11px] font-semibold transition-colors ${tab===item.id?"bg-[#f6b800] text-black":darkMode?"bg-transparent text-white/70":"bg-transparent text-black/65"}`}>
      {item.title}
    </button>)}
   </nav>
   <div id={`history-panel-${tab}`} className="mt-5" role="tabpanel" aria-label={`${tab} history`}>
    {tab==="driver"?<DriverHistoryOverview/>:<JobContractHistory kind={tab}/>}
   </div>
  </div>
 </main>;
}