"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
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
  title: string;
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

function price(item: Listing) {
  if (item.rate) return item.rate;
  if (Number(item.price_amount || 0) > 0) {
    return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(Number(item.price_amount));
  }
  return "POA";
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

function imageFallback(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  if (image.dataset.fallbackApplied === "true") return;
  image.dataset.fallbackApplied = "true";
  image.src = "/images/truck-1.jpg";
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

export default function PublicDealershipExperienceV2({ slug }: { slug: string }) {
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

  const page = darkMode ? "bg-[#050505] text-white" : "bg-[#f4f1e9] text-black";
  const surface = darkMode ? "bg-[#0c0c0c] border-white/10" : "bg-white border-black/10";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const average = useMemo(
    () => reviews.length ? reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / reviews.length : null,
    [reviews],
  );

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      const profile = await supabase.from("public_dealership_profiles").select("*").eq("slug", slug).maybeSingle();
      if (!alive) return;

      if (!profile.data) {
        const moved = await supabase.from("public_dealership_slug_redirects").select("current_slug").eq("old_slug", slug).maybeSingle();
        if (moved.data?.current_slug) window.location.replace(`/dealership/${moved.data.current_slug}`);
        else { setDealer(null); setLoading(false); }
        return;
      }

      const current = profile.data as Dealer;
      setDealer(current);
      const [inventory, reviewResult, updateResult, auth] = await Promise.all([
        supabase.rpc("loadlink_public_dealer_inventory", { p_dealership_id: current.id, p_page: 1, p_page_size: 48, p_query: "", p_stock: "all" }),
        supabase.rpc("loadlink_public_dealer_reviews", { p_dealership_id: current.id, p_limit: 12 }),
        supabase.from("public_dealership_updates").select("id,title,body,image_url").eq("dealership_id", current.id).order("published_at", { ascending: false }).limit(4),
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
    }
    void load();
    return () => { alive = false; };
  }, [slug]);

  useEffect(() => {
    if (!dealer) return;
    const timer = window.setTimeout(async () => {
      setStockLoading(true);
      const result = await supabase.rpc("loadlink_public_dealer_inventory", {
        p_dealership_id: dealer.id,
        p_page: 1,
        p_page_size: 48,
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
  }

  if (loading) {
    return <main className={`min-h-screen ${page}`}><LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} /><div className="grid min-h-[70vh] place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-2 border-current/15 border-t-[#f6b800]" /></div></main>;
  }

  if (!dealer) {
    return <main className={`min-h-screen ${page}`}><LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} /><section className="mx-auto max-w-xl px-5 py-24 text-center"><h1 className="text-3xl font-black">Showroom unavailable</h1><p className={`mt-3 text-sm font-medium ${muted}`}>This dealership has not published a showroom.</p><Link href="/" className="mt-6 inline-flex rounded-2xl bg-[#f6b800] px-5 py-3 text-sm font-black text-black">Back to LoadLink</Link></section></main>;
  }

  const whatsapp = String(dealer.whatsapp_number || dealer.phone_number || "").replace(/\D/g, "");
  const count = listings.length || Number(dealer.active_listing_count || 0);

  return (
    <main className={`min-h-screen ${page}`} data-loadlink-public-showroom="source-v3-modern">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <div className="mx-auto w-full max-w-[1440px] pb-24">
        <section className="relative isolate min-h-[430px] overflow-hidden bg-[#080808] text-white sm:min-h-[480px]">
          <img
            src={dealer.cover_image_url || "/images/jobs/jobs-hero-fleet.jpg"}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center opacity-70"
            onError={imageFallback}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/34 to-black/95" />

          {canEdit ? (
            <Link href="/dealer?section=showroom" className="absolute right-4 top-4 z-20 inline-flex h-11 items-center gap-2 rounded-2xl border border-white/18 bg-black/58 px-4 text-xs font-bold text-white backdrop-blur-xl">
              Edit showroom
            </Link>
          ) : null}

          <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-6 sm:px-8 sm:pb-8 md:px-10">
            <div className="flex items-end gap-4 sm:gap-5">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[22px] border border-white/20 bg-black/70 text-xl font-black text-[#f6b800] shadow-2xl sm:h-24 sm:w-24">
                {dealer.profile_image_url ? <img src={dealer.profile_image_url} alt={`${dealer.name} profile`} className="h-full w-full object-cover" /> : initials(dealer.name)}
              </div>
              <div className="min-w-0 pb-1">
                <p className="text-[11px] font-bold text-[#f6b800]">Verified dealership</p>
                <h1 className="mt-1 truncate text-[clamp(2rem,7vw,4.6rem)] font-black leading-[.96] tracking-[-.045em]">{dealer.name}</h1>
                {dealer.physical_location ? <p className="mt-2 text-sm font-medium text-white/64">{dealer.physical_location}</p> : null}
              </div>
            </div>

            <p className="mt-5 max-w-2xl text-sm font-medium leading-6 text-white/70 sm:text-[15px]">
              {dealer.short_bio || dealer.business_description || "Commercial vehicle dealership on LoadLink."}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => void toggleFollow()} className={`h-11 rounded-2xl px-5 text-xs font-black ${following ? "border border-white/18 bg-white/10 text-white" : "bg-[#f6b800] text-black"}`}>{following ? "Following" : "Follow"}</button>
              <Link href={`/messages?dealer=${encodeURIComponent(dealer.id)}`} className="flex h-11 items-center rounded-2xl border border-white/16 bg-black/46 px-5 text-xs font-bold">Message</Link>
              {dealer.phone_number ? <a href={`tel:${dealer.phone_number}`} className="flex h-11 items-center rounded-2xl border border-white/16 bg-black/46 px-5 text-xs font-bold">Call</a> : null}
              {whatsapp ? <a href={`https://wa.me/${whatsapp}`} className="flex h-11 items-center rounded-2xl border border-white/16 bg-black/46 px-5 text-xs font-bold">WhatsApp</a> : null}
            </div>
          </div>
        </section>

        <section className={`grid grid-cols-2 border-b md:grid-cols-4 ${darkMode ? "border-white/10" : "border-black/10"}`}>
          {[
            [String(count), "Vehicles"],
            [average === null ? "—" : average.toFixed(1), "Rating"],
            [String(dealer.follower_count || 0), "Followers"],
            [todayHours(dealer.trading_hours), "Today"],
          ].map(([value, label]) => (
            <div key={label} className={`min-w-0 px-5 py-5 md:px-7 ${darkMode ? "border-white/10" : "border-black/10"}`}>
              <p className="truncate text-lg font-black tracking-[-.025em]">{value}</p>
              <p className={`mt-1 text-[11px] font-medium ${muted}`}>{label}</p>
            </div>
          ))}
        </section>

        <div className="px-4 sm:px-6 md:px-8">
          <section id="showroom" className="scroll-mt-24 pt-9 md:pt-12">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-bold text-[#b38300]">Available stock</p>
                <h2 className="mt-1 text-3xl font-black tracking-[-.04em] sm:text-4xl">Dealer showroom</h2>
                <p className={`mt-2 text-sm font-medium ${muted}`}>Browse current vehicles directly from {dealer.name}.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(240px,1fr)_150px]">
                <input value={query} onChange={(event) => setQuery(event.target.value)} inputMode="search" placeholder="Search make or model" className={`h-12 rounded-2xl border px-4 text-sm font-medium outline-none focus:border-[#f6b800] ${surface}`} />
                <select value={stock} onChange={(event) => setStock(event.target.value)} className={`h-12 rounded-2xl border px-4 text-sm font-bold outline-none ${surface}`}>
                  <option value="all">All stock</option><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option>
                </select>
              </div>
            </div>

            {stockLoading ? (
              <div className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className={`h-[330px] animate-pulse rounded-[24px] ${darkMode ? "bg-white/[.05]" : "bg-black/[.05]"}`} />)}</div>
            ) : listings.length ? (
              <div className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((item) => (
                  <Link key={item.id} href={`/vehicles/${item.id}`} className={`group overflow-hidden rounded-[24px] border transition hover:-translate-y-0.5 ${surface}`}>
                    <div className="relative aspect-[16/10] overflow-hidden bg-[#111]">
                      <img src={item.photos?.[0] || "/images/truck-1.jpg"} onError={imageFallback} alt={item.title || "Commercial vehicle"} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]" />
                      {item.stock_status ? <span className="absolute left-3 top-3 rounded-full bg-black/72 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur-lg">{item.stock_status}</span> : null}
                    </div>
                    <div className="p-5">
                      <h3 className="truncate text-lg font-black tracking-[-.025em]">{item.title || [item.vehicle_year, item.brand, item.model].filter(Boolean).join(" ") || "Commercial vehicle"}</h3>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className={`truncate text-xs font-medium ${muted}`}>{item.city || "South Africa"}</span>
                        <span className="shrink-0 text-sm font-black text-[#a87900]">{price(item)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={`mt-6 rounded-[24px] border p-10 text-center ${surface}`}><h3 className="text-xl font-black">No matching stock</h3><p className={`mt-2 text-sm font-medium ${muted}`}>Try a broader search or choose all stock.</p></div>
            )}
          </section>

          {updates.length ? (
            <section className="pt-12">
              <h2 className="text-2xl font-black tracking-[-.035em]">Dealer updates</h2>
              <div className="no-scrollbar mt-4 flex gap-4 overflow-x-auto pb-2">
                {updates.map((item) => (
                  <article key={item.id} className={`w-[280px] shrink-0 overflow-hidden rounded-[22px] border ${surface}`}>
                    {item.image_url ? <img src={item.image_url} alt="" onError={imageFallback} className="aspect-[16/9] w-full object-cover" /> : null}
                    <div className="p-5"><h3 className="line-clamp-1 text-base font-black">{item.title}</h3><p className={`mt-2 line-clamp-3 text-sm font-medium leading-6 ${muted}`}>{item.body}</p></div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className={`mt-12 border-t pt-9 ${darkMode ? "border-white/10" : "border-black/10"}`}>
            <h2 className="text-2xl font-black tracking-[-.035em]">Customer reviews</h2>
            {reviews.length ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {reviews.slice(0, 6).map((review) => (
                  <article key={review.id} className={`rounded-[22px] border p-5 ${surface}`}>
                    <p className="text-sm font-black text-[#b38300]">{"★".repeat(Math.max(1, Math.min(5, Number(review.rating || 0))))}</p>
                    {review.body ? <p className={`mt-3 text-sm font-medium leading-6 ${muted}`}>{review.body}</p> : null}
                  </article>
                ))}
              </div>
            ) : <p className={`mt-2 text-sm font-medium ${muted}`}>No reviews yet.</p>}
          </section>
        </div>
      </div>
    </main>
  );
}
