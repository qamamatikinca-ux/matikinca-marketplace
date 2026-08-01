"use client";

import DriversAvailableForWork from "@/components/phase2/DriversAvailableForWork";
import ProfessionalFooter from "@/components/platform/ProfessionalFooter";
import ProfessionalHeader from "@/components/platform/ProfessionalHeader";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function DriversPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  return (
    <main className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4efe3] text-black"}>
      <ProfessionalHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <DriversAvailableForWork darkMode={darkMode} fullPage />
      <ProfessionalFooter darkMode={darkMode} />
    </main>
  );
}
