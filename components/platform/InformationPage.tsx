"use client";

import { ReactNode } from "react";
import ProfessionalFooter from "@/components/platform/ProfessionalFooter";
import ProfessionalHeader from "@/components/platform/ProfessionalHeader";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function InformationPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  return <main className={`min-h-screen ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}><ProfessionalHeader darkMode={darkMode} onToggleTheme={toggleTheme} /><section className="px-5 py-12 md:px-12"><div className="mx-auto max-w-4xl"><p className="text-xs font-black uppercase tracking-[.2em] text-[#b88900]">{eyebrow}</p><h1 className="mt-3 text-4xl font-black tracking-[-.04em] md:text-6xl">{title}</h1><p className={`mt-5 max-w-3xl text-base leading-8 ${darkMode ? "text-white/60" : "text-black/60"}`}>{intro}</p><div className={`mt-9 grid gap-6 rounded-[24px] border p-6 md:p-8 ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>{children}</div></div></section><ProfessionalFooter darkMode={darkMode} /></main>;
}
