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

function stockLabel(status?: string | null) {
  const value = String(status || "available").trim().toLowerCase();
  if (value === "sold") return "Sold";
  if (value === "reserved") return "Reserved";
  return "Available";
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

  const page = darkMode ? "bg-[#050505] text-white" : "bg-[#f3f0e8] text-[#111]";
  const surface = darkMode ? "border-white/10 bg-[#0c0c0c]" : "border-black/10 bg-white";
  const softer = darkMode ? "bg-white/[.035]" : "bg-black/[.025]";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const border = darkMode ? "border-white/10" : "border-black/10";
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
        else {
          setDealer(null);
          setLoading(false);
        }
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
    return (
      <main className={`min-h-screen ${page}`}>
        <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
        <div className="grid min-h-[70vh] place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-2 border-current/15 border-t-[#f6b800]" /></div>
      </main>
    );
  }

  if (!dealer) {
    return (
      <main className={`min-h-screen ${page}`}>
        <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
        <section className="mx-auto max-w-xl px-5 py-24 text-center">
          <h1 className="text-3xl font-extrabold">Showroom unavailable</h1>
          <p className={`mt-3 text-sm font-medium ${muted}`}>This dealership has not published a showroom.</p>
          <Link href="/" className={`mt-6 inline-flex rounded-full border px-5 py-3 text-sm font-semibold ${border}`}>Back to LoadLink</Link>
        </section>
      </main>
    );
  }

  const whatsapp = String(dealer.whatsapp_number || dealer.phone_number || "").replace(/\D/g, "");
  const count = listings.length || Number(dealer.active_listing_count || 0);
  const profileCopy = dealer.short_bio || dealer.business_description || "Commercial vehicles, listed and managed on LoadLink.";

  return (
    <main className={`min-h-screen ${page}`} data-loadlink-public-showroom="brand-showroom-v4">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <div className="mx-auto w-full max-w-[1440px] pb-24 sm:px-4 md:px-6">
        <section className="relative isolate min-h-[500px] overflow-hidden bg-[#080808] text-white sm:mt-4 sm:min-h-[540px] sm:rounded-[32px]">
          <img
            src={dealer.cover_image_url || "/images/jobs/jobs-hero-fleet.jpg"}
            alt={`${dealer.name} dealership cover`}
            className="absolute inset-0 h-full w-full object-cover object-center opacity-80"
            onError={imageFallback}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/18 via-black/30 to-black/95" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_22%,rgba(255,255,255,.08),transparent_34%)]" />

          {canEdit ? (
            <Link href="/dealer?section=showroom" className="absolute right-4 top-4 z-20 inline-flex h-10 items-center rounded-full border border-white/20 bg-black/55 px-4 text-[11px] font-semibold text-white backdrop-blur-xl sm:right-6 sm:top-6">
              Edit showroom
            </Link>
          ) : null}

          <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-7 sm:px-8 sm:pb-9 md:px-10 md:pb-10">
            <div className="flex items-end gap-4 sm:gap-5">
              <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border-[3px] border-white bg-[#141414] text-xl font-bold text-white shadow-[0_18px_46px_rgba(0,0,0,.34)] sm:h-28 sm:w-28">
                {dealer.profile_image_url ? (
                  <img src={dealer.profile_image_url} alt={`${dealer.name} profile`} className="h-full w-full rounded-full object-cover" onError={imageFallback} />
                ) : initials(dealer.name)}
              </div>

              <div className="min-w-0 pb-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/16 bg-black/42 px-2.5 py-1 text-[10px] font-semibold text-white/82 backdrop-blur">
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-white text-[10px] text-black">✓</span>
                    Verified dealership
                  </span>
                  {dealer.physical_location ? <span className="text-[11px] font-medium text-white/58">{dealer.physical_location}</span> : null}
                </div>
                <h1 className="max-w-4xl text-[clamp(2.25rem,7vw,5.2rem)] font-extrabold leading-[.94] tracking-[-.045em]">{dealer.name}</h1>
              </div>
            </div>

            <p className="mt-5 max-w-2xl text-sm font-medium leading-6 text-white/72 sm:text-[15px]">{profileCopy}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void toggleFollow()}
                className={`h-11 rounded-full px-5 text-xs font-bold transition active:scale-[.99] ${following ? "border border-white/20 bg-white/10 text-white" : "bg-[#f6b800] text-black"}`}
              >
                {following ? "Following" : "Follow dealership"}
              </button>
              <Link href={`/messages?dealer=${encodeURIComponent(dealer.id)}`} className="flex h-11 items-center rounded-full border border-white/18 bg-black/44 px-5 text-xs font-semibold text-white backdrop-blur">Message</Link>
              {dealer.phone_number ? <a href={`tel:${dealer.phone_number}`} className="flex h-11 items-center rounded-full border border-white/18 bg-black/44 px-5 text-xs font-semibold text-white backdrop-blur">Call</a> : null}
              {whatsapp ? <a href={`https://wa.me/${whatsapp}`} className="flex h-11 items-center rounded-full border border-white/18 bg-black/44 px-5 text-xs font-semibold text-white backdrop-blur">WhatsApp</a> : null}
            </div>
          </div>
        </section>

        <section className={`relative mx-4 -mt-5 z-20 grid grid-cols-2 overflow-hidden rounded-[24px] border shadow-[0_18px_50px_rgba(0,0,0,.08)] md:mx-8 md:grid-cols-4 ${surface}`}>
          {[
            [String(count), "Vehicles"],
            [average === null ? "—" : average.toFixed(1), "Rating"],
            [String(dealer.follower_count || 0), "Followers"],
            [todayHours(dealer.trading_hours), "Today"],
          ].map(([value, label], index) => (
            <div key={label} className={`min-w-0 px-5 py-5 ${index % 2 ? "" : "border-r"} ${index < 2 ? "border-b md:border-b-0" : ""} md:border-r md:last:border-r-0 ${border}`}>
              <p className="truncate text-base font-bold sm:text-lg">{value}</p>
              <p className={`mt-1 text-[11px] font-medium ${muted}`}>{label}</p>
            </div>
          ))}
        </section>

        <nav className={`mx-4 mt-5 flex gap-1 overflow-x-auto rounded-full border p-1 sm:mx-6 md:mx-8 ${surface}`} aria-label="Dealership showroom sections">
          <a href="#inventory" className="shrink-0 rounded-full px-4 py-2.5 text-xs font-semibold">Inventory</a>
          {updates.length ? <a href="#updates" className="shrink-0 rounded-full px-4 py-2.5 text-xs font-semibold">Updates</a> : null}
          <a href="#reviews" className="shrink-0 rounded-full px-4 py-2.5 text-xs font-semibold">Reviews</a>
        </nav>

        <section id="inventory" className="scroll-mt-28 px-4 pt-10 sm:px-6 md:px-8 md:pt-14">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className={`text-xs font-medium ${muted}`}>Current showroom</p>
              <h2 className="mt-1 text-3xl font-extrabold tracking-[-.035em] sm:text-4xl">Available vehicles</h2>
              <p className={`mt-2 text-sm font-medium ${muted}`}>Browse stock directly from {dealer.name}.</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-[minmax(240px,1fr)_150px]">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                inputMode="search"
                placeholder="Search make, model or vehicle"
                className={`h-12 rounded-[16px] border px-4 text-sm font-medium outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.045] text-white placeholder:text-white/30" : "border-black/10 bg-white text-black placeholder:text-black/35"}`}
              />
              <select
                value={stock}
                onChange={(event) => setStock(event.target.value)}
                className={`h-12 rounded-[16px] border px-4 text-sm font-semibold outline-none ${darkMode ? "border-white/12 bg-[#111] text-white" : "border-black/10 bg-white text-black"}`}
              >
                <option value="all">All stock</option>
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="sold">Sold</option>
              </select>
            </div>
          </div>

          {stockLoading ? (
            <div className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => <div key={index} className={`h-[330px] animate-pulse rounded-[22px] ${darkMode ? "bg-white/[.05]" : "bg-black/[.05]"}`} />)}
            </div>
          ) : listings.length ? (
            <div className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((item) => (
                <Link key={item.id} href={`/vehicles/${item.id}`} className={`group overflow-hidden rounded-[22px] border transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(0,0,0,.10)] ${surface}`}>
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#111]">
                    <img
                      src={item.photos?.[0] || "/images/truck-1.jpg"}
                      onError={imageFallback}
                      alt={item.title || "Commercial vehicle"}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                    />
                    <span className="absolute left-3 top-3 rounded-full border border-white/16 bg-black/62 px-3 py-1.5 text-[10px] font-semibold text-white backdrop-blur">{stockLabel(item.stock_status)}</span>
                  </div>
                  <div className="p-5">
                    <p className="line-clamp-1 text-lg font-bold tracking-[-.02em]">{item.title || [item.vehicle_year, item.brand, item.model].filter(Boolean).join(" ") || "Commercial vehicle"}</p>
                    <p className={`mt-1 text-xs font-medium ${muted}`}>{item.city || dealer.physical_location || "South Africa"}</p>
                    <div className={`mt-5 flex items-center justify-between gap-3 border-t pt-4 ${border}`}>
                      <span className="text-base font-bold">{price(item)}</span>
                      <span className={`text-xs font-semibold ${muted}`}>View vehicle →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className={`mt-6 rounded-[22px] border p-10 text-center ${surface}`}>
              <h3 className="text-xl font-bold">No matching stock</h3>
              <p className={`mt-2 text-sm font-medium ${muted}`}>Try a broader search or choose all stock.</p>
            </div>
          )}
        </section>

        {updates.length ? (
          <section id="updates" className="scroll-mt-28 px-4 pt-14 sm:px-6 md:px-8 md:pt-16">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className={`text-xs font-medium ${muted}`}>From the dealership</p>
                <h2 className="mt-1 text-3xl font-extrabold tracking-[-.035em]">Latest updates</h2>
              </div>
            </div>
            <div className="no-scrollbar mt-5 flex gap-4 overflow-x-auto pb-2">
              {updates.map((item) => (
                <article key={item.id} className={`w-[285px] shrink-0 overflow-hidden rounded-[22px] border ${surface}`}>
                  {item.image_url ? <img src={item.image_url} alt="" onError={imageFallback} className="aspect-[16/9] w-full object-cover" /> : <div className={`aspect-[16/9] ${softer}`} />}
                  <div className="p-5">
                    <h3 className="line-clamp-1 text-base font-bold">{item.title}</h3>
                    <p className={`mt-2 line-clamp-3 text-sm font-medium leading-6 ${muted}`}>{item.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section id="reviews" className="scroll-mt-28 px-4 pt-14 sm:px-6 md:px-8 md:pt-16">
          <div className="grid gap-5 md:grid-cols-[280px_minmax(0,1fr)]">
            <div className={`rounded-[24px] border p-6 ${surface}`}>
              <p className={`text-xs font-medium ${muted}`}>Customer feedback</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-5xl font-extrabold tracking-[-.05em]">{average === null ? "—" : average.toFixed(1)}</span>
                <span className={`pb-1 text-sm font-medium ${muted}`}>/ 5</span>
              </div>
              <p className={`mt-3 text-sm font-medium ${muted}`}>{reviews.length ? `${reviews.length} verified review${reviews.length === 1 ? "" : "s"}` : "No reviews yet"}</p>
            </div>

            {reviews.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {reviews.slice(0, 6).map((review) => (
                  <article key={review.id} className={`rounded-[22px] border p-5 ${surface}`}>
                    <p className="text-sm font-semibold tracking-[.08em]">{"★".repeat(Math.max(1, Math.min(5, Number(review.rating || 0))))}</p>
                    {review.body ? <p className={`mt-3 text-sm font-medium leading-6 ${muted}`}>{review.body}</p> : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className={`grid min-h-[180px] place-items-center rounded-[24px] border p-8 text-center ${surface}`}>
                <div><h3 className="text-lg font-bold">No reviews yet</h3><p className={`mt-2 text-sm font-medium ${muted}`}>Customer feedback will appear here once reviews are submitted.</p></div>
              </div>
            )}
          </div>
        </section>

        {dealer.business_description && dealer.business_description !== dealer.short_bio ? (
          <section className="px-4 pt-14 sm:px-6 md:px-8 md:pt-16">
            <div className={`rounded-[24px] border p-6 sm:p-8 ${surface}`}>
              <p className={`text-xs font-medium ${muted}`}>About the dealership</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-[-.025em]">{dealer.name}</h2>
              <p className={`mt-4 max-w-3xl text-sm font-medium leading-7 ${muted}`}>{dealer.business_description}</p>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
