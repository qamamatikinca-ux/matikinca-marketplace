"use client";
import Link from "next/link";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
export default function DealershipError({ reset }: { error: Error; reset: () => void }) {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  return <main className={`min-h-screen ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}><LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme}/><section className="mx-auto max-w-lg px-5 py-16"><h1 className="text-3xl font-bold">Dealerships could not load</h1><p className="mt-3 text-sm opacity-65">Your account is still here. Check your connection and try again.</p><button type="button" className="mt-6 min-h-12 rounded-full bg-[#f6b800] px-6 font-bold text-black" onClick={reset}>Try again</button><Link href="/" className="ml-4 text-sm underline">Home</Link></section></main>;
}
