"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import SiteMenu from "@/components/SiteMenu";

const areas = [
  { label: "Work", href: "/jobs?portal=job" },
  { label: "Contracts", href: "/contracts" },
  { label: "Vehicles", href: "/vehicles" },
  { label: "Dealerships", href: "/dealerships" },
  { label: "Drivers", href: "/drivers" },
  { label: "Messages", href: "/messages" },
];

export default function ProfessionalHeader({ darkMode, onToggleTheme, compact = false }: { darkMode: boolean; onToggleTheme: () => void; compact?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const surface = darkMode ? "border-white/10 bg-black text-white" : "border-black/10 bg-white text-black";

  function search(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (value) router.push(`/vehicles?search=${encodeURIComponent(value)}`);
  }

  return (
    <header className={`sticky top-0 z-50 border-b ${surface}`}>
      <div className="mx-auto grid h-20 max-w-[1500px] grid-cols-[92px_1fr_52px] items-center px-4">
        <div className="flex items-center gap-2"><SiteMenu darkMode={darkMode} /><AuthStatusButton darkMode={darkMode} /></div>
        <HomeLogoLink theme={darkMode ? "dark" : "light"} />
        <LoadLinkThemeToggle darkMode={darkMode} onToggle={onToggleTheme} className="ml-auto" />
      </div>
      {!compact ? (
        <div className={`border-t ${darkMode ? "border-white/10" : "border-black/5"}`}>
          <div className="mx-auto flex max-w-[1500px] items-center gap-3 overflow-x-auto px-4 py-2 no-scrollbar">
            <nav className="flex shrink-0 items-center gap-1" aria-label="Main marketplace areas">
              {areas.map((item) => {
                const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href.split("?")[0]));
                return <Link key={item.label} href={item.href} className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[.08em] ${active ? "bg-[#f6b800] text-black" : darkMode ? "text-white/70 hover:bg-white/5" : "text-black/65 hover:bg-black/5"}`}>{item.label}</Link>;
              })}
            </nav>
            <form onSubmit={search} className={`ml-auto hidden min-w-[300px] max-w-md flex-1 overflow-hidden rounded-xl border lg:flex ${darkMode ? "border-white/15 bg-[#111]" : "border-black/10 bg-[#f8f5ec]"}`} role="search">
              <label htmlFor="global-marketplace-search" className="sr-only">Search LoadLink</label>
              <input id="global-marketplace-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vehicles, work, dealers or drivers" className="h-10 min-w-0 flex-1 bg-transparent px-3 text-xs font-bold outline-none" />
              <button className="bg-[#f6b800] px-4 text-xs font-black text-black">Search</button>
            </form>
          </div>
        </div>
      ) : null}
    </header>
  );
}
