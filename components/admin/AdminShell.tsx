"use client";
import Link from "next/link";
import { ReactNode } from "react";
import ProfessionalHeader from "@/components/platform/ProfessionalHeader";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
const links=[
  ["Overview","/admin"],["Users","/admin/users"],["Listings","/admin/listings"],["Dealerships","/admin/dealerships"],["Drivers","/admin/drivers"],["Cases","/admin/cases"],["Fraud","/admin/fraud"],["Reviews","/admin/reviews"],["Payments","/admin/payments"],["Support","/admin/support"],["Content","/admin/content"],["Notifications","/admin/notifications"],["Health","/admin/health"],
];
export default function AdminShell({title,description,children}:{title:string;description:string;children:ReactNode}){
 const {darkMode,toggleTheme}=useLoadLinkTheme();
 return <main className={`min-h-screen ${darkMode?"bg-black text-white":"bg-[#f4efe3] text-black"}`}><ProfessionalHeader darkMode={darkMode} onToggleTheme={toggleTheme} compact/><section className="border-b border-[#f6b800]/30 bg-black px-4 py-8 text-white"><div className="mx-auto max-w-7xl"><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#f6b800]">Corporate Control Centre</p><h1 className="mt-2 text-4xl font-black tracking-[-.045em] md:text-6xl">{title}</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">{description}</p></div></section><nav className={`border-b ${darkMode?"border-white/10 bg-[#080808]":"border-black/10 bg-white"}`} aria-label="Admin modules"><div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 no-scrollbar">{links.map(([label,href])=><Link key={href} href={href} className="shrink-0 rounded-xl border border-current/15 px-4 py-2 text-[10px] font-black uppercase hover:border-[#f6b800]">{label}</Link>)}</div></nav><section className="mx-auto max-w-7xl px-4 py-6 md:px-6">{children}</section></main>;
}
