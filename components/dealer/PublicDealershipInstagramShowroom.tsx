"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import PublicDealerStatus from "@/components/dealer/PublicDealerStatus";
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

function todayHours(raw?: string | null) {
  if (!raw) return "Hours not supplied";
  try {
    const data = JSON.parse(raw) as Record<string, { closed?: boolean; open?: string; close?: string }>;
    const day = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
    const value = data[day];
    if (!value) return "Hours available";
    return value.closed ? `${day}: Closed` : `${day}: ${value.open || "–"}–${value.close || "–"}`;
  } catch {
    return raw;
  }
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

  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const border = darkMode ? "border-white/10" : "border-black/10";
  const muted = darkMode ? "text-white/56" : "text-black/56";
  const average = useMemo(() => reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length : null, [reviews]);

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
    <main className={`min-h-screen ${page}`} data-loadlink-public-showroom="instagram-grid-v1">
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
            <div className="flex items-center gap-2"><h2 className="text-lg font-black">{dealer.name}</h2><span className="grid h-5 w-5 place-items-center rounded-full bg-[#f6b800] text-[11px] font-black text-black">✓</span></div>
            <p className={`mt-1 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>{about}</p>
            <p className={`mt-2 text-xs font-semibold ${muted}`}>{todayHours(dealer.trading_hours)}</p>
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

      <section className={`mx-auto mt-10 max-w-6xl border-t px-4 py-8 sm:px-6 ${border}`}>
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-black tracking-[-.03em]">About</h2>
            <p className={`mt-3 text-sm font-semibold leading-7 ${muted}`}>{dealer.business_description || about}</p>
            {dealer.physical_location ? <p className="mt-4 text-sm font-bold">{dealer.physical_location}</p> : null}
          </div>
          <div id="reviews">
            <div className="flex items-end justify-between"><h2 className="text-2xl font-black tracking-[-.03em]">Reviews</h2><span className="text-sm font-black">{average === null ? "—" : `${average.toFixed(1)} / 5`}</span></div>
            {reviews.length ? <div className="mt-4 grid gap-3">{reviews.slice(0, 4).map((review) => <article key={review.id} className={`rounded-2xl border p-4 ${surface}`}><p className="text-xs font-black tracking-[.08em] text-[#f6b800]">{"★".repeat(Math.max(1, Math.min(5, Number(review.rating || 0))))}</p>{review.body ? <p className={`mt-2 text-sm font-semibold leading-6 ${muted}`}>{review.body}</p> : null}</article>)}</div> : <p className={`mt-3 text-sm font-semibold ${muted}`}>No reviews yet.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div className="min-w-0"><p className="truncate text-base font-black sm:text-xl">{value}</p><p className="mt-0.5 text-[10px] font-semibold opacity-55 sm:text-xs">{label}</p></div>;
}
