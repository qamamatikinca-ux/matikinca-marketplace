"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import PublicDealerStatus from "@/components/dealer/PublicDealerStatus";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Dealer = {
  id: string; slug: string; name: string; profile_image_url?: string | null; cover_image_url?: string | null;
  short_bio?: string | null; business_description?: string | null; physical_location?: string | null;
  phone_number?: string | null; whatsapp_number?: string | null; trading_hours?: string | null;
  follower_count?: number | null; active_listing_count?: number | null;
};
type Listing = { id: string; title?: string | null; city?: string | null; rate?: string | null; price_amount?: number | null; photos?: string[] | null; stock_status?: string | null; vehicle_year?: number | null; brand?: string | null; model?: string | null };
type Review = { id: string; rating: number; body?: string | null };
type Update = { id: string; title: string; body: string; image_url?: string | null };
type HoursValue = { closed?: boolean; open?: string; close?: string };

type OpenState = { label: "Open" | "Closed" | "Hours unavailable"; open: boolean; detail: string };

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "LL"; }
function listingTitle(item: Listing) { return item.title || [item.vehicle_year, item.brand, item.model].filter(Boolean).join(" ") || "Commercial vehicle"; }
function price(item: Listing) {
  if (item.rate) return item.rate;
  if (Number(item.price_amount || 0) > 0) return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(Number(item.price_amount));
  return "POA";
}
function imageFallback(event: SyntheticEvent<HTMLImageElement>) { const image = event.currentTarget; if (image.dataset.loadlinkFallback === "1") return; image.dataset.loadlinkFallback = "1"; image.src = "/images/truck-1.jpg"; }
function viewerKey() { if (typeof window === "undefined") return "server"; const key = "loadlink-dealer-showroom-viewer-v1"; let value = localStorage.getItem(key); if (!value) { value = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`; localStorage.setItem(key, value); } return value; }
function parseHours(raw?: string | null) { if (!raw) return null; try { return JSON.parse(raw) as Record<string, HoursValue>; } catch { return null; } }
function clock() { const parts = new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()); const pick = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value || ""; return { day: pick("weekday"), minute: Number(pick("hour")) * 60 + Number(pick("minute")) }; }
function mins(value?: string) { const m = String(value || "").match(/^(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
function openState(raw?: string | null): OpenState {
  const schedule = parseHours(raw); if (!schedule) return { label: "Hours unavailable", open: false, detail: "Trading hours not supplied" };
  const now = clock(); const value = schedule[now.day]; if (!value || value.closed) return { label: "Closed", open: false, detail: `${now.day} · Closed` };
  const start = mins(value.open), end = mins(value.close); if (start === null || end === null) return { label: "Hours unavailable", open: false, detail: `${now.day} · Hours not supplied` };
  const open = end >= start ? now.minute >= start && now.minute < end : now.minute >= start || now.minute < end;
  return { label: open ? "Open" : "Closed", open, detail: `${now.day} · ${value.open || "–"}–${value.close || "–"}` };
}

export default function PublicDealershipInstagramShowroom({ slug }: { slug: string }) {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [following, setFollowing] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [query, setQuery] = useState("");
  const [stock, setStock] = useState("all");
  const [loading, setLoading] = useState(true);
  const [stockLoading, setStockLoading] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);

  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const border = darkMode ? "border-white/10" : "border-black/10";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const glass = darkMode ? "border-white/10 bg-white/[.045]" : "border-black/10 bg-white/65";
  const average = useMemo(() => reviews.length ? reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length : null, [reviews]);
  const trading = useMemo(() => openState(dealer?.trading_hours), [dealer?.trading_hours]);
  const schedule = useMemo(() => parseHours(dealer?.trading_hours), [dealer?.trading_hours]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      const profile = await supabase.from("public_dealership_profiles").select("*").eq("slug", slug).maybeSingle();
      if (!alive) return;
      if (!profile.data) { setDealer(null); setLoading(false); return; }
      const current = profile.data as Dealer; setDealer(current);
      const [inventory, reviewResult, updateResult, auth] = await Promise.all([
        supabase.rpc("loadlink_public_dealer_inventory", { p_dealership_id: current.id, p_page: 1, p_page_size: 60, p_query: "", p_stock: "all" }),
        supabase.rpc("loadlink_public_dealer_reviews", { p_dealership_id: current.id, p_limit: 12 }),
        supabase.from("public_dealership_updates").select("id,title,body,image_url").eq("dealership_id", current.id).order("published_at", { ascending: false }).limit(8),
        supabase.auth.getUser(),
      ]);
      if (!alive) return;
      setListings(((inventory.data || { items: [] }) as { items?: Listing[] }).items || []);
      setReviews((reviewResult.data || []) as Review[]); setUpdates((updateResult.data || []) as Update[]);
      const user = auth.data.user;
      if (user) {
        const [follow, owner, staff] = await Promise.all([
          supabase.from("dealership_followers").select("dealership_id").eq("dealership_id", current.id).eq("user_id", user.id).maybeSingle(),
          supabase.from("dealership_profiles").select("id").eq("id", current.id).eq("owner_user_id", user.id).maybeSingle(),
          supabase.from("dealership_staff").select("dealership_id").eq("dealership_id", current.id).eq("user_id", user.id).limit(1).maybeSingle(),
        ]);
        if (!alive) return; setFollowing(Boolean(follow.data)); setCanEdit(Boolean(owner.data || staff.data));
      }
      void supabase.rpc("loadlink_record_dealer_profile_view", { p_dealership_id: current.id, p_viewer_key: viewerKey(), p_source: "showroom" });
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [slug]);

  useEffect(() => {
    if (!dealer) return;
    const timer = window.setTimeout(async () => {
      setStockLoading(true);
      const result = await supabase.rpc("loadlink_public_dealer_inventory", { p_dealership_id: dealer.id, p_page: 1, p_page_size: 60, p_query: query.trim(), p_stock: stock });
      setListings(((result.data || { items: [] }) as { items?: Listing[] }).items || []); setStockLoading(false);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [dealer?.id, query, stock]);

  async function toggleFollow() {
    if (!dealer) return;
    const auth = await supabase.auth.getUser(); if (!auth.data.user) { window.location.assign(`/login?returnTo=${encodeURIComponent(`/dealership/${dealer.slug}`)}`); return; }
    if (following) { const result = await supabase.from("dealership_followers").delete().eq("dealership_id", dealer.id).eq("user_id", auth.data.user.id); if (!result.error) setFollowing(false); }
    else { const result = await supabase.from("dealership_followers").insert({ dealership_id: dealer.id, user_id: auth.data.user.id }); if (!result.error) setFollowing(true); }
    window.dispatchEvent(new Event("loadlink-dealership-follow-changed"));
  }

  if (loading) return <main className={`min-h-screen ${page}`}><LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} /><div className="grid min-h-[72vh] place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-2 border-current/10 border-t-[#f6b800]" /></div></main>;
  if (!dealer) return <main className={`min-h-screen ${page}`}><LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} /><section className="mx-auto max-w-xl px-5 py-24 text-center"><h1 className="text-3xl font-black">Showroom unavailable</h1><p className={`mt-3 text-sm font-semibold ${muted}`}>This dealership has not published a showroom.</p><Link href="/following?discover=1" className="mt-6 inline-flex rounded-full bg-[#f6b800] px-6 py-3 text-sm font-black text-black">Find dealerships</Link></section></main>;

  const count = listings.length || Number(dealer.active_listing_count || 0);
  const about = dealer.short_bio || dealer.business_description || "Commercial vehicles and mobile units on LoadLink.";
  const whatsapp = String(dealer.whatsapp_number || dealer.phone_number || "").replace(/\D/g, "");

  return <main className={`min-h-screen ${page}`} data-loadlink-public-showroom="showroom-first-v3">
    <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

    <section className="relative isolate min-h-[330px] overflow-hidden bg-[#080808] text-white sm:min-h-[440px]">
      <img src={dealer.cover_image_url || "/images/jobs/jobs-hero-fleet.jpg"} onError={imageFallback} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/25 to-black/90" />
      {canEdit ? <Link href="/dealer?section=showroom" className="absolute right-4 top-4 z-20 rounded-full border border-white/18 bg-black/45 px-4 py-2 text-xs font-black backdrop-blur-xl">Edit showroom</Link> : null}
      <div className="absolute inset-x-0 bottom-0 z-10 mx-auto max-w-6xl px-4 pb-6 sm:px-6 sm:pb-8">
        <div className="flex items-end gap-3">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-white/30 bg-black/50 backdrop-blur-lg">{dealer.profile_image_url ? <img src={dealer.profile_image_url} onError={imageFallback} alt="" className="h-full w-full object-cover" /> : <span className="text-sm font-black">{initials(dealer.name)}</span>}</div>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-3xl font-black tracking-[-.045em] sm:text-5xl">{dealer.name}</h1><button type="button" onClick={() => setVerificationOpen(true)} className="grid h-6 w-6 place-items-center rounded-full bg-[#f6b800] text-[11px] font-black text-black" aria-label="Verified dealership">✓</button></div>{dealer.physical_location ? <p className="mt-1 text-xs font-semibold text-white/62">{dealer.physical_location}</p> : null}</div>
        </div>
      </div>
    </section>

    <section className={`border-b ${border}`}>
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <div className="grid grid-cols-3 divide-x divide-current/10 text-center"><Stat value={String(count)} label="Stock" /><Stat value={String(dealer.follower_count || 0)} label="Followers" /><Stat value={average === null ? "—" : average.toFixed(1)} label="Rating" /></div>
        <p className={`mx-auto mt-4 max-w-3xl text-center text-sm font-semibold leading-6 ${muted}`}>{about}</p>
        <div className="mx-auto mt-4 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
          <button type="button" onClick={() => void toggleFollow()} className={`min-h-11 rounded-xl border border-[#f6b800] px-4 text-xs font-black ${following ? "bg-transparent text-[#f6b800]" : "bg-[#f6b800] text-black"}`}>{following ? "Following" : "Follow"}</button>
          <Link href={`/messages?dealer=${encodeURIComponent(dealer.id)}`} className="flex min-h-11 items-center justify-center rounded-xl bg-[#f6b800] px-4 text-xs font-black text-black">Message</Link>
          {dealer.phone_number ? <a href={`tel:${dealer.phone_number}`} className="flex min-h-11 items-center justify-center rounded-xl border border-current/14 px-4 text-xs font-black">Call</a> : <span />}
          {whatsapp ? <a href={`https://wa.me/${whatsapp}`} className="flex min-h-11 items-center justify-center rounded-xl border border-current/14 px-4 text-xs font-black">WhatsApp</a> : null}
        </div>
        <PublicDealerStatus dealerId={dealer.id} dealerSlug={dealer.slug} dealerName={dealer.name} avatarUrl={dealer.profile_image_url} phoneNumber={dealer.phone_number} darkMode={darkMode} />
      </div>
    </section>

    <section id="showroom" className="mx-auto max-w-6xl scroll-mt-24">
      <div className={`flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-6 ${border}`}><div><h2 className="text-2xl font-black tracking-[-.04em]">Showroom</h2><p className={`mt-0.5 text-xs font-semibold ${muted}`}>{count} vehicle{count === 1 ? "" : "s"}</p></div><div className="flex gap-2"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search stock" className={`h-10 w-[118px] rounded-xl border px-3 text-xs font-semibold outline-none sm:w-48 ${darkMode ? "border-white/10 bg-white/[.045] text-white" : "border-black/10 bg-white"}`} /><select value={stock} onChange={(e) => setStock(e.target.value)} className={`h-10 rounded-xl border px-2 text-xs font-bold ${darkMode ? "border-white/10 bg-[#111]" : "border-black/10 bg-white"}`}><option value="all">All</option><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option></select></div></div>
      {stockLoading ? <div className="grid grid-cols-3 gap-[2px] pt-[2px]">{Array.from({ length: 9 }).map((_, i) => <div key={i} className={`aspect-square animate-pulse ${darkMode ? "bg-white/[.06]" : "bg-black/[.06]"}`} />)}</div> : listings.length ? <div className="grid grid-cols-3 gap-[2px] pt-[2px]">{listings.map((item) => <Link key={item.id} href={`/vehicles/${item.id}`} className="group relative aspect-square overflow-hidden bg-[#111]"><img src={item.photos?.[0] || "/images/truck-1.jpg"} onError={imageFallback} alt={listingTitle(item)} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/88 to-transparent px-2 pb-2 pt-7 text-white"><p className="truncate text-[9px] font-black sm:text-xs">{price(item)}</p><p className="truncate text-[8px] text-white/65 sm:text-[10px]">{listingTitle(item)}</p></div></Link>)}</div> : <div className="px-4 py-14 text-center"><h3 className="text-xl font-black">No matching stock</h3><p className={`mt-2 text-sm font-semibold ${muted}`}>Try a broader search or choose all stock.</p></div>}
    </section>

    {updates.length ? <section className={`mx-auto max-w-6xl border-t px-4 py-6 sm:px-6 ${border}`}><h2 className="text-lg font-black">Latest from {dealer.name}</h2><div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto">{updates.map((u) => <article key={u.id} className={`w-[220px] shrink-0 rounded-2xl border p-3 ${glass}`}><div className="flex items-center gap-2">{u.image_url ? <img src={u.image_url} alt="" className="h-10 w-10 rounded-xl object-cover" /> : null}<strong className="line-clamp-2 text-xs">{u.title}</strong></div><p className={`mt-2 line-clamp-3 text-[11px] font-semibold leading-5 ${muted}`}>{u.body}</p></article>)}</div></section> : null}

    <section className={`mx-auto max-w-6xl border-t px-4 pb-14 pt-7 sm:px-6 ${border}`}>
      <div className="grid gap-4 lg:grid-cols-[.85fr_1.15fr]">
        <div className={`rounded-[20px] border p-4 ${glass}`}>
          <div className="flex items-center justify-between gap-3"><div><p className={`text-[9px] font-black uppercase tracking-[.11em] ${muted}`}>Opening hours</p><h2 className="mt-1 text-xl font-black">Trading times</h2></div><span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black ${trading.open ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400" : "border-current/10"}`}><span className={`h-1.5 w-1.5 rounded-full ${trading.open ? "bg-emerald-400" : "bg-current opacity-40"}`} />{trading.label}</span></div>
          <p className={`mt-2 text-xs font-semibold ${muted}`}>{trading.detail}</p>
          <div className="mt-4 grid gap-1.5">{schedule ? DAYS.map((day) => { const h = schedule[day]; return <div key={day} className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs ${day === clock().day ? darkMode ? "bg-white/[.055]" : "bg-black/[.035]" : ""}`}><span className="font-bold">{day}</span><span className={muted}>{!h || h.closed ? "Closed" : `${h.open || "–"} – ${h.close || "–"}`}</span></div>; }) : <p className={`text-sm font-semibold ${muted}`}>Trading hours have not been supplied.</p>}</div>
        </div>

        <div id="reviews" className={`rounded-[20px] border p-4 ${glass}`}>
          <div className="flex items-end justify-between gap-4"><div><p className={`text-[9px] font-black uppercase tracking-[.11em] ${muted}`}>Customer feedback</p><h2 className="mt-1 text-xl font-black">Reviews</h2></div><div className="text-right"><p className="text-2xl font-black tracking-[-.04em]">{average === null ? "—" : average.toFixed(1)}</p><p className={`text-[10px] font-semibold ${muted}`}>{reviews.length} review{reviews.length === 1 ? "" : "s"}</p></div></div>
          {reviews.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{reviews.slice(0, 6).map((r) => <article key={r.id} className={`rounded-2xl border px-3.5 py-3 ${darkMode ? "border-white/[.07] bg-black/20" : "border-black/[.06] bg-white/40"}`}><div className="flex items-center justify-between"><span className="text-[10px] tracking-[.06em] text-[#d49e00]">{"★".repeat(Math.max(1, Math.min(5, Number(r.rating || 0))))}</span><span className={`text-[10px] font-bold ${muted}`}>{Number(r.rating || 0).toFixed(1)}</span></div>{r.body ? <p className={`mt-2 line-clamp-3 text-xs font-semibold leading-5 ${muted}`}>{r.body}</p> : null}</article>)}</div> : <p className={`mt-4 text-sm font-semibold ${muted}`}>No customer reviews yet.</p>}
        </div>
      </div>
      <div className="mt-6 max-w-3xl"><h2 className="text-lg font-black">About this dealership</h2><p className={`mt-2 text-sm font-semibold leading-6 ${muted}`}>{dealer.business_description || about}</p></div>
    </section>

    {verificationOpen ? <div className="fixed inset-0 z-[2147483500] grid place-items-end bg-black/60 p-3 backdrop-blur-md sm:place-items-center" role="dialog" aria-modal="true"><section className={`w-full max-w-sm rounded-[22px] border p-4 shadow-2xl ${darkMode ? "border-white/10 bg-[#0b0b0b]/96" : "border-black/10 bg-white/96"}`}><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#f6b800] text-sm font-black text-black">✓</span><div><p className={`text-[9px] font-black uppercase tracking-[.1em] ${muted}`}>LoadLink verified</p><h2 className="text-base font-black">Verified dealership</h2></div></div><button type="button" onClick={() => setVerificationOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-current/10 text-lg">×</button></div><p className={`mt-4 text-xs font-semibold leading-5 ${muted}`}>Business and verification documents were reviewed for this dealership profile.</p><div className={`mt-4 flex items-center justify-between rounded-xl border px-3 py-2.5 ${darkMode ? "border-white/8 bg-white/[.03]" : "border-black/8 bg-black/[.02]"}`}><span className="text-xs font-bold">Trading now</span><span className={`text-xs font-black ${trading.open ? "text-emerald-400" : ""}`}>{trading.label}</span></div><button type="button" onClick={() => setVerificationOpen(false)} className="mt-4 h-11 w-full rounded-xl bg-[#f6b800] text-xs font-black text-black">Done</button></section></div> : null}
  </main>;
}

function Stat({ value, label }: { value: string; label: string }) { return <div className="min-w-0 px-2"><p className="truncate text-lg font-black">{value}</p><p className="mt-0.5 text-[10px] font-semibold opacity-50">{label}</p></div>; }
