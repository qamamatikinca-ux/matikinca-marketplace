"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import AuthStatusButton from "@/components/AuthStatusButton";
import HomeLogoLink from "@/components/HomeLogoLink";
import LoadLinkPagination from "@/components/LoadLinkPagination";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import SiteMenu from "@/components/SiteMenu";
import { isAuthenticatedUser, loginHref } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Dealer = {
  id: string; slug: string; name: string; profile_image_url?: string | null; cover_image_url?: string | null;
  short_bio?: string | null; business_description?: string | null; physical_location?: string | null;
  contact_email?: string | null; phone_number?: string | null; whatsapp_number?: string | null;
  website_url?: string | null; trading_hours?: string | null; year_established?: number | null;
  verification_status: string; average_response_minutes?: number | null; trust_score?: number | null;
};

type Listing = {
  id: string; title: string; city: string; rate: string; photos?: string[] | null; stock_status?: string;
  created_at: string; description?: string | null; posted_by?: string | null; contact_number?: string | null;
  whatsapp_number?: string | null;
};

type TruckDetails = {
  vehicle_year?: number | null; brand?: string | null; model?: string | null; body_type?: string | null;
  transmission?: string | null; fuel_type?: string | null; axle_configuration?: string | null;
  odometer_km?: number | null; gvm_kg?: number | null; payload_kg?: number | null;
};
type Update = { id: string; update_type: string; title: string; body: string; image_url?: string | null; created_at: string };
type Spec = { label: string; value: string };

const POSTS_PER_PAGE = 7;

function parseDescription(description?: string | null) {
  const lines = String(description || "").split("\n");
  const specs: Spec[] = [];
  const descriptionIndex = lines.findIndex((line) => line.trim().toLowerCase() === "description:");
  const metadataLines = descriptionIndex >= 0 ? lines.slice(0, descriptionIndex) : lines;
  for (const line of metadataLines) {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (!match) continue;
    const label = match[1].trim();
    const value = match[2].trim();
    if (!value || ["seller"].includes(label.toLowerCase())) continue;
    specs.push({ label, value });
  }
  const body = descriptionIndex >= 0 ? lines.slice(descriptionIndex + 1).join("\n").trim() : String(description || "").trim();
  return { specs, body };
}

export default function DealershipPublicPage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(String(params?.slug || ""));
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const sliderRef = useRef<HTMLDivElement>(null);
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(isAuthenticatedUser(user) ? user.id : "");
      const profile = await supabase.from("dealership_profiles").select("*").eq("slug", slug).maybeSingle();
      if (profile.error || !profile.data) throw profile.error || new Error("This dealership page is not available.");
      const currentDealer = profile.data as Dealer;
      setDealer(currentDealer);
      const [stock, feed, follows] = await Promise.all([
        supabase.from("job_listings").select("id,title,city,rate,photos,stock_status,created_at,description,posted_by,contact_number,whatsapp_number").eq("dealership_id", currentDealer.id).eq("listing_kind", "vehicle").order("created_at", { ascending: false }),
        supabase.from("dealership_updates").select("id,update_type,title,body,image_url,created_at").eq("dealership_id", currentDealer.id).eq("status", "approved").order("created_at", { ascending: false }).limit(20),
        supabase.rpc("loadlink_dealership_social_status", { p_dealership_id: currentDealer.id }),
      ]);
      if (stock.error) throw stock.error;
      setListings((stock.data || []) as Listing[]);
      setUpdates((feed.data || []) as Update[]);
      const social = (follows.data || {}) as { follower_count?: number; is_following?: boolean };
      setFollowers(Number(social.follower_count || 0));
      setFollowing(Boolean(social.is_following));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "This dealership page is not available.");
    } finally {
      setLoading(false);
    }
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

  function moveSlider(direction: -1 | 1) {
    const node = sliderRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.max(260, node.clientWidth * 0.82), behavior: "smooth" });
  }

  const pageClass = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b] text-white" : "border-black/10 bg-white text-black";
  const muted = darkMode ? "text-white/55" : "text-black/55";

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-black text-sm font-black text-[#f6b800]">Loading dealership…</main>;
  if (!dealer) return <main className={`min-h-screen p-6 ${pageClass}`}><p className="font-black">{message || "Dealership unavailable"}</p><Link href="/" className="mt-4 inline-block font-black text-[#b88900]">Return home</Link></main>;

  return (
    <main className={`min-h-screen ${pageClass}`}>
      <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
        <div className="grid h-20 grid-cols-[92px_1fr_52px] items-center px-4"><div className="flex items-center gap-2"><SiteMenu darkMode={darkMode} /><AuthStatusButton darkMode={darkMode} /></div><HomeLogoLink theme={darkMode ? "dark" : "light"} /><LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="ml-auto" /></div>
      </header>

      <section className="relative h-56 overflow-hidden bg-black md:h-80">{dealer.cover_image_url ? <img src={dealer.cover_image_url} alt={`${dealer.name} banner`} className="h-full w-full object-cover opacity-80" /> : <div className="h-full w-full bg-[radial-gradient(circle_at_center,rgba(246,184,0,.28),transparent_60%)]" />}<div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" /></section>

      <section className="relative mx-auto max-w-6xl px-5 pb-12">
        <div className="-mt-16 flex flex-col gap-5 md:-mt-20 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4"><div className="h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-[#f6b800] bg-black md:h-36 md:w-36">{dealer.profile_image_url ? <img src={dealer.profile_image_url} alt={`${dealer.name} profile`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-3xl font-black text-[#f6b800]">{dealer.name.slice(0, 2).toUpperCase()}</div>}</div><div className="pb-2"><div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-black tracking-[-.04em] md:text-5xl">{dealer.name}</h1><span className="rounded-full bg-[#f6b800] px-2.5 py-1 text-[9px] font-black uppercase text-black">Verified dealer</span></div>{dealer.short_bio?.trim() ? <p className={`mt-2 text-sm font-semibold ${muted}`}>{dealer.short_bio}</p> : null}</div></div>
          <div className="flex flex-wrap gap-2"><button onClick={() => void toggleFollow()} className={`h-11 rounded-xl border border-[#f6b800] px-5 text-xs font-black uppercase ${following ? "text-[#b88900]" : "bg-[#f6b800] text-black"}`}>{following ? "Following" : "Follow dealership"}</button><button onClick={() => void share()} className="h-11 rounded-xl border border-current/20 px-4 text-xs font-black uppercase">Share</button><button onClick={() => void report()} className="h-11 rounded-xl border border-current/20 px-4 text-xs font-black uppercase">Report</button></div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Active listings" value={String(listings.filter((item) => item.stock_status === "available").length)} surface={surface} muted={muted} /><Stat label="Followers" value={String(followers)} surface={surface} muted={muted} /><Stat label="Response time" value={dealer.average_response_minutes ? `About ${dealer.average_response_minutes} min` : "Not available"} surface={surface} muted={muted} /><Stat label="Trust" value={dealer.trust_score ? `${Number(dealer.trust_score).toFixed(1)}/5` : "Verified"} surface={surface} muted={muted} /></div>

        {(dealer.business_description?.trim() || dealer.physical_location || dealer.trading_hours || dealer.contact_email) ? <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><section className={`rounded-[22px] border p-5 ${surface}`}><h2 className="text-2xl font-black">Dealership information</h2>{dealer.business_description?.trim() ? <p className={`mt-3 whitespace-pre-line text-sm font-semibold leading-7 ${muted}`}>{dealer.business_description}</p> : null}<div className="mt-5 grid gap-3 text-sm md:grid-cols-2">{dealer.physical_location ? <Info label="Location" value={dealer.physical_location} /> : null}{dealer.trading_hours ? <Info label="Trading hours" value={dealer.trading_hours} /> : null}{dealer.year_established ? <Info label="Established" value={String(dealer.year_established)} /> : null}{dealer.contact_email ? <Info label="Email" value={dealer.contact_email} /> : null}</div></section><section className={`rounded-[22px] border p-5 ${surface}`}><h2 className="text-2xl font-black">Contact</h2><div className="mt-4 grid gap-3">{dealer.whatsapp_number ? <a href={`https://wa.me/${dealer.whatsapp_number.replace(/\D/g, "").replace(/^0/, "27")}`} className="flex h-12 items-center justify-center rounded-xl bg-[#f6b800] text-xs font-black uppercase text-black">WhatsApp dealership</a> : null}{dealer.phone_number ? <a href={`tel:${dealer.phone_number}`} className="flex h-12 items-center justify-center rounded-xl border border-[#f6b800] text-xs font-black uppercase text-[#b88900]">Call dealership</a> : null}<Link href={`/messages?dealership=${dealer.id}`} className="flex h-12 items-center justify-center rounded-xl border border-current/20 text-xs font-black uppercase">Message on LoadLink</Link></div></section></div> : null}

        {updates.length ? <section className="mt-8"><h2 className="text-3xl font-black">Latest dealership updates</h2><div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{updates.map((item) => <article key={item.id} className={`rounded-[20px] border p-5 ${surface}`}>{item.image_url ? <img src={item.image_url} alt="" className="mb-4 aspect-[16/9] w-full rounded-xl object-cover" /> : null}<h3 className="text-xl font-black">{item.title}</h3><p className={`mt-2 text-sm leading-6 ${muted}`}>{item.body}</p><p className={`mt-4 text-xs font-bold ${muted}`}>{formatDate(item.created_at)}</p></article>)}</div></section> : null}

        <section className="mt-9">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#b88900]">Swipe products</p><h2 className="mt-1 text-4xl font-black">Dealership inventory</h2></div><div className="grid gap-2 sm:grid-cols-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stock" className={`h-12 rounded-xl border px-4 text-sm font-bold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-[#111] text-white" : "border-black/10 bg-white text-black"}`} /><select value={status} onChange={(event) => setStatus(event.target.value)} className={`h-12 rounded-xl border px-4 text-sm font-bold ${darkMode ? "border-white/15 bg-[#111] text-white" : "border-black/10 bg-white text-black"}`}><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option><option value="all">All stock</option></select></div></div>
          {filtered.length ? <div className="relative mt-5"><div className="mb-3 hidden justify-end gap-2 sm:flex"><button type="button" onClick={() => moveSlider(-1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-current/20" aria-label="Previous products">←</button><button type="button" onClick={() => moveSlider(1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f6b800] text-black" aria-label="Next products">→</button></div><div ref={sliderRef} className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-4 touch-pan-x">{visibleListings.map((item) => <button type="button" onClick={() => setSelected(item)} key={item.id} className={`w-[82vw] max-w-[310px] shrink-0 snap-start overflow-hidden rounded-[18px] border text-left sm:w-[280px] ${surface}`}><div className="relative aspect-square bg-black/10">{item.photos?.[0] ? <img src={item.photos[0]} alt={item.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center font-black text-[#b88900]">LOADLINK</div>}<span className="absolute left-2 top-2 rounded-full bg-black/85 px-2 py-1 text-[9px] font-black uppercase text-[#f6b800]">{item.stock_status || "available"}</span></div><div className="p-3"><h3 className="line-clamp-2 text-sm font-black">{item.title}</h3><p className={`mt-1 text-xs font-bold ${muted}`}>{item.city}</p><p className="mt-2 text-sm font-black text-[#b88900]">{item.rate}</p><span className={`mt-3 block text-[10px] font-black uppercase ${muted}`}>Tap for full details</span></div></button>)}</div></div> : <div className={`mt-5 rounded-[20px] border p-8 text-center ${surface}`}><p className="font-black">No listings match this search.</p></div>}
          <LoadLinkPagination current={page} total={totalPages} onChange={setPage} darkMode={darkMode} label="Dealership inventory pages" />
        </section>
      </section>

      {selected ? <ProductDialog listing={selected} dealer={dealer} darkMode={darkMode} onClose={() => setSelected(null)} /> : null}
      {message ? <p className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-black px-5 py-3 text-sm font-bold text-white shadow-2xl">{message}</p> : null}
    </main>
  );
}

function ProductDialog({ listing, dealer, darkMode, onClose }: { listing: Listing; dealer: Dealer; darkMode: boolean; onClose: () => void }) {
  const [details, setDetails] = useState<TruckDetails | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const parsed = useMemo(() => parseDescription(listing.description), [listing.description]);
  const photos = listing.photos?.filter(Boolean) || [];
  const muted = darkMode ? "text-white/60" : "text-black/60";

  useEffect(() => {
    let active = true;
    void supabase.from("truck_listing_details").select("vehicle_year,brand,model,body_type,transmission,fuel_type,axle_configuration,odometer_km,gvm_kg,payload_kg").eq("listing_id", listing.id).maybeSingle().then(({ data }) => { if (active && data) setDetails(data as TruckDetails); });
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { active = false; document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [listing.id, onClose]);

  const mergedSpecs = useMemo(() => {
    const list = [...parsed.specs];
    const add = (label: string, value: unknown) => { if (value !== null && value !== undefined && String(value).trim() && !list.some((item) => item.label.toLowerCase() === label.toLowerCase())) list.push({ label, value: String(value) }); };
    add("Year", details?.vehicle_year); add("Make", details?.brand); add("Model", details?.model); add("Body type", details?.body_type);
    add("Transmission", details?.transmission); add("Fuel", details?.fuel_type); add("Axle configuration", details?.axle_configuration);
    add("Mileage", details?.odometer_km != null ? `${Number(details.odometer_km).toLocaleString("en-ZA")} km` : null);
    add("GVM", details?.gvm_kg != null ? `${Number(details.gvm_kg).toLocaleString("en-ZA")} kg` : null);
    add("Payload", details?.payload_kg != null ? `${Number(details.payload_kg).toLocaleString("en-ZA")} kg` : null);
    for (const label of ["Mileage", "Previous owners", "Transmission", "Fuel", "Condition", "Service history"]) {
      if (!list.some((item) => item.label.toLowerCase() === label.toLowerCase())) list.push({ label, value: "Not provided" });
    }
    return list;
  }, [details, parsed.specs]);

  return <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/80 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={listing.title}><button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close product details" /><div className={`relative max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-[28px] shadow-2xl sm:rounded-[28px] ${darkMode ? "bg-[#0d0d0d] text-white" : "bg-white text-black"}`}>
    <div className="relative aspect-[16/10] bg-black">{photos[imageIndex] ? <img src={photos[imageIndex]} alt={`${listing.title} image ${imageIndex + 1}`} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-[#f6b800]">LOADLINK</div>}<button type="button" onClick={onClose} className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl font-black text-black" aria-label="Close product details">×</button>{photos.length > 1 ? <><button type="button" onClick={() => setImageIndex((index) => (index - 1 + photos.length) % photos.length)} className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/75 text-white" aria-label="Previous image">←</button><button type="button" onClick={() => setImageIndex((index) => (index + 1) % photos.length)} className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/75 text-white" aria-label="Next image">→</button></> : null}</div>
    {photos.length > 1 ? <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-current/10 p-3">{photos.map((photo, index) => <button key={`${photo}-${index}`} type="button" onClick={() => setImageIndex(index)} className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${index === imageIndex ? "border-[#f6b800]" : "border-transparent"}`}><img src={photo} alt="" className="h-full w-full object-cover" /></button>)}</div> : null}
    <div className="p-5 md:p-7"><span className="rounded-full bg-[#f6b800] px-3 py-1 text-[10px] font-black uppercase text-black">{listing.stock_status || "available"}</span><h2 className="mt-4 text-3xl font-black">{listing.title}</h2><p className="mt-2 text-2xl font-black text-[#b88900]">{listing.rate}</p><p className={`mt-2 text-sm font-bold ${muted}`}>{listing.city} · Posted by {listing.posted_by || dealer.name}</p>
      {mergedSpecs.length ? <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">{mergedSpecs.map((spec) => <div key={`${spec.label}-${spec.value}`} className={`rounded-xl border p-3 ${darkMode ? "border-white/10 bg-white/[.03]" : "border-black/10 bg-black/[.02]"}`}><p className={`text-[10px] font-black uppercase ${muted}`}>{spec.label}</p><p className="mt-1 text-sm font-black">{spec.value}</p></div>)}</div> : null}
      {parsed.body ? <div className="mt-6"><h3 className="text-lg font-black">Description</h3><p className={`mt-2 whitespace-pre-line text-sm leading-7 ${muted}`}>{parsed.body}</p></div> : null}
      <div className="mt-6 grid gap-2 sm:grid-cols-2">{dealer.contact_email ? <a href={`mailto:${dealer.contact_email}?subject=${encodeURIComponent(`Vehicle enquiry: ${listing.title}`)}`} className="flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-xs font-black uppercase text-black">Email dealership</a> : null}<Link href={`/messages?dealership=${dealer.id}&listing=${listing.id}`} className="flex h-12 items-center justify-center rounded-xl bg-black px-5 text-xs font-black uppercase text-[#f6b800] ring-1 ring-white/15">Message on LoadLink</Link>{listing.whatsapp_number || dealer.whatsapp_number ? <a href={`https://wa.me/${String(listing.whatsapp_number || dealer.whatsapp_number).replace(/\D/g, "").replace(/^0/, "27")}`} className="flex h-12 items-center justify-center rounded-xl border border-[#f6b800] px-5 text-xs font-black uppercase text-[#b88900]">WhatsApp</a> : null}{listing.contact_number || dealer.phone_number ? <a href={`tel:${listing.contact_number || dealer.phone_number}`} className="flex h-12 items-center justify-center rounded-xl border border-current/20 px-5 text-xs font-black uppercase">Call</a> : null}</div>
    </div>
  </div></div>;
}

function Stat({ label, value, surface, muted }: { label: string; value: string; surface: string; muted: string }) { return <article className={`rounded-[18px] border p-4 ${surface}`}><p className={`text-[10px] font-black uppercase ${muted}`}>{label}</p><p className="mt-2 text-xl font-black">{value}</p></article>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-black uppercase text-[#b88900]">{label}</p><p className="mt-1 font-bold">{value}</p></div>; }
function formatDate(value: string) { return new Date(value).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }); }
