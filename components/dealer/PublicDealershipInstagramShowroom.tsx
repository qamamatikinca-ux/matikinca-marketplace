"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import PublicDealerStatus from "@/components/dealer/PublicDealerStatus";
import { getLoadLinkIntelligence } from "@/lib/loadlinkIntelligence";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Dealer = {
  id: string;
  slug: string;
  name: string;
  profile_image_url?: string | null;
  cover_image_url?: string | null;
  short_bio?: string | null;
  business_description?: string | null;
  physical_location?: string | null;
  phone_number?: string | null;
  whatsapp_number?: string | null;
  trading_hours?: string | null;
  follower_count?: number | null;
  active_listing_count?: number | null;
};

type Listing = {
  id: string;
  title?: string | null;
  city?: string | null;
  rate?: string | null;
  price_amount?: number | null;
  photos?: string[] | null;
  stock_status?: string | null;
  vehicle_year?: number | null;
  brand?: string | null;
  model?: string | null;
};

type Review = { id: string; rating: number; body?: string | null };
type Update = { id: string; title: string; body: string; image_url?: string | null };
type HoursValue = { closed?: boolean; open?: string; close?: string };

type OpenState = {
  label: "Open" | "Closed" | "Hours unavailable";
  open: boolean;
  detail: string;
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "LL";
}

function listingTitle(item: Listing) {
  return item.title || [item.vehicle_year, item.brand, item.model].filter(Boolean).join(" ") || "Commercial vehicle";
}

function price(item: Listing) {
  if (item.rate) return item.rate;
  if (Number(item.price_amount || 0) > 0) {
    return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(Number(item.price_amount));
  }
  return "POA";
}

function imageFallback(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  if (image.dataset.loadlinkFallback === "1") return;
  image.dataset.loadlinkFallback = "1";
  image.src = "/images/truck-1.jpg";
}

function viewerKey() {
  if (typeof window === "undefined") return "server";
  const key = "loadlink-dealer-showroom-viewer-v1";
  let value = localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    localStorage.setItem(key, value);
  }
  return value;
}

function parseHours(raw?: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, HoursValue>;
  } catch {
    return null;
  }
}

function johannesburgClock() {
  const parts = new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
  return { day: pick("weekday"), hour: Number(pick("hour")), minute: Number(pick("minute")) };
}

function minutes(value?: string) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function dealershipOpenState(raw?: string | null): OpenState {
  const schedule = parseHours(raw);
  if (!schedule) return { label: "Hours unavailable", open: false, detail: raw || "Trading hours not supplied" };
  const clock = johannesburgClock();
  const value = schedule[clock.day];
  if (!value || value.closed) return { label: "Closed", open: false, detail: `${clock.day}: Closed` };
  const start = minutes(value.open);
  const end = minutes(value.close);
  const now = clock.hour * 60 + clock.minute;
  if (start === null || end === null) return { label: "Closed", open: false, detail: `${clock.day}: Hours not supplied` };
  const open = end >= start ? now >= start && now < end : now >= start || now < end;
  return {
    label: open ? "Open" : "Closed",
    open,
    detail: `${clock.day}: ${value.open || "–"}–${value.close || "–"}`,
  };
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
  const [membershipLoading, setMembershipLoading] = useState(false);

  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const surface = darkMode ? "border-white/10 bg-white/[.035]" : "border-black/10 bg-white/62";
  const border = darkMode ? "border-white/10" : "border-black/10";
  const muted = darkMode ? "text-white/56" : "text-black/56";
  const average = useMemo(() => reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length : null, [reviews]);
  const openState = useMemo(() => dealershipOpenState(dealer?.trading_hours), [dealer?.trading_hours]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      const profile = await supabase.from("public_dealership_profiles").select("*").eq("slug", slug).maybeSingle();
      if (!alive) return;
      if (!profile.data) {
        const moved = await supabase.from("public_dealership_slug_redirects").select("current_slug").eq("old_slug", slug).maybeSingle();
        if (moved.data?.current_slug) window.location.replace(`/dealership/${moved.data.current_slug}`);
        else {
          setDealer(null);
          setLoading(false);
        }
        return;
      }

      const current = profile.data as Dealer;
      setDealer(current);
      const [inventory, reviewResult, updateResult, auth] = await Promise.all([
        supabase.rpc("loadlink_public_dealer_inventory", { p_dealership_id: current.id, p_page: 1, p_page_size: 60, p_query: "", p_stock: "all" }),
        supabase.rpc("loadlink_public_dealer_reviews", { p_dealership_id: current.id, p_limit: 12 }),
        supabase.from("public_dealership_updates").select("id,title,body,image_url").eq("dealership_id", current.id).order("published_at", { ascending: false }).limit(8),
        supabase.auth.getUser(),
      ]);
      if (!alive) return;

      setListings(((inventory.data || { items: [] }) as { items?: Listing[] }).items || []);
      setReviews((reviewResult.data || []) as Review[]);
      setUpdates((updateResult.data || []) as Update[]);

      const user = auth.data.user;
      if (user) {
        const [follow, owner, staff] = await Promise.all([
          supabase.from("dealership_followers").select("dealership_id").eq("dealership_id", current.id).eq("user_id", user.id).maybeSingle(),
          supabase.from("dealership_profiles").select("id").eq("id", current.id).eq("owner_user_id", user.id).maybeSingle(),
          supabase.from("dealership_staff").select("dealership_id").eq("dealership_id", current.id).eq("user_id", user.id).limit(1).maybeSingle(),
        ]);
        if (!alive) return;
        setFollowing(Boolean(follow.data));
        setCanEdit(Boolean(owner.data || staff.data));
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
      const result = await supabase.rpc("loadlink_public_dealer_inventory", {
        p_dealership_id: dealer.id,
        p_page: 1,
        p_page_size: 60,
        p_query: query.trim(),
        p_stock: stock,
      });
      setListings(((result.data || { items: [] }) as { items?: Listing[] }).items || []);
      setStockLoading(false);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [dealer?.id, query, stock]);

  async function toggleFollow() {
    if (!dealer) return;
    const auth = await supabase.auth.getUser();
    if (!auth.data.user) {
      window.location.assign(`/login?returnTo=${encodeURIComponent(`/dealership/${dealer.slug}`)}`);
      return;
    }
    if (following) {
      const result = await supabase.from("dealership_followers").delete().eq("dealership_id", dealer.id).eq("user_id", auth.data.user.id);
      if (!result.error) setFollowing(false);
    } else {
      const result = await supabase.from("dealership_followers").insert({ dealership_id: dealer.id, user_id: auth.data.user.id });
      if (!result.error) setFollowing(true);
    }
    window.dispatchEvent(new Event("loadlink-dealership-follow-changed"));
  }

  async function openMembership() {
    if (membershipLoading) return;
    setMembershipLoading(true);
    try {
      const intelligence = await getLoadLinkIntelligence();
      if (!intelligence.authenticated) {
        window.location.assign(`/login?returnTo=${encodeURIComponent("/packages")}`);
        return;
      }
      const planState = String(intelligence.plan_state || "").toLowerCase();
      const active = ["active", "trial", "trialing", "grace_period"].includes(planState);
      if (active && intelligence.plan === "dealer") window.location.assign("/dealer");
      else window.location.assign("/packages");
    } catch {
      window.location.assign("/packages");
    } finally {
      setMembershipLoading(false);
    }
  }

  if (loading) {
    return <main className={`min-h-screen ${page}`}><LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} /><div className="grid min-h-[72vh] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-current/15 border-t-[#f6b800]" /></div></main>;
  }

  if (!dealer) {
    return <main className={`min-h-screen ${page}`}><LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} /><section className="mx-auto max-w-xl px-5 py-24 text-center"><h1 className="text-3xl font-black">Showroom unavailable</h1><p className={`mt-3 text-sm font-semibold ${muted}`}>This dealership has not published a showroom.</p><Link href="/following?discover=1" className="mt-6 inline-flex rounded-full bg-[#f6b800] px-6 py-3 text-sm font-black text-black">Find dealerships</Link></section></main>;
  }

  const count = listings.length || Number(dealer.active_listing_count || 0);
  const whatsapp = String(dealer.whatsapp_number || dealer.phone_number || "").replace(/\D/g, "");
  const about = dealer.short_bio || dealer.business_description || "Commercial vehicles and mobile units on LoadLink.";

  return (
    <main className={`min-h-screen ${page}`} data-loadlink-public-showroom="instagram-grid-v2">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="relative isolate min-h-[360px] overflow-hidden bg-[#080808] text-white sm:min-h-[460px] md:min-h-[540px]">
        <img src={dealer.cover_image_url || "/images/jobs/jobs-hero-fleet.jpg"} onError={imageFallback} alt={`${dealer.name} showroom`} className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/12 via-black/20 to-black/88" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/55 to-transparent" />
        {canEdit ? <Link href="/dealer?section=showroom" className="absolute right-4 top-4 z-20 rounded-full border border-[#f6b800]/80 bg-black/55 px-4 py-2.5 text-xs font-black text-[#f6b800] backdrop-blur-xl">Edit showroom</Link> : null}
        <div className="absolute inset-x-0 bottom-0 z-10 mx-auto max-w-6xl px-4 pb-6 sm:px-6 sm:pb-8">
          <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#f6b800]">LoadLink verified dealership</p>
          <h1 className="mt-2 max-w-4xl text-[clamp(2.5rem,9vw,5.7rem)] font-black leading-[.92] tracking-[-.055em]">{dealer.name}</h1>
          {dealer.physical_location ? <p className="mt-3 text-sm font-semibold text-white/68">{dealer.physical_location}</p> : null}
        </div>
      </section>

      <section className={`border-b ${border}`}>
        <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
          <div className="-mt-11 relative z-20 flex items-end justify-between gap-4 sm:-mt-14">
            <div className={`grid h-[92px] w-[92px] shrink-0 place-items-center overflow-hidden rounded-full border-4 ${darkMode ? "border-black bg-[#111]" : "border-[#f4efe3] bg-white"} sm:h-28 sm:w-28`}>
              {dealer.profile_image_url ? <img src={dealer.profile_image_url} onError={imageFallback} alt={`${dealer.name} profile`} className="h-full w-full rounded-full object-cover" /> : <span className="text-xl font-black">{initials(dealer.name)}</span>}
            </div>
            <div className="grid flex-1 grid-cols-3 gap-2 pb-2 text-center sm:max-w-md">
              <Stat value={String(count)} label="Stock" />
              <Stat value={String(dealer.follower_count || 0)} label="Followers" />
              <Stat value={average === null ? "—" : average.toFixed(1)} label="Rating" />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black">{dealer.name}</h2>
              <button type="button" onClick={() => setVerificationOpen(true)} aria-label="View dealership verification" className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[#f6b800] px-2.5 text-[10px] font-black text-black transition active:scale-[.98]"><span aria-hidden="true">✓</span><span>Verified</span></button>
              <span className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-black ${openState.open ? "bg-emerald-500/15 text-emerald-500" : darkMode ? "bg-white/[.07] text-white/60" : "bg-black/[.06] text-black/55"}`}><span className={`h-1.5 w-1.5 rounded-full ${openState.open ? "bg-emerald-500" : "bg-current opacity-60"}`} />{openState.label}</span>
            </div>
            <p className={`mt-1 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>{about}</p>
            <p className={`mt-2 text-xs font-semibold ${muted}`}>{openState.detail}</p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button type="button" onClick={() => void toggleFollow()} className={`flex min-h-11 items-center justify-center rounded-xl border border-[#f6b800] px-4 text-xs font-black transition ${following ? "bg-transparent text-[#f6b800]" : "bg-[#f6b800] text-black shadow-[0_9px_25px_rgba(246,184,0,.20)]"}`}>{following ? "Following" : "Follow"}</button>
            <Link href={`/messages?dealer=${encodeURIComponent(dealer.id)}`} className="flex min-h-11 items-center justify-center rounded-xl border border-[#f6b800] bg-[#f6b800] px-4 text-xs font-black text-black">Message</Link>
            {dealer.phone_number ? <a href={`tel:${dealer.phone_number}`} className="flex min-h-11 items-center justify-center rounded-xl border border-[#f6b800] px-4 text-xs font-black text-[#f6b800]">Call</a> : <span className="hidden sm:block" />}
            {whatsapp ? <a href={`https://wa.me/${whatsapp}`} className="flex min-h-11 items-center justify-center rounded-xl border border-[#f6b800] px-4 text-xs font-black text-[#f6b800]">WhatsApp</a> : null}
          </div>

          <PublicDealerStatus dealerId={dealer.id} dealerSlug={dealer.slug} dealerName={dealer.name} avatarUrl={dealer.profile_image_url} phoneNumber={dealer.phone_number} darkMode={darkMode} />
        </div>
      </section>

      {updates.length ? (
        <section className={`border-b py-5 ${border}`}>
          <div className="no-scrollbar mx-auto flex max-w-6xl gap-4 overflow-x-auto px-4 sm:px-6">
            {updates.map((update) => (
              <article key={update.id} className="w-[76px] shrink-0 text-center">
                <div className="mx-auto h-[68px] w-[68px] rounded-full bg-[#f6b800] p-[2px]">
                  <div className={`h-full w-full overflow-hidden rounded-full border-2 ${darkMode ? "border-black bg-[#111]" : "border-[#f4efe3] bg-white"}`}>
                    <img src={update.image_url || dealer.cover_image_url || "/images/jobs/jobs-hero-fleet.jpg"} onError={imageFallback} alt="" className="h-full w-full object-cover" />
                  </div>
                </div>
                <p className="mt-2 truncate text-[10px] font-bold">{update.title}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section id="showroom" className="mx-auto max-w-6xl scroll-mt-24">
        <div className={`flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-6 ${border}`}>
          <div><h2 className="text-xl font-black tracking-[-.03em]">Showroom</h2><p className={`mt-0.5 text-xs font-semibold ${muted}`}>{count} vehicle{count === 1 ? "" : "s"}</p></div>
          <div className="flex items-center gap-2">
            <input value={query} onChange={(event) => setQuery(event.target.value)} inputMode="search" aria-label="Search showroom" placeholder="Search" className={`h-10 w-[120px] rounded-xl border px-3 text-xs font-semibold outline-none focus:border-[#f6b800] sm:w-48 ${darkMode ? "border-white/12 bg-white/[.04] text-white" : "border-black/10 bg-white text-black"}`} />
            <select value={stock} onChange={(event) => setStock(event.target.value)} aria-label="Stock status" className={`h-10 rounded-xl border px-2 text-xs font-bold outline-none ${darkMode ? "border-white/12 bg-[#111]" : "border-black/10 bg-white"}`}><option value="all">All</option><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option></select>
          </div>
        </div>

        {stockLoading ? (
          <div className="grid grid-cols-3 gap-[2px] pt-[2px]">{Array.from({ length: 9 }).map((_, index) => <div key={index} className={`aspect-square animate-pulse ${darkMode ? "bg-white/[.06]" : "bg-black/[.06]"}`} />)}</div>
        ) : listings.length ? (
          <div className="grid grid-cols-3 gap-[2px] pt-[2px]" data-loadlink-showroom-grid="instagram">
            {listings.map((item) => (
              <Link key={item.id} href={`/vehicles/${item.id}`} aria-label={`${listingTitle(item)} — ${price(item)}`} className="group relative aspect-square overflow-hidden bg-[#111]">
                <img src={item.photos?.[0] || "/images/truck-1.jpg"} onError={imageFallback} alt={listingTitle(item)} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.035]" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/88 via-black/35 to-transparent px-2 pb-2 pt-8 text-white sm:px-3 sm:pb-3">
                  <p className="truncate text-[9px] font-black sm:text-xs">{price(item)}</p>
                  <p className="mt-0.5 truncate text-[8px] font-semibold text-white/70 sm:text-[10px]">{listingTitle(item)}</p>
                </div>
                <span className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-black/30 ${String(item.stock_status || "available").toLowerCase() === "sold" ? "bg-white" : String(item.stock_status || "").toLowerCase() === "reserved" ? "bg-[#f6b800]" : "bg-emerald-400"}`} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-4 py-16 text-center"><h3 className="text-xl font-black">No matching stock</h3><p className={`mt-2 text-sm font-semibold ${muted}`}>Try a broader search or choose all stock.</p></div>
        )}
      </section>

      <section className={`mx-auto mt-9 max-w-6xl border-t px-4 pb-12 pt-7 sm:px-6 ${border}`}>
        <div className="max-w-3xl">
          <h2 className="text-lg font-black tracking-[-.025em]">About this dealership</h2>
          <p className={`mt-2 text-sm font-semibold leading-6 ${muted}`}>{dealer.business_description || about}</p>
          {dealer.physical_location ? <p className="mt-3 text-xs font-bold">{dealer.physical_location}</p> : null}
        </div>

        <div id="reviews" className={`mt-7 border-t pt-6 ${border}`}>
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-[10px] font-black uppercase tracking-[.1em] opacity-42">Customer feedback</p><h2 className="mt-1 text-xl font-black tracking-[-.025em]">Customer reviews</h2></div>
            <div className="text-right"><p className="text-lg font-black">{average === null ? "—" : average.toFixed(1)}</p><p className={`text-[10px] font-semibold ${muted}`}>{reviews.length} review{reviews.length === 1 ? "" : "s"}</p></div>
          </div>
          {reviews.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {reviews.slice(0, 6).map((review) => (
                <article key={review.id} className={`rounded-[16px] border px-3.5 py-3 backdrop-blur-lg ${surface}`}>
                  <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-black tracking-[.06em] text-[#d49e00]">{"★".repeat(Math.max(1, Math.min(5, Number(review.rating || 0))))}</p><span className={`text-[10px] font-semibold ${muted}`}>{Number(review.rating || 0).toFixed(1)} / 5</span></div>
                  {review.body ? <p className={`mt-2 line-clamp-3 text-xs font-semibold leading-5 ${muted}`}>{review.body}</p> : null}
                </article>
              ))}
            </div>
          ) : <p className={`mt-3 text-sm font-semibold ${muted}`}>No customer reviews yet.</p>}
        </div>
      </section>

      {verificationOpen ? (
        <div className="fixed inset-0 z-[2147483500] grid place-items-end bg-black/60 p-3 backdrop-blur-[7px] sm:place-items-center" role="dialog" aria-modal="true" aria-label="Dealership verification details">
          <section className={`w-full max-w-md rounded-[26px] border p-5 shadow-2xl backdrop-blur-2xl ${darkMode ? "border-white/12 bg-[#0b0b0b]/94 text-white" : "border-white/70 bg-white/92 text-black"}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-[#f6b800] text-lg font-black text-black">✓</div>
              <button type="button" onClick={() => setVerificationOpen(false)} className={`grid h-10 w-10 place-items-center rounded-full border text-xl ${darkMode ? "border-white/12 bg-white/[.035]" : "border-black/10 bg-black/[.025]"}`} aria-label="Close verification details">×</button>
            </div>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[.12em] text-[#b88900]">LoadLink verification</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-.04em]">Verified dealership member</h2>
            <p className={`mt-3 text-sm font-semibold leading-6 ${muted}`}>This dealership has submitted the required business and verification documents to LoadLink. Its dealership profile is verified and it is a LoadLink dealership member.</p>
            <div className={`mt-4 rounded-[16px] border px-4 py-3 ${surface}`}><p className="text-[10px] font-black uppercase tracking-[.08em] opacity-42">Trading now</p><p className="mt-1 text-sm font-black">{openState.label} · {openState.detail}</p></div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setVerificationOpen(false)} className={`min-h-12 rounded-[15px] border px-4 text-sm font-bold ${darkMode ? "border-white/14 bg-white/[.035]" : "border-black/10 bg-black/[.025]"}`}>Close</button>
              <button type="button" onClick={() => void openMembership()} disabled={membershipLoading} className="min-h-12 rounded-[15px] bg-[#f6b800] px-4 text-sm font-black text-black disabled:opacity-55">{membershipLoading ? "Checking plan…" : "Become a member"}</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div className="min-w-0"><p className="truncate text-base font-black sm:text-xl">{value}</p><p className="mt-0.5 text-[10px] font-semibold opacity-55 sm:text-xs">{label}</p></div>;
}
