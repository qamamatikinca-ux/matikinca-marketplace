"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import AccessibleDialog from "@/components/platform/AccessibleDialog";
import EmptyState from "@/components/platform/EmptyState";
import ProfessionalFooter from "@/components/platform/ProfessionalFooter";
import ProfessionalHeader from "@/components/platform/ProfessionalHeader";
import LoadLinkPagination from "@/components/LoadLinkPagination";
import { authenticatedFetch } from "@/lib/client/authenticatedFetch";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Listing = { id: string; title: string; city?: string; province?: string; vehicle_group?: string; rate?: string; description?: string; posted_by?: string; created_at?: string; sponsored?: boolean; photos?: string[]; listing_kind?: string };
const PER_PAGE = 7;

export default function WorkMarketplace({ kind }: { kind: "job" | "contract" }) {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [rows, setRows] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [equipment, setEquipment] = useState("");
  const [page, setPage] = useState(1);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    const params = new URLSearchParams({ kind, limit: "200" });
    if (search.trim()) params.set("search", search.trim());
    if (city.trim()) params.set("city", city.trim());
    void fetch(`/api/job-listings?${params}`, { signal: controller.signal }).then(async (response) => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Work opportunities could not be loaded.");
      setRows((data.rows || []) as Listing[]);
    }).catch((cause) => { if (cause.name !== "AbortError") setError(cause instanceof Error ? cause.message : "Work opportunities could not be loaded."); }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [city, kind, search]);

  const filtered = useMemo(() => rows.filter((row) => !equipment || `${row.vehicle_group || ""} ${row.description || ""}`.toLowerCase().includes(equipment.toLowerCase())), [equipment, rows]);
  const total = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  useEffect(() => setPage(1), [city, equipment, search, kind]);

  async function saveSearch(event: FormEvent) {
    event.preventDefault();
    try {
      const response = await authenticatedFetch("/api/saved-searches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: saveName, marketplaceArea: kind === "job" ? "jobs" : "contracts", filters: { search, city, equipment }, alertsEnabled: true }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Search could not be saved.");
      setNotice("Search saved. Alerts can be managed from your account."); setSaveOpen(false); setSaveName("");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Search could not be saved."); }
  }

  const title = kind === "job" ? "Logistics jobs" : "Transport contracts";
  const subtitle = kind === "job" ? "Find work posted specifically for truck owners and mobile-unit operators." : "Find recurring and longer-term logistics opportunities with clear requirements.";
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b] text-white" : "border-black/10 bg-white text-black";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  return <main className={`min-h-screen ${darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"}`}>
    <ProfessionalHeader darkMode={darkMode} onToggleTheme={toggleTheme}/>
    <section className="border-b border-[#f6b800]/30 bg-black px-5 py-12 text-white"><div className="mx-auto max-w-7xl"><p className="text-xs font-black uppercase tracking-[.24em] text-[#f6b800]">LoadLink work marketplace</p><div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><h1 className="text-5xl font-black tracking-[-.055em] md:text-7xl">{title}</h1><p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/65">{subtitle}</p></div><Link href={`/jobs/list${kind === "contract" ? "?mode=contract" : ""}`} className="flex h-13 items-center justify-center rounded-xl bg-[#f6b800] px-6 text-xs font-black uppercase text-black">{kind === "job" ? "Post a job" : "Post a contract"}</Link></div></div></section>
    <section className="mx-auto max-w-7xl px-4 py-7 md:px-6"><div className={`grid gap-3 rounded-[24px] border p-4 md:grid-cols-[1fr_220px_220px_auto] ${surface}`}><label><span className="text-[10px] font-black uppercase text-[#b88900]">Search</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Route, cargo, equipment or company" className="mt-2 h-12 w-full rounded-xl border border-current/15 bg-transparent px-4 font-bold outline-none focus:border-[#f6b800]"/></label><label><span className="text-[10px] font-black uppercase text-[#b88900]">Location</span><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City or province" className="mt-2 h-12 w-full rounded-xl border border-current/15 bg-transparent px-4 font-bold outline-none focus:border-[#f6b800]"/></label><label><span className="text-[10px] font-black uppercase text-[#b88900]">Equipment</span><select value={equipment} onChange={(e) => setEquipment(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-current/15 bg-transparent px-4 font-bold"><option value="">All equipment</option><option>Side tipper</option><option>Superlink</option><option>Flat deck</option><option>Tautliner</option><option>Refrigerated</option><option>Mobile unit</option></select></label><button type="button" onClick={() => setSaveOpen(true)} className="mt-auto h-12 rounded-xl border border-[#f6b800] px-5 text-xs font-black uppercase text-[#b88900]">Save search</button></div>
      <div className="mt-5 flex items-center justify-between"><p className={`text-sm font-bold ${muted}`}>{filtered.length} matching {kind === "job" ? "jobs" : "contracts"}</p><p className={`text-xs ${muted}`}>7 posts per page</p></div>
      {notice ? <p role="status" className="mt-4 rounded-xl border border-[#f6b800]/40 bg-[#f6b800]/10 p-3 text-sm font-bold">{notice}</p> : null}
      {error ? <p role="alert" className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 font-bold text-red-500">{error}</p> : null}
      {loading ? <div className="mt-5 grid gap-4">{Array.from({ length: 3 }).map((_, index) => <div key={index} className={`h-48 animate-pulse rounded-[24px] border ${surface}`}/>)}</div> : visible.length ? <div className="mt-5 grid gap-4">{visible.map((row) => <article key={row.id} className={`overflow-hidden rounded-[24px] border ${surface}`}><div className="grid md:grid-cols-[220px_1fr_auto]"> <div className="h-44 bg-black/10 md:h-full">{row.photos?.[0] ? <img src={row.photos[0]} alt="" className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center text-sm font-black text-[#b88900]">LoadLink</div>}</div><div className="p-5"><div className="flex flex-wrap gap-2">{row.sponsored ? <span className="rounded-full bg-[#f6b800] px-2 py-1 text-[9px] font-black uppercase text-black">Sponsored</span> : null}<span className="rounded-full border border-current/15 px-2 py-1 text-[9px] font-black uppercase">{kind}</span></div><h2 className="mt-3 text-2xl font-black">{row.title}</h2><p className={`mt-2 text-sm font-bold ${muted}`}>{row.city || "South Africa"} · {row.vehicle_group || "Logistics equipment"}</p><p className="mt-3 text-lg font-black text-[#b88900]">{row.rate || "Rate on application"}</p><p className={`mt-3 line-clamp-2 text-sm leading-6 ${muted}`}>{row.description || "Open the post for complete requirements and contact options."}</p></div><div className="flex flex-row gap-2 border-t border-current/10 p-4 md:w-48 md:flex-col md:border-l md:border-t-0"><Link href={`/jobs/${row.id}`} className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[#f6b800] px-4 text-xs font-black uppercase text-black">View details</Link><Link href={`/messages?listing=${row.id}`} className="flex h-11 flex-1 items-center justify-center rounded-xl border border-current/15 px-4 text-xs font-black uppercase">Message poster</Link></div></div></article>)}</div> : <div className="mt-5"><EmptyState title="No exact matches" body="Broaden the location or equipment filters, or save this search to receive alerts when matching work is approved." actionHref={`/jobs/list${kind === "contract" ? "?mode=contract" : ""}`} actionLabel={kind === "job" ? "Post a job" : "Post a contract"} darkMode={darkMode}/></div>}
      {total > 1 ? <div className="mt-7"><LoadLinkPagination current={page} total={total} onChange={setPage} darkMode={darkMode} label={`${title} pages`}/></div> : null}
    </section>
    <ProfessionalFooter darkMode={darkMode}/>
    <AccessibleDialog open={saveOpen} onClose={() => setSaveOpen(false)} title="Save this search" description="LoadLink will store these filters and can alert you when approved opportunities match." darkMode={darkMode}><form onSubmit={(event) => void saveSearch(event)} className="grid gap-3"><label className="grid gap-2 text-sm font-black">Search name<input required value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Gauteng side tipper work" className="h-12 rounded-xl border border-current/15 bg-transparent px-4 outline-none focus:border-[#f6b800]"/></label><button className="h-12 rounded-xl bg-[#f6b800] font-black text-black">Save and enable alerts</button></form></AccessibleDialog>
  </main>;
}
