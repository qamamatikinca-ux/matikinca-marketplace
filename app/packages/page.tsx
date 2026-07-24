"use client";

import { useEffect, useState } from "react";
import AuthStatusButton from "@/components/AuthStatusButton";
import BusinessPlans from "@/components/BusinessPlans";
import HomeLogoLink from "@/components/HomeLogoLink";

export default function PackagesPage() {
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => { setDarkMode(localStorage.getItem("loadlink-theme") === "dark"); }, []);
  return (
    <main className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4efe3] text-black"}>
      <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
        <div className="grid h-20 grid-cols-[100px_1fr_100px] items-center px-4">
          <AuthStatusButton darkMode={darkMode} />
          <HomeLogoLink theme={darkMode ? "dark" : "light"} />
          <button type="button" onClick={() => { const next = !darkMode; setDarkMode(next); localStorage.setItem("loadlink-theme", next ? "dark" : "light"); }} className="justify-self-end rounded-full border border-[#f6b800] px-4 py-2 text-xs font-black">{darkMode ? "Light" : "Dark"}</button>
        </div>
      </header>
      <BusinessPlans darkMode={darkMode} />
      <section className={`px-4 pb-16 md:px-6 ${darkMode ? "bg-black" : "bg-[#f4efe3]"}`}>
        <div className={`mx-auto max-w-6xl rounded-[28px] border p-6 md:p-8 ${darkMode ? "border-white/10 bg-[#0d0d0d]" : "border-black/10 bg-white"}`}>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#b88900]">Jobs remain free</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">Post a logistics job at no cost.</h2>
          <p className={`mt-3 max-w-3xl text-sm leading-7 ${darkMode ? "text-white/55" : "text-black/55"}`}>A job poster may optionally pay R14 once to boost one job onto the homepage for seven days. This does not create a recurring subscription.</p>
        </div>
      </section>
    </main>
  );
}
