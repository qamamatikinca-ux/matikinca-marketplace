"use client";

import Link from "next/link";
import HomeLogoLink from "@/components/HomeLogoLink";
import SiteMenu from "@/components/SiteMenu";
import AuthStatusButton from "@/components/AuthStatusButton";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import RequireAuthLink from "@/components/RequireAuthLink";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function DriverPortalPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const page = darkMode ? "bg-black text-white" : "bg-[#fffaf0] text-black";
  const border = darkMode ? "border-white/10" : "border-black/10";
  const muted = darkMode ? "text-white/60" : "text-black/60";

  return (
    <main className={`min-h-screen ${page}`}>
      <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
        <div className="grid h-20 grid-cols-[92px_1fr_52px] items-center px-4">
          <div className="flex items-center gap-2">
            <SiteMenu darkMode={darkMode} />
            <AuthStatusButton darkMode={darkMode} />
          </div>
          <HomeLogoLink theme={darkMode ? "dark" : "light"} />
          <LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="ml-auto" />
        </div>
      </header>

      <section className="relative min-h-[420px] overflow-hidden">
        <img src="/images/driver-profile-hero.jpg" alt="Professional truck drivers" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative mx-auto flex min-h-[420px] max-w-6xl flex-col items-center justify-center px-5 py-16 text-center text-white">
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#f6b800]">Driver portal</p>
          <h1 className="mt-4 text-5xl font-black tracking-[-.05em] md:text-7xl">Choose what you need</h1>
          <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-white/70 md:text-base">
            Browse approved drivers for available work or create and manage your own professional driver profile.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-10 md:grid-cols-2 md:px-8 md:py-14">
        <Link href="/drivers" className={`group border p-7 transition hover:border-[#f6b800] md:p-9 ${border} ${darkMode ? "bg-[#0b0b0b]" : "bg-white"}`}>
          <span className="flex h-12 w-12 items-center justify-center bg-[#f6b800] text-black"><DriversIcon /></span>
          <h2 className="mt-6 text-3xl font-black tracking-[-.04em]">View available drivers</h2>
          <p className={`mt-3 text-sm font-semibold leading-6 ${muted}`}>
            Browse approved driver profiles by experience, licence code, location and availability.
          </p>
          <span className="mt-7 inline-flex border border-[#f6b800] px-5 py-3 text-xs font-black uppercase tracking-[.12em] text-[#b88900]">View drivers</span>
        </Link>

        <RequireAuthLink href="/driver-profile" className={`group border p-7 transition hover:border-[#f6b800] md:p-9 ${border} ${darkMode ? "bg-[#0b0b0b]" : "bg-white"}`}>
          <span className="flex h-12 w-12 items-center justify-center bg-black text-[#f6b800] ring-1 ring-[#f6b800]/40"><ProfileIcon /></span>
          <h2 className="mt-6 text-3xl font-black tracking-[-.04em]">Create or manage driver profile</h2>
          <p className={`mt-3 text-sm font-semibold leading-6 ${muted}`}>
            Add your experience, licence details, preferred routes and availability, or update an existing profile.
          </p>
          <span className="mt-7 inline-flex bg-[#f6b800] px-5 py-3 text-xs font-black uppercase tracking-[.12em] text-black">Manage profile</span>
        </RequireAuthLink>
      </section>
    </main>
  );
}

function DriversIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-1a3 3 0 1 0 0-6M2 21a6 6 0 0 1 12 0m1-7a5 5 0 0 1 7 4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

function ProfileIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" /><path d="M5 21a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}
