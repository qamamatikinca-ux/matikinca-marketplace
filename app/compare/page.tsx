"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import EmptyState from "@/components/platform/EmptyState";
import ProfessionalFooter from "@/components/platform/ProfessionalFooter";
import ProfessionalHeader from "@/components/platform/ProfessionalHeader";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Item = Record<string, unknown> & { id: string; title: string; photos?: string[]; rate?: string };
const fields = [["Price", "rate"], ["Year", "vehicle_year"], ["Make", "brand"], ["Model", "model"], ["Vehicle type", "vehicle_type"], ["Transmission", "transmission"], ["Fuel", "fuel_type"], ["Mileage", "odometer_km"], ["GVM", "gvm_kg"], ["Payload", "payload_kg"], ["Condition", "condition"]] as const;

export default function ComparePage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let ids: string[] = [];
    try { ids = JSON.parse(localStorage.getItem("loadlink-vehicle-compare") || "[]"); } catch { ids = []; }
    Promise.all(ids.slice(0, 4).map((id) => fetch(`/api/listings/${id}`).then((response) => response.ok ? response.json() : null))).then((results) => setItems(results.filter(Boolean).map((result) => result.listing))).finally(() => setLoading(false));
  }, []);
  const pageClass = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  return <main className={`min-h-screen ${pageClass}`}><ProfessionalHeader darkMode={darkMode} onToggleTheme={toggleTheme} /><section className="px-5 py-12 md:px-12"><div className="mx-auto max-w-7xl"><p className="text-xs font-black uppercase tracking-[.2em] text-[#b88900]">Vehicle comparison</p><h1 className="mt-3 text-4xl font-black md:text-6xl">Compare commercial vehicles</h1>{loading ? <p className="mt-8 font-bold">Loading comparison…</p> : items.length ? <div className="mt-8 overflow-x-auto"><table className={`min-w-[900px] w-full border-collapse overflow-hidden rounded-[22px] border ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}><thead><tr><th className="w-44 border-b border-r border-current/10 p-4 text-left text-xs uppercase">Specification</th>{items.map((item) => <th key={item.id} className="border-b border-r border-current/10 p-4 text-left align-top last:border-r-0"><img src={item.photos?.[0] || "/images/jobs/job-card-1.jpg"} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" /><Link href={`/vehicles/${item.id}`} className="mt-3 block text-lg font-black hover:text-[#b88900]">{item.title}</Link></th>)}</tr></thead><tbody>{fields.map(([label, key]) => <tr key={key}><th className="border-b border-r border-current/10 p-4 text-left text-xs font-black uppercase">{label}</th>{items.map((item) => <td key={item.id} className="border-b border-r border-current/10 p-4 text-sm font-bold last:border-r-0">{item[key] == null || item[key] === "" ? "Not provided" : typeof item[key] === "number" ? Number(item[key]).toLocaleString("en-ZA") : String(item[key])}</td>)}</tr>)}</tbody></table></div> : <div className="mt-8"><EmptyState title="No vehicles selected" body="Choose up to four vehicles from the vehicle marketplace to compare their professional specification sheets." actionLabel="Browse vehicles" actionHref="/vehicles" darkMode={darkMode} /></div>}</div></section><ProfessionalFooter darkMode={darkMode} /></main>;
}
