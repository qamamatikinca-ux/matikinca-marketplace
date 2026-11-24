"use client";
import LoadLinkImage from "@/components/LoadLinkImage";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import Link from "next/link";
import RequireAuthLink from "@/components/RequireAuthLink";
import OwnDriverProfileCard from "@/components/OwnDriverProfileCard";
import DriversAvailableForWork from "@/components/phase2/DriversAvailableForWork";
import {useLoadLinkTheme} from "@/lib/useLoadLinkTheme";
import {useLoadLinkAccount} from "@/lib/loadLinkAccountStore";

export default function DriverPortalPage(){
 const {darkMode,toggleTheme}=useLoadLinkTheme();
 const account=useLoadLinkAccount();
 return <main data-loadlink-refined-driver-portal="true" className={`min-h-screen overflow-x-hidden ${darkMode?"bg-black text-white":"bg-[#f8f8f7] text-black"}`}>
  <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme}/>
  <section className="bg-[#101010] text-white" aria-label="Driver portal introduction">
   <div className="mx-auto grid max-w-7xl lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-stretch">
    <div className="relative order-1 min-w-0 overflow-hidden bg-[#101010] lg:order-2">
     <LoadLinkImage src="/images/driver-profile-hero.jpg" alt="Professional driver seated in a commercial truck" className="block h-auto w-full object-contain lg:h-full lg:max-h-[500px]"/>
     <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#101010] to-transparent lg:hidden"/>
    </div>
    <div className="order-2 flex min-w-0 flex-col justify-center px-5 pb-7 pt-3 sm:px-8 sm:py-10 lg:order-1 lg:px-10 lg:py-14">
     <h1 className="max-w-xl text-[30px] font-black leading-[1.08] tracking-[-.045em] sm:text-5xl">Find the right driver</h1>
     <p className="mt-3 max-w-lg text-sm font-medium leading-6 text-white/70">Approved drivers for transport, deliveries and fleet operations.</p>
     <div className="mt-5 flex flex-wrap gap-2.5">
      <Link href="#available-drivers" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-[#f6b800] px-4 text-[13px] font-bold text-black sm:flex-none sm:px-6">Find a driver</Link>
      <RequireAuthLink href="/driver-profile" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-white/30 px-4 text-center text-[13px] font-bold text-white sm:flex-none sm:px-6">{account.driverProfile?"My driver profile":"Create driver profile"}</RequireAuthLink>
     </div>
    </div>
   </div>
  </section>
  <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6"><OwnDriverProfileCard darkMode={darkMode} compact/></div>
  <div id="available-drivers" className="scroll-mt-20"><DriversAvailableForWork darkMode={darkMode} showHero={false} fullPage/></div>
 </main>;
}
