"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import EmptyState from "@/components/platform/EmptyState";
import ProfessionalFooter from "@/components/platform/ProfessionalFooter";
import ProfessionalHeader from "@/components/platform/ProfessionalHeader";
import { SOUTH_AFRICAN_PROVINCES } from "@/lib/marketplace/taxonomy";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Dealer = { id: string; slug: string; name: string; profile_image_url?: string; cover_image_url?: string; short_bio?: string; physical_location?: string; province?: string; verification_status?: string; average_response_minutes?: number; trust_score?: number; active_stock_count?: number; year_established?: number };

export default function DealershipDirectoryPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const searchParams = useSearchParams();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [province, setProvince] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/dealerships", { cache: "no-store" }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Dealerships could not load."); return data; }).then((data) => { if (active) setDealers(data.rows || []); }).catch((problem) => { if (active) setError(problem instanceof Error ? problem.message : "Dealerships could not load."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => dealers.filter((dealer) => {
    const text = `${dealer.name} ${dealer.short_bio || ""} ${dealer.physical_location || ""} ${dealer.province || ""}`.toLowerCase();
    return (!search.trim() || search.toLowerCase().split(/\s+/).every((token) => text.includes(token))) && (!province || text.includes(province.toLowerCase()));
  }), [dealers, province, search]);

  const pageClass = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const field = `h-12 rounded-xl border px-4 text-sm font-bold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-[#111]" : "border-black/10 bg-white"}`;
  return <main className={`min-h-screen ${pageClass}`}><ProfessionalHeader darkMode={darkMode} onToggleTheme={toggleTheme} /><section className="px-5 py-12 md:px-12"><div className="mx-auto max-w-7xl"><div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#b88900]">Verified logistics businesses</p><h1 className="mt-3 text-4xl font-black tracking-[-.04em] md:text-6xl">Commercial dealerships</h1><p className={`mt-4 max-w-2xl text-sm leading-7 ${darkMode ? "text-white/55" : "text-black/55"}`}>Browse verified LoadLink dealerships, their live stock, business information and response performance.</p></div><Link href="/dealer" className="inline-flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-xs font-black uppercase text-black">Are you a dealership?</Link></div><div className="mt-8 grid gap-3 sm:grid-cols-[1fr_260px]"><input className={field} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search dealership name, city or stock focus" /><select className={field} value={province} onChange={(event) => setProvince(event.target.value)}><option value="">All provinces</option>{SOUTH_AFRICAN_PROVINCES.map((item) => <option key={item}>{item}</option>)}</select></div>{error ? <p className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm font-bold text-red-600">{error}</p> : null}{loading ? <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className={`h-80 animate-pulse rounded-[24px] ${darkMode ? "bg-white/5" : "bg-black/5"}`} />)}</div> : filtered.length ? <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map((dealer) => <Link href={`/dealership/${dealer.slug}`} key={dealer.id} className={`group overflow-hidden rounded-[24px] border ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}><div className="relative h-36 overflow-hidden bg-black">{dealer.cover_image_url ? <img src={dealer.cover_image_url} alt="" className="h-full w-full object-cover opacity-75 transition group-hover:scale-[1.02]" /> : <div className="h-full w-full bg-[radial-gradient(circle_at_center,rgba(246,184,0,.3),transparent_65%)]" />}<div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" /></div><div className="relative p-5 pt-12"><div className="absolute -top-10 left-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-[#f6b800] bg-black text-xl font-black text-[#f6b800]">{dealer.profile_image_url ? <img src={dealer.profile_image_url} alt={`${dealer.name} logo`} className="h-full w-full object-cover" /> : dealer.name.slice(0, 2).toUpperCase()}</div><div className="flex items-start justify-between gap-3"><div><h2 className="text-2xl font-black">{dealer.name}</h2><p className={`mt-1 text-xs font-bold ${darkMode ? "text-white/45" : "text-black/45"}`}>{dealer.physical_location || "South Africa"}</p></div><span className="rounded-full bg-[#f6b800] px-2.5 py-1 text-[9px] font-black uppercase text-black">Verified</span></div>{dealer.short_bio ? <p className={`mt-4 line-clamp-3 text-sm leading-6 ${darkMode ? "text-white/55" : "text-black/55"}`}>{dealer.short_bio}</p> : null}<div className={`mt-5 grid grid-cols-3 gap-2 border-t pt-4 text-center ${darkMode ? "border-white/10" : "border-black/10"}`}><div><p className="text-lg font-black">{dealer.active_stock_count ?? "—"}</p><p className={`text-[9px] font-black uppercase ${darkMode ? "text-white/40" : "text-black/40"}`}>Active stock</p></div><div><p className="text-lg font-black">{dealer.average_response_minutes ? `${dealer.average_response_minutes}m` : "—"}</p><p className={`text-[9px] font-black uppercase ${darkMode ? "text-white/40" : "text-black/40"}`}>Response</p></div><div><p className="text-lg font-black">{dealer.trust_score ? Number(dealer.trust_score).toFixed(1) : "Verified"}</p><p className={`text-[9px] font-black uppercase ${darkMode ? "text-white/40" : "text-black/40"}`}>Trust</p></div></div></div></Link>)}</div> : <div className="mt-8"><EmptyState title="No dealerships match" body="Try a wider location or remove the search term. Only approved dealerships appear in this directory." darkMode={darkMode} actionLabel="Clear search" actionHref="/dealerships" /></div>}</div></section><ProfessionalFooter darkMode={darkMode} /></main>;
}
