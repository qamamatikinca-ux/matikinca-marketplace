"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import LoadLinkPagination from "@/components/LoadLinkPagination";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import PublicDealerStatus from "@/components/dealer/PublicDealerStatus";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

const PAGE_SIZE = 24;

type Dealer = {
  id: string;
  slug: string;
  name: string;
  profile_image_url?: string | null;
  cover_image_url?: string | null;
  short_bio?: string | null;
  business_description?: string | null;
  physical_location?: string | null;
  contact_email?: string | null;
  phone_number?: string | null;
  whatsapp_number?: string | null;
  website_url?: string | null;
  trading_hours?: string | null;
  year_established?: number | null;
  follower_count?: number | null;
  active_listing_count?: number | null;
  average_response_minutes?: number | null;
  response_rate?: number | null;
};

type Listing = {
  id: string;
  title: string;
  city: string;
  rate: string;
  price_amount?: number | null;
  photos?: string[] | null;
  stock_status?: string | null;
  vehicle_year?: number | null;
  brand?: string | null;
  model?: string | null;
  created_at?: string | null;
};

type Update = {
  id: string;
  update_type: string;
  title: string;
  body: string;
  image_url?: string | null;
  listing_id?: string | null;
  published_at?: string | null;
  created_at: string;
};

type Review = {
  id: string;
  rating: number;
  body?: string | null;
  dealer_response?: string | null;
  dealer_response_at?: string | null;
  created_at: string;
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "LL";
}

function viewerKey() {
  if (typeof window === "undefined") return "server";
  const key = "loadlink-dealer-showroom-viewer-v1";
  let value = window.localStorage.getItem(key);
  if (!value) {
    value = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    window.localStorage.setItem(key, value);
  }
  return value;
}

export default function PublicDealershipExperience({ slug }: { slug: string }) {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockLoading, setStockLoading] = useState(false);
  const [following, setFollowing] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [stock, setStock] = useState("all");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewNotice, setReviewNotice] = useState("");

  const muted = darkMode ? "text-white/52" : "text-black/52";
  const surface = darkMode
    ? "border-white/10 bg-[#0c0c0c]/92 text-white"
    : "border-black/10 bg-white/72 text-black backdrop-blur-xl";

  useEffect(() => { void loadDealer(); }, [slug]);
  useEffect(() => {
    if (!dealer) return;
    const timeout = window.setTimeout(() => void loadStock(1), 220);
    return () => window.clearTimeout(timeout);
  }, [dealer?.id, query, stock]);

  const reviewAverage = useMemo(() => {
    if (!reviews.length) return null;
    return reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length;
  }, [reviews]);

  async function loadDealer() {
    setLoading(true);
    const profile = await supabase.from("public_dealership_profiles").select("*").eq("slug", slug).maybeSingle();
    if (!profile.data) {
      const redirect = await supabase.from("public_dealership_slug_redirects").select("current_slug").eq("old_slug", slug).maybeSingle();
      if (redirect.data?.current_slug) {
        window.location.replace(`/dealership/${redirect.data.current_slug}`);
        return;
      }
      setDealer(null);
      setLoading(false);
      return;
    }

    const loadedDealer = profile.data as Dealer;
    setDealer(loadedDealer);

    const [updateResult, reviewResult, auth] = await Promise.all([
      supabase.from("public_dealership_updates").select("*").eq("dealership_id", loadedDealer.id).order("published_at", { ascending: false }).limit(6),
      supabase.rpc("loadlink_public_dealer_reviews", { p_dealership_id: loadedDealer.id, p_limit: 20 }),
      supabase.auth.getUser(),
    ]);

    setUpdates((updateResult.data || []) as Update[]);
    setReviews((reviewResult.data || []) as Review[]);
    void recordProfileView(loadedDealer.id);

    if (auth.data.user) {
      const follower = await supabase
        .from("dealership_followers")
        .select("dealership_id")
        .eq("dealership_id", loadedDealer.id)
        .eq("user_id", auth.data.user.id)
        .maybeSingle();
      setFollowing(Boolean(follower.data));
    } else {
      setFollowing(false);
    }

    await loadStock(1, loadedDealer.id);
    setLoading(false);
  }

  async function loadReviews(dealerId = dealer?.id) {
    if (!dealerId) return;
    const result = await supabase.rpc("loadlink_public_dealer_reviews", { p_dealership_id: dealerId, p_limit: 20 });
    if (!result.error) setReviews((result.data || []) as Review[]);
  }

  async function loadStock(nextPage = 1, dealerId = dealer?.id) {
    if (!dealerId) return;
    setStockLoading(true);
    const result = await supabase.rpc("loadlink_public_dealer_inventory", {
      p_dealership_id: dealerId,
      p_page: nextPage,
      p_page_size: PAGE_SIZE,
      p_query: query.trim(),
      p_stock: stock,
    });
    const payload = (result.data || { items: [], total: 0, page: nextPage, pages: 1 }) as {
      items: Listing[];
      total: number;
      page: number;
      pages: number;
    };
    setListings(payload.items || []);
    setTotal(Number(payload.total || 0));
    setPages(Math.max(1, Number(payload.pages || 1)));
    setPage(Number(payload.page || nextPage));
    setStockLoading(false);
  }

  async function recordProfileView(dealerId: string) {
    try {
      await supabase.rpc("loadlink_record_dealer_profile_view", {
        p_dealership_id: dealerId,
        p_viewer_key: viewerKey(),
        p_source: "showroom",
      });
    } catch {}
  }

  async function toggleFollow() {
    if (!dealer) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.assign(`/login?returnTo=${encodeURIComponent(`/dealership/${dealer.slug}`)}`);
      return;
    }

    if (following) {
      const result = await supabase.from("dealership_followers").delete().eq("dealership_id", dealer.id).eq("user_id", user.id);
      if (!result.error) {
        setFollowing(false);
        setDealer((current) => current ? { ...current, follower_count: Math.max(0, Number(current.follower_count || 0) - 1) } : current);
      }
    } else {
      const result = await supabase.from("dealership_followers").insert({ dealership_id: dealer.id, user_id: user.id });
      if (!result.error) {
        setFollowing(true);
        setDealer((current) => current ? { ...current, follower_count: Number(current.follower_count || 0) + 1 } : current);
      }
    }
  }

  async function submitReview(event: FormEvent) {
    event.preventDefault();
    if (!dealer || reviewSubmitting) return;
    setReviewNotice("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.assign(`/login?returnTo=${encodeURIComponent(`/dealership/${dealer.slug}#reviews`)}`);
      return;
    }

    const body = reviewBody.trim();
    if (body.length < 5) {
      setReviewNotice("Write at least 5 characters about your experience.");
      return;
    }

    setReviewSubmitting(true);
    const result = await supabase.rpc("loadlink_submit_public_dealer_review", {
      p_dealership_id: dealer.id,
      p_rating: reviewRating,
      p_body: body,
    });
    setReviewSubmitting(false);

    if (result.error) {
      setReviewNotice(result.error.message || "Your review could not be submitted.");
      return;
    }

    setReviewNotice("Review published.");
    setReviewBody("");
    await loadReviews(dealer.id);
    window.setTimeout(() => {
      setReviewOpen(false);
      setReviewNotice("");
    }, 900);
  }

  function responseText() {
    if (!dealer?.average_response_minutes) return "Response time unavailable";
    if (dealer.average_response_minutes < 60) return `Usually replies in about ${Math.max(1, Math.round(dealer.average_response_minutes))} min`;
    return `Usually replies in about ${Math.max(1, Math.round(dealer.average_response_minutes / 60))} hr`;
  }

  return (
    <main className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4efe3] text-black"}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      {loading ? (
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-current/10 border-t-[#f6b800]" />
        </div>
      ) : !dealer ? (
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-3xl font-black">Dealership not available</h1>
          <p className={`mt-3 ${muted}`}>This showroom is not public or could not be found.</p>
        </div>
      ) : (
        <section className="mx-auto max-w-7xl px-3 pb-16 pt-3 sm:px-4 md:px-6 md:pt-7">
          <section className="relative min-h-[330px] overflow-hidden rounded-[30px] border border-white/10 bg-[#080808] text-white shadow-[0_18px_55px_rgba(0,0,0,.16)] md:min-h-[390px]">
            {dealer.cover_image_url ? <img src={dealer.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" /> : null}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(246,184,0,.12),transparent_35%)]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/62 to-black/12" />

            <div className="relative flex min-h-[330px] flex-col justify-end p-5 md:min-h-[390px] md:p-8">
              <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div className="flex min-w-0 items-end gap-4">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/20 bg-black text-sm font-black text-[#f6b800] shadow-[0_10px_30px_rgba(0,0,0,.35)] md:h-28 md:w-28">
                    {dealer.profile_image_url ? <img src={dealer.profile_image_url} alt={`${dealer.name} logo`} className="h-full w-full object-cover" /> : initials(dealer.name)}
                  </div>
                  <div className="min-w-0 pb-1">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[.08em] text-white/62">
                      <span className="rounded-full border border-white/16 bg-black/32 px-2.5 py-1 text-white backdrop-blur">Verified dealership</span>
                      {dealer.physical_location ? <span>{dealer.physical_location}</span> : null}
                    </div>
                    <h1 className="mt-2 text-3xl font-black tracking-[-.045em] sm:text-4xl md:text-5xl">{dealer.name}</h1>
                    <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/66">{dealer.short_bio || "Commercial vehicle dealership on LoadLink."}</p>
                    <p className="mt-2 text-[11px] font-bold text-white/48">{responseText()}{dealer.response_rate ? ` · ${Math.round(Number(dealer.response_rate))}% response rate` : ""}</p>
                  </div>
                </div>

                <div className="flex max-w-full gap-2 overflow-x-auto pb-0.5">
                  <button type="button" onClick={() => void toggleFollow()} className={`flex h-11 shrink-0 items-center rounded-full px-5 text-xs font-black ${following ? "border border-white/20 bg-white/10 text-white backdrop-blur" : "bg-[#f6b800] text-black"}`}>{following ? "Following" : "Follow"}</button>
                  <a href="#showroom" className="flex h-11 shrink-0 items-center rounded-full border border-white/20 bg-black/42 px-5 text-xs font-black backdrop-blur">View showroom</a>
                  <a href={`/messages?dealer=${encodeURIComponent(dealer.id)}&returnTo=${encodeURIComponent(`/dealership/${dealer.slug}`)}`} className="flex h-11 shrink-0 items-center rounded-full border border-white/20 bg-black/42 px-5 text-xs font-black backdrop-blur">Message</a>
                  {dealer.phone_number ? <a href={`tel:${dealer.phone_number}`} className="flex h-11 shrink-0 items-center rounded-full border border-white/20 bg-black/42 px-5 text-xs font-black backdrop-blur">Call</a> : null}
                </div>
              </div>
            </div>
          </section>

          <section className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Dealership public information">
            <Benefit label="Opening hours" value={dealer.trading_hours || "Ask dealership"} darkMode={darkMode} />
            <Benefit label="Customer reviews" value={reviewAverage === null ? "No reviews yet" : `${reviewAverage.toFixed(1)} / 5 · ${reviews.length} recent`} darkMode={darkMode} />
            <Benefit label="Showroom" value={`${total || Number(dealer.active_listing_count || 0)} active vehicle${(total || Number(dealer.active_listing_count || 0)) === 1 ? "" : "s"}`} darkMode={darkMode} />
            <Benefit label="Followers" value={String(Number(dealer.follower_count || 0))} darkMode={darkMode} />
            <Benefit label="Response" value={responseText()} darkMode={darkMode} />
          </section>

          <PublicDealerStatus
            dealerId={dealer.id}
            dealerSlug={dealer.slug}
            dealerName={dealer.name}
            avatarUrl={dealer.profile_image_url}
            phoneNumber={dealer.phone_number}
            darkMode={darkMode}
          />

          <section id="showroom" className={`mt-5 scroll-mt-24 overflow-hidden rounded-[28px] border ${surface}`}>
            <div className="border-b border-current/10 p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[.1em] opacity-42">Dealership showroom</div>
                  <h2 className="mt-1 text-3xl font-black tracking-[-.045em]">Current stock</h2>
                  <p className={`mt-1 text-xs font-semibold ${muted}`}>{total} active vehicle{total === 1 ? "" : "s"}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-[260px_150px]">
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this showroom" className={`h-11 rounded-[15px] border px-3.5 text-sm font-semibold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.04]" : "border-black/10 bg-white/60"}`} />
                  <select value={stock} onChange={(event) => setStock(event.target.value)} data-loadlink-native-ui="true" aria-label="Showroom stock" className={`h-11 rounded-[15px] border px-3 text-xs font-bold outline-none ${darkMode ? "border-white/12 bg-[#111]" : "border-black/10 bg-white/60"}`}>
                    <option value="all">Available + reserved</option>
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                  </select>
                </div>
              </div>
            </div>

            {stockLoading ? (
              <div className="grid grid-cols-3 gap-[2px] p-[2px]">
                {Array.from({ length: 9 }, (_, index) => <div key={index} className={`aspect-square animate-pulse ${darkMode ? "bg-white/[.05]" : "bg-black/[.05]"}`} />)}
              </div>
            ) : listings.length ? (
              <div className="grid grid-cols-3 gap-[2px] bg-current/[.06] p-[2px]">
                {listings.map((item) => (
                  <Link key={item.id} href={`/vehicles/${item.id}`} className="group relative aspect-square min-w-0 overflow-hidden bg-black/10" aria-label={`View ${item.title}`}>
                    {item.photos?.[0] ? <img src={item.photos[0]} alt={item.title} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]" /> : <div className="flex h-full w-full items-center justify-center bg-[#111] px-2 text-center text-[9px] font-black uppercase text-[#f6b800]">LoadLink vehicle</div>}
                    <div className="absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-black/86 to-transparent p-3 pt-8 text-white sm:block">
                      <div className="truncate text-xs font-black">{item.title}</div>
                      <div className="mt-0.5 truncate text-[10px] font-semibold text-white/66">{item.rate}</div>
                    </div>
                    {item.stock_status === "reserved" ? <span className="absolute right-2 top-2 rounded-full bg-black/72 px-2 py-1 text-[8px] font-black uppercase text-white backdrop-blur">Reserved</span> : null}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center">
                <p className="font-black">No matching showroom stock</p>
                <p className={`mt-2 text-xs font-semibold ${muted}`}>Try another search or follow the dealership for new arrivals.</p>
              </div>
            )}

            {pages > 1 ? <div className="border-t border-current/10 p-4"><LoadLinkPagination current={page} total={pages} onChange={(nextPage) => void loadStock(nextPage)} darkMode={darkMode} label="Dealership showroom pages" /></div> : null}
          </section>

          {updates.length ? (
            <section className={`mt-5 overflow-hidden rounded-[28px] border ${surface}`}>
              <div className="flex items-end justify-between gap-4 border-b border-current/10 px-4 py-4 sm:px-5">
                <div><h2 className="text-xl font-black">Latest from the dealership</h2><p className={`mt-1 text-xs font-semibold ${muted}`}>Stock, promotions and dealership notices.</p></div>
                <span className="text-[10px] font-black uppercase opacity-35">Updates</span>
              </div>
              <div className="grid divide-y divide-current/10 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
                {updates.slice(0, 3).map((update) => (
                  <article key={update.id} className="p-4 sm:p-5">
                    {update.image_url ? <img src={update.image_url} alt="" loading="lazy" className="mb-4 aspect-[16/9] w-full rounded-[18px] object-cover" /> : null}
                    <div className={`text-[9px] font-black uppercase tracking-[.08em] ${muted}`}>{update.update_type.replaceAll("_", " ")}</div>
                    <h3 className="mt-2 text-base font-black">{update.title}</h3>
                    <p className={`mt-2 line-clamp-3 text-sm leading-6 ${muted}`}>{update.body}</p>
                    {update.listing_id ? <Link href={`/vehicles/${update.listing_id}`} className="mt-3 inline-block text-xs font-black underline underline-offset-4">View vehicle</Link> : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section id="reviews" className={`mt-5 scroll-mt-24 overflow-hidden rounded-[28px] border ${surface}`}>
            <div className="flex flex-col gap-4 border-b border-current/10 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.1em] opacity-42">Customer feedback</div>
                <h2 className="mt-1 text-2xl font-black">Reviews</h2>
                <p className={`mt-1 text-xs font-semibold ${muted}`}>{reviewAverage === null ? "Be the first customer to review this dealership." : `${reviewAverage.toFixed(1)} / 5 across ${reviews.length} recent public review${reviews.length === 1 ? "" : "s"}.`}</p>
              </div>
              <button type="button" onClick={() => { setReviewOpen((value) => !value); setReviewNotice(""); }} className="h-11 w-fit rounded-full bg-[#f6b800] px-5 text-xs font-black text-black">{reviewOpen ? "Close review" : "Write a review"}</button>
            </div>

            {reviewOpen ? (
              <form onSubmit={submitReview} className={`border-b border-current/10 p-4 sm:p-5 ${darkMode ? "bg-white/[.025]" : "bg-white/38"}`}>
                <div className="max-w-2xl">
                  <label className="text-xs font-black">Rating</label>
                  <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Review rating">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button key={rating} type="button" onClick={() => setReviewRating(rating)} role="radio" aria-checked={reviewRating === rating} className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-black ${reviewRating === rating ? "border-[#f6b800] bg-[#f6b800] text-black" : "border-current/15"}`}>{rating}</button>
                    ))}
                  </div>
                  <label htmlFor="loadlink-public-review" className="mt-4 block text-xs font-black">Your experience</label>
                  <textarea id="loadlink-public-review" value={reviewBody} onChange={(event) => setReviewBody(event.target.value)} maxLength={1200} placeholder="What was the dealership like to deal with?" className={`mt-2 min-h-28 w-full resize-y rounded-[18px] border p-3.5 text-sm font-semibold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-black/35" : "border-black/10 bg-white/60"}`} />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button type="submit" disabled={reviewSubmitting} className="h-11 rounded-full bg-[#f6b800] px-5 text-xs font-black text-black disabled:opacity-45">{reviewSubmitting ? "Publishing…" : "Publish review"}</button>
                    <span className={`text-[11px] font-semibold ${reviewNotice === "Review published." ? "text-current" : muted}`}>{reviewNotice || `${reviewBody.length}/1200`}</span>
                  </div>
                </div>
              </form>
            ) : null}

            {reviews.length ? (
              <div className="grid divide-y divide-current/10 md:grid-cols-2 md:divide-x md:divide-y-0">
                {reviews.slice(0, 8).map((review) => (
                  <article key={review.id} className="p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-black">{review.rating} / 5</div>
                      <div className={`text-[10px] font-semibold ${muted}`}>{new Date(review.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</div>
                    </div>
                    {review.body ? <p className={`mt-3 text-sm leading-6 ${muted}`}>{review.body}</p> : null}
                    {review.dealer_response ? <div className="mt-4 rounded-[16px] border border-current/10 p-3"><div className="text-[10px] font-black uppercase tracking-[.06em] opacity-45">Dealership response</div><p className={`mt-1.5 text-sm leading-6 ${muted}`}>{review.dealer_response}</p></div> : null}
                  </article>
                ))}
              </div>
            ) : !reviewOpen ? (
              <div className="p-8 text-center"><p className="font-black">No public reviews yet</p><p className={`mt-2 text-xs font-semibold ${muted}`}>Customers can publish a rating and review directly on this dealership profile.</p></div>
            ) : null}
          </section>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
            {dealer.business_description ? (
              <section className={`rounded-[28px] border p-5 ${surface}`}>
                <h2 className="text-xl font-black">About {dealer.name}</h2>
                <p className={`mt-3 max-w-3xl text-sm font-semibold leading-7 ${muted}`}>{dealer.business_description}</p>
              </section>
            ) : <div />}

            <aside className={`rounded-[28px] border p-5 ${surface}`}>
              <h2 className="text-lg font-black">Dealership details</h2>
              <div className="mt-4 space-y-4 text-sm font-semibold">
                <Detail label="Location" value={dealer.physical_location} muted={muted} />
                <Detail label="Opening hours" value={dealer.trading_hours} muted={muted} />
                <Detail label="Established" value={dealer.year_established ? String(dealer.year_established) : null} muted={muted} />
                <Detail label="Active showroom stock" value={String(total || Number(dealer.active_listing_count || 0))} muted={muted} />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {dealer.whatsapp_number ? <a href={`https://wa.me/${dealer.whatsapp_number.replace(/\D/g, "")}`} className="rounded-full border border-current/15 px-4 py-2.5 text-xs font-black">WhatsApp</a> : null}
                {dealer.website_url ? <a href={dealer.website_url} target="_blank" rel="noreferrer" className="rounded-full border border-current/15 px-4 py-2.5 text-xs font-black">Website</a> : null}
                {dealer.contact_email ? <a href={`mailto:${dealer.contact_email}`} className="rounded-full border border-current/15 px-4 py-2.5 text-xs font-black">Email</a> : null}
              </div>
            </aside>
          </div>
        </section>
      )}
    </main>
  );
}

function Benefit({ label, value, darkMode }: { label: string; value: string; darkMode: boolean }) {
  return (
    <div className={`min-w-[176px] shrink-0 rounded-[20px] border px-4 py-3 ${darkMode ? "border-white/10 bg-white/[.035]" : "border-black/10 bg-white/62 backdrop-blur-xl"}`}>
      <div className="text-[9px] font-black uppercase tracking-[.08em] opacity-40">{label}</div>
      <div className="mt-1 line-clamp-2 text-xs font-black leading-5">{value}</div>
    </div>
  );
}

function Detail({ label, value, muted }: { label: string; value?: string | null; muted: string }) {
  if (!value) return null;
  return <div><p className={`text-[9px] font-black uppercase tracking-[.08em] ${muted}`}>{label}</p><p className="mt-1 font-bold">{value}</p></div>;
}
