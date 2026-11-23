"use client";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import {useLoadLinkTheme} from "@/lib/useLoadLinkTheme";
import DriverHistory from "@/components/history/DriverHistory";
import JobContractHistory from "@/components/history/JobContractHistory";

export default function HistoryPage(){
 const {darkMode,toggleTheme}=useLoadLinkTheme();
 return <main className={`min-h-screen ${darkMode?"bg-black text-white":"bg-[#f8f8f7] text-black"}`}>
  <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme}/>
  <div className="mx-auto max-w-6xl px-4 pb-24 pt-9 sm:px-6">
   <header className="mb-9 border-b border-current/10 pb-6">
    <h1 className="text-4xl font-black tracking-[-.05em] sm:text-5xl">History</h1>
    <p className="mt-2 text-sm font-medium opacity-65">Your driver records, documents, jobs, contracts and saved agreements.</p>
   </header>
   <DriverHistory/>
   <div className="mt-10 border-t border-current/15"><JobContractHistory/></div>
  </div>
 </main>;
}
