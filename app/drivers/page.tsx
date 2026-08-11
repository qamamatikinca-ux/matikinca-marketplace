"use client";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";

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
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <DriversAvailableForWork darkMode={darkMode} fullPage />
    </main>
  );
}
