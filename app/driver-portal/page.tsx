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
 return <main className={`min-h-screen ${darkMode?"bg-black text-white":"bg-[#fffaf0] text-black"}`}>
  <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme}/>
  <section className="relative isolate overflow-hidden">
   <LoadLinkImage src="/images/driver-profile-hero.jpg" alt="Professional truck drivers" className="absolute inset-0 -z-20 h-full w-full object-cover object-center"/>
   <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/65 to-black/35"/>
   <div className="mx-auto flex min-h-[340px] max-w-6xl flex-col justify-center px-5 py-12 text-white sm:min-h-[390px] sm:py-16">
    <h1 className="max-w-2xl text-4xl font-black tracking-[-.045em] sm:text-5xl">Find the right driver.</h1>
    <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-white/80">Search approved drivers by the work you need, location and experience.</p>
    <div data-loadlink-driver-entry-actions="true" className="mt-6 flex flex-wrap gap-3">
     <Link href="#available-drivers" data-loadlink-hero-pill="true" data-variant="primary" className="flex min-h-12 items-center justify-center rounded-full bg-[#f6b800] px-6 text-sm font-black text-black">Find a driver</Link>
     <RequireAuthLink href="/driver-profile" data-loadlink-hero-pill="true" data-variant="secondary" className="flex min-h-12 items-center justify-center rounded-full border border-white/60 bg-black/45 px-6 text-sm font-black text-white">{account.driverProfile?"Manage my profile":"Create driver profile"}</RequireAuthLink>
    </div>
   </div>
  </section>
  <div className="mx-auto max-w-6xl px-5 pt-5"><OwnDriverProfileCard darkMode={darkMode} compact/></div>
  <div id="available-drivers" className="scroll-mt-24"><DriversAvailableForWork darkMode={darkMode} showHero={false} fullPage/></div>
 </main>;
}
