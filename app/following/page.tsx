"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Dealer = { id: string; slug: string; name: string; profile_image_url?: string | null; short_bio?: string | null; physical_location?: string | null; follower_count?: number | null; active_listing_count?: number | null; latitude?: number | null; longitude?: number | null };
type DealerUpdate = { id: string; dealership_id: string; update_type: string; title: string; body: string; image_url?: string | null; listing_id?: string | null; published_at?: string | null; created_at: string };
type View = "following" | "updates" | "discover";
type Position = { lat: number; lon: number } | null;

function distanceKm(a: Position, dealer: Dealer) {
  if (!a || !Number.isFinite(Number(dealer.latitude)) || !Number.isFinite(Number(dealer.longitude))) return null;
  const rad = (n: number) => n * Math.PI / 180;
  const dLat = rad(Number(dealer.latitude) - a.lat), dLon = rad(Number(dealer.longitude) - a.lon);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(Number(dealer.latitude))) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export default function FollowingPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [dealers, setDealers] = useState<Dealer[]>([]), [discoverDealers, setDiscoverDealers] = useState<Dealer[]>([]);
  const [updates, setUpdates] = useState<DealerUpdate[]>([]);
  const [loading, setLoading] = useState(true), [signedIn, setSignedIn] = useState(true);
  const [view, setView] = useState<View>("following"), [locationQuery, setLocationQuery] = useState("");
  const [position, setPosition] = useState<Position>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("discover") === "1") setView("discover"); else if (params.get("view") === "updates") setView("updates");
    void loadFollowing(); void loadDiscovery();
    navigator.geolocation?.getCurrentPosition((p) => setPosition({ lat: p.coords.latitude, lon: p.coords.longitude }), () => undefined, { maximumAge: 300000, timeout: 5000 });
  }, []);

  async function loadDiscovery() {
    if (!isSupabaseConfigured) return;
    const result = await supabase.from("public_dealership_profiles").select("*").order("follower_count", { ascending: false }).limit(60);
    if (!result.error) setDiscoverDealers((result.data || []) as Dealer[]);
  }
  async function loadFollowing() {
    setLoading(true);
    if (!isSupabaseConfigured) { setSignedIn(false); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSignedIn(false); setLoading(false); return; }
    setSignedIn(true);
    const follows = await supabase.from("dealership_followers").select("dealership_id").eq("user_id", user.id);
    if (follows.error || !follows.data?.length) { setDealers([]); setUpdates([]); setLoading(false); return; }
    const ids = follows.data.map((r) => String(r.dealership_id));
    const [dealerResult, updateResult] = await Promise.all([
      supabase.from("public_dealership_profiles").select("*").in("id", ids).order("follower_count", { ascending: false }),
      supabase.from("public_dealership_updates").select("id,dealership_id,update_type,title,body,image_url,listing_id,published_at,created_at").in("dealership_id", ids).order("published_at", { ascending: false }).limit(40),
    ]);
    setDealers((dealerResult.data || []) as Dealer[]); setUpdates((updateResult.data || []) as DealerUpdate[]); setLoading(false);
  }

  const dealerById = useMemo(() => new Map(dealers.map((d) => [d.id, d])), [dealers]);
  const followedIds = useMemo(() => new Set(dealers.map((d) => d.id)), [dealers]);
  const matched = useMemo(() => { const q = locationQuery.trim().toLowerCase(); return discoverDealers.filter((d) => !followedIds.has(d.id) && (!q || `${d.name} ${d.physical_location || ""} ${d.short_bio || ""}`.toLowerCase().includes(q))); }, [discoverDealers, followedIds, locationQuery]);
  const fallback = useMemo(() => discoverDealers.filter((d) => !followedIds.has(d.id)).slice(0, 12), [discoverDealers, followedIds]);
  const discoveryRows = matched.length ? matched : fallback;
  const fallbackMode = Boolean(locationQuery.trim() && !matched.length);
  const muted = darkMode ? "text-white/52" : "text-black/52";
  const glass = darkMode ? "border-white/10 bg-white/[.04]" : "border-black/10 bg-white/62";
  function chooseView(next: View) { setView(next); window.history.replaceState(null, "", next === "updates" ? "/following?view=updates" : next === "discover" ? "/following?discover=1" : "/following"); window.scrollTo({ top: 0, behavior: "smooth" }); }

  return <main className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4efe3] text-black"} data-loadlink-dealer-network="local-modern-v3">
    <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
    <section className="mx-auto max-w-6xl px-4 pb-16 pt-5 md:px-6 md:pt-8">
      <div className="border-b border-current/10 pb-5"><h1 className="text-3xl font-black tracking-[-.045em] sm:text-4xl">Dealerships</h1><p className={`mt-2 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>Follow verified dealerships, see updates and discover popular dealers around you.</p><div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto"><Tab active={view === "following"} onClick={() => chooseView("following")} darkMode={darkMode}>Following</Tab><Tab active={view === "updates"} onClick={() => chooseView("updates")} darkMode={darkMode}>Updates</Tab><Tab active={view === "discover"} onClick={() => chooseView("discover")} darkMode={darkMode}>Find dealers</Tab></div></div>
      {view === "discover" ? <section className="pt-5"><div className={`rounded-[20px] border p-3.5 backdrop-blur-xl ${glass}`}><label className="block"><span className={`mb-2 block text-[9px] font-black uppercase tracking-[.11em] ${muted}`}>City or area</span><input value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} placeholder="Johannesburg, Pretoria, Durban…" className={`h-12 w-full rounded-xl border px-4 text-sm font-semibold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/10 bg-white/[.045] text-white placeholder:text-white/28" : "border-black/10 bg-white/70 text-black placeholder:text-black/35"}`} /></label></div><div className="mt-5"><h2 className="text-xl font-black tracking-[-.03em]">{fallbackMode ? "Popular dealerships near you" : locationQuery.trim() ? "Matching dealerships" : "Most followed dealerships"}</h2><p className={`mt-1 text-xs font-semibold ${muted}`}>{fallbackMode ? "No exact area match, so LoadLink is showing popular alternatives instead." : position ? "Distance is estimated from your location where dealership coordinates are available." : "Sorted by follower count."}</p></div><div className="mt-4 grid gap-3 md:grid-cols-2">{discoveryRows.map((dealer) => <DealerCard key={dealer.id} dealer={dealer} darkMode={darkMode} muted={muted} position={position} />)}</div></section> : loading ? <div className="flex min-h-[50vh] items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-2 border-current/10 border-t-[#f6b800]" /></div> : !signedIn ? <Empty title="Sign in to see your dealership network" copy="Following and dealership updates are linked to your LoadLink account." action={<Link href="/login?returnTo=%2Ffollowing" className="inline-flex h-11 items-center rounded-xl bg-[#f6b800] px-5 text-xs font-black text-black">Sign in</Link>} glass={glass} muted={muted} /> : dealers.length === 0 ? <Empty title="No dealerships followed yet" copy="Browse verified dealerships and follow the ones you want to keep close." action={<button onClick={() => chooseView("discover")} className="h-11 rounded-xl bg-[#f6b800] px-5 text-xs font-black text-black">Find dealers</button>} glass={glass} muted={muted} /> : view === "following" ? <div className="mt-5 grid gap-3 md:grid-cols-2">{dealers.map((dealer) => <DealerCard key={dealer.id} dealer={dealer} darkMode={darkMode} muted={muted} position={position} />)}</div> : updates.length ? <div className="mt-5 grid gap-3 md:grid-cols-2">{updates.map((u) => { const dealer = dealerById.get(u.dealership_id); return <article key={u.id} className={`rounded-[20px] border p-4 ${glass}`}><div className="flex items-center gap-3">{dealer ? <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-current/10">{dealer.profile_image_url ? <img src={dealer.profile_image_url} alt="" className="h-full w-full object-cover" /> : dealer.name.slice(0,1)}</span> : null}<div className="min-w-0">{dealer ? <Link href={`/dealership/${dealer.slug}`} className="truncate text-sm font-black">{dealer.name}</Link> : null}<p className={`text-[9px] font-bold uppercase tracking-[.08em] ${muted}`}>{u.update_type.replaceAll("_", " ")}</p></div></div><h2 className="mt-3 text-base font-black">{u.title}</h2><p className={`mt-2 line-clamp-3 text-sm font-semibold leading-6 ${muted}`}>{u.body}</p></article>; })}</div> : <Empty title="No new dealership updates" copy="Fresh updates from followed dealerships will appear here." glass={glass} muted={muted} />}
    </section>
  </main>;
}
function DealerCard({ dealer, muted, darkMode, position }: { dealer: Dealer; muted: string; darkMode: boolean; position: Position }) { const km = distanceKm(position, dealer); return <Link href={`/dealership/${dealer.slug}`} className={`group flex items-center gap-4 rounded-[20px] border p-4 transition active:scale-[.995] ${darkMode ? "border-white/10 bg-white/[.035]" : "border-black/10 bg-white/60"}`}><div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-current/10 bg-current/[.04]">{dealer.profile_image_url ? <img src={dealer.profile_image_url} alt={`${dealer.name} profile`} className="h-full w-full object-cover" /> : <span className="text-sm font-black">{dealer.name.slice(0, 2).toUpperCase()}</span>}</div><div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-2"><h2 className="truncate text-base font-black">{dealer.name}</h2><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#f6b800] text-[9px] font-black text-black">✓</span></div><p className={`mt-1 line-clamp-2 text-xs font-semibold leading-5 ${muted}`}>{dealer.short_bio || "Commercial vehicle dealership on LoadLink."}</p><div className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold ${muted}`}><span>{Number(dealer.follower_count || 0).toLocaleString("en-ZA")} followers</span>{km !== null ? <span>{km < 1 ? "<1 km" : `${Math.round(km)} km`} away</span> : null}{dealer.physical_location ? <span className="truncate">{dealer.physical_location}</span> : null}</div></div><span className="text-lg opacity-35">›</span></Link>; }
function Tab({ active, onClick, darkMode, children }: { active: boolean; onClick: () => void; darkMode: boolean; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={`min-h-11 shrink-0 rounded-full border px-5 text-sm font-black ${active ? "border-[#f6b800] bg-[#f6b800] text-black" : darkMode ? "border-white/12 bg-transparent text-white/75" : "border-black/10 bg-transparent text-black/70"}`}>{children}</button>; }
function Empty({ title, copy, action, glass, muted }: { title: string; copy: string; action?: React.ReactNode; glass: string; muted: string }) { return <div className={`mt-6 rounded-[20px] border p-8 text-center ${glass}`}><h2 className="text-xl font-black">{title}</h2><p className={`mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 ${muted}`}>{copy}</p>{action ? <div className="mt-5">{action}</div> : null}</div>; }
