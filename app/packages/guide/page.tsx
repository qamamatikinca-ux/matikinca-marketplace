"use client";

import Link from "next/link";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import PackageGuideAndTailored from "@/components/PackageGuideAndTailored";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function PackageGuidePage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const muted = darkMode ? "text-white/55" : "text-black/55";
  return (
    <main className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4efe3] text-black"}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <section className="mx-auto max-w-6xl px-4 pb-[calc(48px+env(safe-area-inset-bottom))] pt-7 sm:px-6 md:pt-10">
        <Link href="/packages" className={`text-xs font-black underline decoration-[#f6b800] decoration-2 underline-offset-4 ${muted}`}>Back to packages</Link>
        <h1 className="mt-5 text-4xl font-black tracking-[-.055em] sm:text-5xl">Plan Guide</h1>
        <p className={`mt-3 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>Get one clear recommendation or build a tailored request that goes directly to LoadLink Control Centre for final review.</p>
        <PackageGuideAndTailored darkMode={darkMode} />
      </section>
    </main>
  );
}
