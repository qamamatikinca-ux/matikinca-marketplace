"use client";

import HomeLogoLink from "@/components/HomeLogoLink";
import SiteMenu from "@/components/SiteMenu";
import AuthStatusButton from "@/components/AuthStatusButton";
import DriversAvailableForWork from "@/components/phase2/DriversAvailableForWork";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function DriversPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  return (
    <main className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#fffaf0] text-black"}>
      <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
        <div className="grid h-20 grid-cols-[92px_1fr_52px] items-center px-4">
          <div className="flex items-center gap-2"><SiteMenu darkMode={darkMode} /><AuthStatusButton darkMode={darkMode} /></div>
          <HomeLogoLink theme={darkMode ? "dark" : "light"} />
          <button type="button" onClick={toggleTheme} className={`ml-auto flex h-10 w-10 items-center justify-center rounded-full border ${darkMode ? "border-white/15 bg-white/5 text-[#f6b800]" : "border-black/10 bg-black text-[#f6b800]"}`} aria-label={darkMode ? "Use light theme" : "Use dark theme"}>{darkMode ? <SunIcon /> : <MoonIcon />}</button>
        </div>
      </header>
      <DriversAvailableForWork darkMode={darkMode} fullPage />
    </main>
  );
}

function MoonIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.2 15.1A8 8 0 0 1 8.9 3.8 8.2 8.2 0 1 0 20.2 15Z" fill="currentColor" /></svg>; }
function SunIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>; }
