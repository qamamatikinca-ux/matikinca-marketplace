"use client";

import HomeLogoLink from "@/components/HomeLogoLink";
import SiteMenu from "@/components/SiteMenu";
import AuthStatusButton from "@/components/AuthStatusButton";
import DriversAvailableForWork from "@/components/phase2/DriversAvailableForWork";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";

export default function DriversPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  return (
    <main className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#fffaf0] text-black"}>
      <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
        <div className="grid h-20 grid-cols-[92px_1fr_52px] items-center px-4">
          <div className="flex items-center gap-2"><SiteMenu darkMode={darkMode} /><AuthStatusButton darkMode={darkMode} /></div>
          <HomeLogoLink theme={darkMode ? "dark" : "light"} />
          <LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="ml-auto" />
        </div>
      </header>
      <DriversAvailableForWork darkMode={darkMode} fullPage />
    </main>
  );
}
