"use client";

import { useEffect, useState } from "react";
import HomeLogoLink from "@/components/HomeLogoLink";
import SiteMenu from "@/components/SiteMenu";
import AuthStatusButton from "@/components/AuthStatusButton";
import DriversAvailableForWork from "@/components/phase2/DriversAvailableForWork";

export default function DriversPage() {
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => setDarkMode(localStorage.getItem("loadlink-theme") === "dark"), []);
  function toggleTheme() {
    setDarkMode((current) => {
      const next = !current;
      localStorage.setItem("loadlink-theme", next ? "dark" : "light");
      window.dispatchEvent(new Event("loadlink-theme-change"));
      return next;
    });
  }
  return (
    <main className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#fffaf0] text-black"}>
      <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
        <div className="grid h-20 grid-cols-[92px_1fr_52px] items-center px-4">
          <div className="flex items-center gap-2"><SiteMenu darkMode={darkMode} /><AuthStatusButton darkMode={darkMode} /></div>
          <HomeLogoLink theme={darkMode ? "dark" : "light"} />
          <button type="button" onClick={toggleTheme} className={`ml-auto flex h-10 w-10 items-center justify-center rounded-full border text-sm font-black ${darkMode ? "border-[#f6b800] bg-[#f6b800] text-black" : "border-black/10 bg-black text-[#f6b800]"}`} aria-label="Toggle theme">{darkMode ? "L" : "D"}</button>
        </div>
      </header>
      <DriversAvailableForWork darkMode={darkMode} fullPage />
    </main>
  );
}
