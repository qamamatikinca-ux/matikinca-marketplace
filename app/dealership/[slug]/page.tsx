"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkPagination from "@/components/LoadLinkPagination";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import SiteMenu from "@/components/SiteMenu";
import { isAuthenticatedUser, loginHref } from "@/lib/auth";
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
  contact_email?: string | null;
  phone_number?: string | null;
  whatsapp_number?: string | null;
  website_url?: string | null;
  trading_hours?: string | null;
  year_established?: number | null;
  verification_status: string;
  average_response_minutes?: number | null;
  trust_score?: number | null;
};

type Listing = {
  id: string;
  title: string;
  city: string;
  rate: string;
  photos?: string[] | null;
  stock_status?: string;
  created_at: string;
  description?: string | null;
};

type Update = { id: string; update_type: string; title: string; body: string; image_url?: string | null; created_at: string };

const POSTS_PER_PAGE = 7;

export default function DealershipPublicPage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(String(params?.slug || ""));
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(false);
  const [userId, setUserId] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("available");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Listing | null>(null);

  useEffect(() => { if (slug) void load(); }, [slug]);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(isAuthenticatedUser(user) ? user.id : "");
    const profile = await supabase.from("dealership_profiles").select("*").eq("slug", slug).maybeSingle();
    if (profile.error || !profile.data) {
      setMessage(profile.error?.message || "This dealership page is not available.");
      setLoading(false);
      return;
    }
    const currentDealer = profile.data as Dealer;
    setDealer(currentDealer);
    const [stock, feed, follows] = await Promise.all([
      supabase.from("job_listings").select("id,title,city,rate,photos,stock_status,created_at,description").eq("dealership_id", currentDealer.id).eq("listing_kind", "vehicle").order("created_at", { ascending: false }),
      supabase.from("dealership_updates").select("id,update_type,title,body,image_url,created_at").eq("dealership_id", currentDealer.id).eq("status", "approved").order("created_at", { ascending: false }).limit(20),
      supabase.rpc("loadlink_dealership_social_status", { p_dealership_id: currentDealer.id }),
    ]);
    setListings((stock.data || []) as Listing[]);
    setUpdates((feed.data || []) as Update[]);
    const social = (follows.data || {}) as { follower_count?: number; is_following?: boolean };
    setFollowers(Number(social.follower_count || 0));
    setFollowing(Boolean(social.is_following));
    setLoading(false);
  }

  async function toggleFollow() {
    if (!dealer) return;
    if (!userId) { window.location.assign(loginHref(`/dealership/${dealer.slug}`)); return; }
    if (following) {
      const result = await supabase.from("dealership_followers").delete().eq("dealership_id", dealer.id).eq("user_id", userId);
      if (!result.error) { setFollowing(false); setFollowers((value) => Math.max(0, value - 1)); }
    } else {
      const result = await supabase.from("dealership_followers").insert({ dealership_id: dealer.id, user_id: userId });
      if (!result.error) { setFollowing(true); setFollowers((value) => value + 1); }
    }
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: dealer?.name || "LoadLink dealership", url });
      else { await navigator.clipboard.writeText(url); setMessage("Dealership link copied."); }
    } catch {}
  }

  async function report() {
    if (!dealer) return;
    if (!userId) { window.location.assign(loginHref(`/dealership/${dealer.slug}`)); return; }
    const reason = window.prompt("Briefly describe why you are reporting this dealership.");
    if (!reason?.trim()) return;
    const result = await supabase.from("dealership_reports").insert({ dealership_id: dealer.id, reporter_user_id: userId, reason: reason.trim() });
    setMessage(result.error ? result.error.message : "Report submitted for review.");
  }

  const filtered = useMemo(() => listings.filter((item) =>
    (status === "all" || item.stock_status === status) &&
    `${item.title} ${item.city} ${item.rate} ${item.description || ""}`.toLowerCase().includes(query.toLowerCase())
  ), [listings, query, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE));
  const visibleListings = useMemo(() => filtered.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE), [filtered, page]);

  useEffect(() => { setPage(1); }, [query, status]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const pageClass = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b] text-white" : "border-black/10 bg-white text-black";
  const muted = darkMode ? "text-white/55" : "text-black/55";

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-black text-sm font-black text-[#f6b800]">Loading dealership…</main>;
  if (!dealer) return <main className={`min-h-screen p-6 ${pageClass}`}><p className="font-black">{message || "Dealership unavailable"}</p><Link href="/" className="mt-4 inline-block font-black text-[#b88900]">Return home</Link></main>;

  return (
    <main className={`min-h-screen ${pageClass}`}>
      <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
        <div className="grid h-20 grid-cols-[92px_1fr_52px] items-center px-4">
          <div className="flex items-center gap-2"><SiteMenu darkMode={darkMode} /><AuthStatusButton darkMode={darkMode} /></div>
          <HomeLogoLink theme={darkMode ? "dark" : "light"} />
          <LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="ml-auto" />
        </div>
      </header>

      <section className="relative h-56 overflow-hidden bg-black md:h-80">
        {dealer.cover_image_url ? <img src={dealer.cover_image_url} alt={`${dealer.name} banner`} className="h-full w-full object-cover opacity-78" /> : <div className="h-full w-full bg-[radial-gradient(circle_at_center,rgba(246,184,0,.28),transparent_60%)]" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      </section>

      <section className="relative mx-auto max-w-6xl px-5 pb-12">
        <div className="-mt-16 flex flex-col gap-5 md:-mt-20 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-[#f6b800] bg-black md:h-36 md:w-36">
              {dealer.profile_image_url ? <img src={dealer.profile_image_url} alt={`${dealer.name} profile`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-3xl font-black text-[#f6b800]">{dealer.name.slice(0, 2).toUpperCase()}</div>}
            </div>
            <div className="pb-2">
              <div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-black tracking-[-.04em] md:text-5xl">{dealer.name}</h1><span className="rounded-full bg-[#f6b800] px-2.5 py-1 text-[9px] font-black uppercase text-black">Verified dealer</span></div>
              {dealer.short_bio?.trim() ? <p className={`mt-2 text-sm font-semibold ${muted}`}>{dealer.short_bio}</p> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void toggleFollow()} className={`h-11 rounded-xl border border-[#f6b800] px-5 text-xs font-black uppercase ${following ? "text-[#b88900]" : "bg-[#f6b800] text-black"}`}>{following ? "Following" : "Follow dealership"}</button>
            <button onClick={() => void share()} className="h-11 rounded-xl border border-current/20 px-4 text-xs font-black uppercase">Share</button>
            <button onClick={() => void report()} className="h-11 rounded-xl border border-current/20 px-4 text-xs font-black uppercase">Report</button>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Active listings" value={String(listings.filter((item) => item.stock_status === "available").length)} surface={surface} />
          <Stat label="Followers" value={String(followers)} surface={surface} />
          <Stat label="Response time" value={dealer.average_response_minutes ? `About ${dealer.average_response_minutes} min` : "Not available"} surface={surface} />
          <Stat label="Trust" value={dealer.trust_score ? `${Number(dealer.trust_score).toFixed(1)}/5` : "Verified"} surface={surface} />
        </div>

        {(dealer.business_description?.trim() || dealer.physical_location || dealer.trading_hours || dealer.contact_email) ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
            <section className={`rounded-[22px] border p-5 ${surface}`}>
              <h2 className="text-2xl font-black">Dealership information</h2>
              {dealer.business_description?.trim() ? <p className={`mt-3 whitespace-pre-line text-sm font-semibold leading-7 ${muted}`}>{dealer.business_description}</p> : null}
              <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
                {dealer.physical_location ? <Info label="Location" value={dealer.physical_location} /> : null}
                {dealer.trading_hours ? <Info label="Trading hours" value={dealer.trading_hours} /> : null}
                {dealer.year_established ? <Info label="Established" value={String(dealer.year_established)} /> : null}
                {dealer.contact_email ? <Info label="Email" value={dealer.contact_email} /> : null}
              </div>
            </section>
            <section className={`rounded-[22px] border p-5 ${surface}`}>
              <h2 className="text-2xl font-black">Contact</h2>
              <div className="mt-4 grid gap-3">
                {dealer.whatsapp_number ? <a href={`https://wa.me/${dealer.whatsapp_number.replace(/\D/g, "").replace(/^0/, "27")}`} className="flex h-12 items-center justify-center rounded-xl bg-[#f6b800] text-xs font-black uppercase text-black">WhatsApp dealership</a> : null}
                {dealer.phone_number ? <a href={`tel:${dealer.phone_number}`} className="flex h-12 items-center justify-center rounded-xl border border-[#f6b800] text-xs font-black uppercase text-[#b88900]">Call dealership</a> : null}
                <Link href={`/messages?dealership=${dealer.id}`} className="flex h-12 items-center justify-center rounded-xl border border-current/20 text-xs font-black uppercase">Message on LoadLink</Link>
              </div>
            </section>
          </div>
        ) : null}

        {updates.length ? <section className="mt-8"><h2 className="text-3xl font-black">Latest dealership updates</h2><div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{updates.map((item) => <article key={item.id} className={`rounded-[20px] border p-5 ${surface}`}>{item.image_url ? <img src={item.image_url} alt="" className="mb-4 aspect-[16/9] w-full rounded-xl object-cover" /> : null}<h3 className="text-xl font-black">{item.title}</h3><p className={`mt-2 text-sm leading-6 ${muted}`}>{item.body}</p><p className={`mt-4 text-xs font-bold ${muted}`}>{formatDate(item.created_at)}</p></article>)}</div></section> : null}

        <section className="mt-9">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><h2 className="text-4xl font-black">Dealership inventory</h2><div className="grid gap-2 sm:grid-cols-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stock" className={`h-12 rounded-xl border px-4 text-sm font-bold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-[#111] text-white" : "border-black/10 bg-white text-black"}`} /><select value={status} onChange={(event) => setStatus(event.target.value)} className={`h-12 rounded-xl border px-4 text-sm font-bold ${darkMode ? "border-white/15 bg-[#111] text-white" : "border-black/10 bg-white text-black"}`}><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option><option value="all">All stock</option></select></div></div>
          {filtered.length ? <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{visibleListings.map((item) => <button type="button" onClick={() => setSelected(item)} key={item.id} className={`overflow-hidden rounded-[18px] border text-left ${surface}`}><div className="relative aspect-square bg-black/10">{item.photos?.[0] ? <img src={item.photos[0]} alt={item.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center font-black text-[#b88900]">LOADLINK</div>}<span className="absolute left-2 top-2 rounded-full bg-black/85 px-2 py-1 text-[9px] font-black uppercase text-[#f6b800]">{item.stock_status || "available"}</span></div><div className="p-3"><h3 className="line-clamp-2 text-sm font-black">{item.title}</h3><p className={`mt-1 text-xs font-bold ${muted}`}>{item.city}</p><p className="mt-2 text-sm font-black text-[#b88900]">{item.rate}</p><span className={`mt-3 block text-[10px] font-black uppercase ${muted}`}>View details</span></div></button>)}</div> : <div className={`mt-5 rounded-[20px] border p-8 text-center ${surface}`}><p className="font-black">No listings match this search.</p></div>}
          <LoadLinkPagination current={page} total={totalPages} onChange={setPage} darkMode={darkMode} label="Dealership inventory pages" />
        </section>
      </section>

      {selected ? <ProductDialog listing={selected} dealer={dealer} darkMode={darkMode} onClose={() => setSelected(null)} /> : null}
      {message ? <p className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-black px-5 py-3 text-sm font-bold text-white shadow-2xl">{message}</p> : null}
    </main>
  );
}

function ProductDialog({ listing, dealer, darkMode, onClose }: { listing: Listing; dealer: Dealer; darkMode: boolean; onClose: () => void }) {
  const muted = darkMode ? "text-white/60" : "text-black/60";
  return <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/80 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={listing.title}><div className={`max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] sm:rounded-[28px] ${darkMode ? "bg-[#0d0d0d] text-white" : "bg-white text-black"}`}><div className="relative aspect-[16/9] bg-black">{listing.photos?.[0] ? <img src={listing.photos[0]} alt={listing.title} className="h-full w-full object-cover" /> : null}<button type="button" onClick={onClose} className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl font-black text-black" aria-label="Close product details">×</button></div><div className="p-5 md:p-7"><span className="rounded-full bg-[#f6b800] px-3 py-1 text-[10px] font-black uppercase text-black">{listing.stock_status || "available"}</span><h2 className="mt-4 text-3xl font-black">{listing.title}</h2><p className="mt-2 text-2xl font-black text-[#b88900]">{listing.rate}</p><p className={`mt-2 text-sm font-bold ${muted}`}>{listing.city}</p>{listing.description?.trim() ? <p className={`mt-5 whitespace-pre-line text-sm leading-7 ${muted}`}>{listing.description}</p> : <p className={`mt-5 text-sm leading-7 ${muted}`}>Contact the dealership for specifications, service history, finance guidance and availability.</p>}<div className="mt-6 grid gap-2 sm:grid-cols-2">{dealer.contact_email ? <a href={`mailto:${dealer.contact_email}?subject=${encodeURIComponent(`Vehicle enquiry: ${listing.title}`)}`} className="flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-xs font-black uppercase text-black">Email dealership</a> : null}<Link href={`/messages?dealership=${dealer.id}&listing=${listing.id}`} className="flex h-12 items-center justify-center rounded-xl bg-black px-5 text-xs font-black uppercase text-[#f6b800] ring-1 ring-white/15">Message on LoadLink</Link></div></div></div></div>;
}

function Stat({ label, value, surface }: { label: string; value: string; surface: string }) { return <article className={`rounded-[18px] border p-4 ${surface}`}><p className="text-[10px] font-black uppercase text-black/45 dark:text-white/45">{label}</p><p className="mt-2 text-xl font-black">{value}</p></article>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-black uppercase text-[#b88900]">{label}</p><p className="mt-1 font-bold">{value}</p></div>; }
function formatDate(value: string) { return new Date(value).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }); }
