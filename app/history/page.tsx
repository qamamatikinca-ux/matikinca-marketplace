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
   <nav aria-label="History sections" className={`grid grid-cols-3 gap-1 rounded-[16px] border p-1 ${darkMode?"border-white/15 bg-[#101010]":"border-black/10 bg-white"}`}>
    {tabs.map(item=><button key={item.id} type="button" onClick={()=>setTab(item.id)} aria-current={tab===item.id?"page":undefined}
      className={`min-h-12 rounded-xl px-2 text-sm font-bold transition-colors ${tab===item.id?"bg-[#f6b800] text-black":darkMode?"text-white/75 hover:bg-white/10":"text-black/60 hover:bg-black/5"}`}>
      {item.title}
    </button>)}
   </nav>
   <div className="mt-5" role="region" aria-label={`${tab} history`}>
    {tab==="driver"?<DriverHistoryOverview/>:<JobContractHistory kind={tab}/>}
   </div>
  </div>
 </main>;
}