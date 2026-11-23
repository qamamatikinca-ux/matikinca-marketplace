"use client";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import {useLoadLinkTheme} from "@/lib/useLoadLinkTheme";
import JobContractHistory from "@/components/history/JobContractHistory";
import DriverHistoryOverview from "@/components/history/DriverHistoryOverview";

export default function HistoryPage(){
 const {darkMode,toggleTheme}=useLoadLinkTheme();
 return <main className={`min-h-screen ${darkMode?"bg-black text-white":"bg-[#f8f8f7] text-black"}`}>
  <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme}/>
  <div className="mx-auto max-w-6xl px-4 pb-24 pt-9 sm:px-6">
   <header className="mb-7">
    <h1 className="text-4xl font-black tracking-[-.05em] sm:text-5xl">History</h1>
    <p className="mt-2 text-sm font-medium opacity-60">Your completed jobs, contracts and driver records.</p>
   </header>
   <JobContractHistory/>
   <DriverHistoryOverview/>
  </div>
 </main>;
}
