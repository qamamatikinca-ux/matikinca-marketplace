"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import EmptyState from "@/components/platform/EmptyState";
import ProfessionalFooter from "@/components/platform/ProfessionalFooter";
import ProfessionalHeader from "@/components/platform/ProfessionalHeader";
import { authenticatedFetch } from "@/lib/client/authenticatedFetch";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type SavedSearch = { id: string; name: string; marketplace_area: string; filters: Record<string, unknown>; alerts_enabled: boolean; created_at: string };

export default function SavedSearchesPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [rows, setRows] = useState<SavedSearch[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await authenticatedFetch("/api/saved-searches");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Saved searches could not be loaded.");
      setRows(payload.rows || []);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Sign in to view saved searches."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function remove(id: string) {
    try {
      const response = await authenticatedFetch(`/api/saved-searches?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Search could not be removed.");
      setRows((current) => current.filter((row) => row.id !== id));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Search could not be removed."); }
  }

  const pageClass = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  return <main className={`min-h-screen ${pageClass}`}><ProfessionalHeader darkMode={darkMode} onToggleTheme={toggleTheme}/><section className="px-5 py-12 md:px-12"><div className="mx-auto max-w-5xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#b88900]">Marketplace alerts</p><h1 className="mt-3 text-4xl font-black md:text-6xl">Saved searches</h1></div><Link href="/vehicles" className="flex h-12 items-center rounded-xl bg-[#f6b800] px-5 text-xs font-black uppercase text-black">New vehicle search</Link></div>{message?<button type="button" onClick={()=>setMessage("")} className="mt-5 w-full rounded-xl border border-[#f6b800]/40 p-3 text-left text-sm font-bold">{message}</button>:null}{loading?<p className="mt-8 font-bold opacity-60">Loading searches…</p>:rows.length?<div className="mt-8 grid gap-4">{rows.map((row)=>{const params=new URLSearchParams();Object.entries(row.filters||{}).forEach(([key,value])=>{if(value&&!(key==="sort"&&value==="newest"))params.set(key,String(value));});const href=row.marketplace_area==="vehicles"?`/vehicles?${params.toString()}`:`/${row.marketplace_area}?${params.toString()}`;return <article key={row.id} className={`rounded-2xl border p-5 ${surface}`}><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#b88900]">{row.marketplace_area} · {row.alerts_enabled?"Alerts on":"Alerts off"}</p><h2 className="mt-2 text-2xl font-black">{row.name}</h2><p className="mt-2 text-xs opacity-55">Saved {new Date(row.created_at).toLocaleDateString("en-ZA")} · {Object.values(row.filters||{}).filter(Boolean).length} active filters</p></div><div className="flex gap-2"><Link href={href} className="flex h-11 items-center rounded-xl bg-[#f6b800] px-4 text-xs font-black uppercase text-black">Open results</Link><button type="button" onClick={()=>void remove(row.id)} className="h-11 rounded-xl border border-red-500/40 px-4 text-xs font-black uppercase text-red-500">Remove</button></div></div></article>})}</div>:<div className="mt-8"><EmptyState title="No saved searches" body="Save a filtered vehicle search and LoadLink will keep the filters connected to your account." actionLabel="Search vehicles" actionHref="/vehicles" darkMode={darkMode}/></div>}</div></section><ProfessionalFooter darkMode={darkMode}/></main>;
}
