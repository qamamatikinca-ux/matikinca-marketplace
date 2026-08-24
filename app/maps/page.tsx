"use client";

import MarketplaceMap from "@/components/MarketplaceMap";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function MapsPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const muted = darkMode ? "text-white/52" : "text-black/52";

  return (
    <main className={`min-h-screen ${page}`} style={{ backgroundImage: darkMode ? "radial-gradient(circle at 92% 10%,rgba(246,184,0,.07),transparent 26%)" : "radial-gradient(circle at 92% 8%,rgba(246,184,0,.10),transparent 24%)" }}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-7 sm:px-5 sm:pt-10">
        <div className="mb-6 max-w-3xl">
          <p className={`text-[10px] font-black uppercase tracking-[.14em] ${darkMode ? "text-[#f6b800]" : "text-[#8f6900]"}`}>Marketplace map</p>
          <h1 className="mt-2 text-[38px] font-black tracking-[-.055em] sm:text-[48px]">Work and vehicles around you</h1>
          <p className={`mt-3 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>Browse approved LoadLink locations on a map. Use your location only when you want distance sorting; public listing pins are deliberately approximate for privacy.</p>
        </div>
        <MarketplaceMap darkMode={darkMode} />
      </section>
    </main>
  );
}
