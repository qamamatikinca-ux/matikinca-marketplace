"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Breadcrumbs from "@/components/platform/Breadcrumbs";
import EmptyState from "@/components/platform/EmptyState";
import MarketplaceCard, { type MarketplaceCardItem } from "@/components/platform/MarketplaceCard";
import ProfessionalFooter from "@/components/platform/ProfessionalFooter";
import ProfessionalHeader from "@/components/platform/ProfessionalHeader";
import ReportDialog from "@/components/platform/ReportDialog";
import { authenticatedFetch } from "@/lib/client/authenticatedFetch";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Dealer = {
  id: string;
  slug: string;
  name: string;
  profile_image_url?: string;
  cover_image_url?: string;
  short_bio?: string;
  business_description?: string;
  physical_location?: string;
  province?: string;
  contact_email?: string;
  phone_number?: string;
  whatsapp_number?: string;
  website_url?: string;
  trading_hours?: string;
  year_established?: number;
  average_response_minutes?: number;
  trust_score?: number;
  active_stock_count?: number;
};
type Update = { id: string; update_type?: string; title: string; body: string; image_url?: string; created_at: string };
const POSTS_PER_PAGE = 7;

export default function DealershipPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [stock, setStock] = useState<MarketplaceCardItem[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("available");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetch(`/api/dealerships/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "This dealership could not be loaded.");
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        setDealer(payload.dealer);
        setStock(payload.stock || []);
        setUpdates(payload.updates || []);
        setFollowers(Number(payload.social?.follower_count || 0));
        setFollowing(Boolean(payload.social?.is_following));
      })
      .catch((problem) => { if (active) setError(problem instanceof Error ? problem.message : "This dealership could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  const filtered = useMemo(() => stock.filter((item) => {
    const text = `${item.title || ""} ${item.city || ""} ${item.province || ""} ${item.brand || ""} ${item.model || ""}`.toLowerCase();
    const statusMatches = status === "all" || String(item.stock_status || "available") === status;
    const searchMatches = !query.trim() || query.toLowerCase().split(/\s+/).every((token) => text.includes(token));
    return statusMatches && searchMatches;
  }), [query, status, stock]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE));
  const visible = filtered.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);
  useEffect(() => { setPage(1); }, [query, status]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  async function toggleFollow() {
    if (!dealer) return;
    try {
      const response = await authenticatedFetch(`/api/dealerships/${encodeURIComponent(dealer.slug)}/follow`, { method: following ? "DELETE" : "POST" });
      if (response.status === 401) { window.location.href = `/login?next=${encodeURIComponent(`/dealership/${dealer.slug}`)}`; return; }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Follow status could not be updated.");
      setFollowing(Boolean(payload.following));
      setFollowers(Number(payload.social?.follower_count ?? (following ? Math.max(0, followers - 1) : followers + 1)));
      setNotice(payload.following ? "Dealership followed." : "Dealership unfollowed.");
    } catch (problem) {
      setNotice(problem instanceof Error ? problem.message : "Follow status could not be updated.");
    }
  }

  async function saveDealer() {
    if (!dealer) return;
    try {
      const response = await authenticatedFetch("/api/saved-items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entityType: "dealership", entityId: dealer.id }) });
      if (response.status === 401) { setNotice("Sign in to save this dealership across devices."); return; }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Dealership could not be saved.");
      setNotice("Dealership saved to your LoadLink account.");
    } catch (problem) {
      setNotice(problem instanceof Error ? problem.message : "Dealership could not be saved.");
    }
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: dealer?.name || "LoadLink dealership", url });
      else { await navigator.clipboard.writeText(url); setNotice("Dealership link copied."); }
    } catch { /* share cancelled */ }
  }

  const pageClass = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const field = `h-12 rounded-xl border px-4 text-sm font-bold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-[#111]" : "border-black/10 bg-white"}`;

  if (loading) return <main className={`min-h-screen ${pageClass}`}><ProfessionalHeader darkMode={darkMode} onToggleTheme={toggleTheme} /><div className="mx-auto max-w-7xl px-5 py-10"><div className={`h-[520px] animate-pulse rounded-[28px] ${darkMode ? "bg-white/5" : "bg-black/5"}`} /></div></main>;
  if (!dealer) return <main className={`min-h-screen ${pageClass}`}><ProfessionalHeader darkMode={darkMode} onToggleTheme={toggleTheme} /><div className="mx-auto max-w-3xl px-5 py-12"><EmptyState title="Dealership unavailable" body={error || "This dealership may still be under review or no longer public."} actionLabel="Browse verified dealerships" actionHref="/dealerships" darkMode={darkMode} /></div><ProfessionalFooter darkMode={darkMode} /></main>;

  return (
    <main className={`min-h-screen ${pageClass}`}>
      <ProfessionalHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <section className="relative h-56 overflow-hidden bg-black md:h-80">
        {dealer.cover_image_url ? <img src={dealer.cover_image_url} alt={`${dealer.name} banner`} className="h-full w-full object-cover opacity-80" /> : <div className="h-full w-full bg-[radial-gradient(circle_at_center,rgba(246,184,0,.3),transparent_65%)]" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      </section>
      <section className="relative mx-auto max-w-7xl px-5 pb-12">
        <div className="-mt-14"><Breadcrumbs darkMode items={[{ label: "Home", href: "/" }, { label: "Dealerships", href: "/dealerships" }, { label: dealer.name }]} /></div>
        <div className={`mt-5 rounded-[28px] border p-5 md:p-7 ${surface}`}>
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[#f6b800] bg-black text-2xl font-black text-[#f6b800]">{dealer.profile_image_url ? <img src={dealer.profile_image_url} alt={`${dealer.name} logo`} className="h-full w-full object-cover" /> : dealer.name.slice(0, 2).toUpperCase()}</div>
              <div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-[#f6b800] px-3 py-1 text-[10px] font-black uppercase text-black">Verified dealership</span>{dealer.year_established ? <span className="rounded-full border border-current/15 px-3 py-1 text-[10px] font-black uppercase">Since {dealer.year_established}</span> : null}</div><h1 className="mt-3 text-3xl font-black tracking-[-.04em] md:text-5xl">{dealer.name}</h1><p className={`mt-2 text-sm font-bold ${muted}`}>{dealer.physical_location || dealer.province || "South Africa"}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex"><button type="button" onClick={() => void toggleFollow()} className="h-12 rounded-xl bg-[#f6b800] px-5 text-xs font-black uppercase text-black">{following ? "Following" : "Follow"}</button><button type="button" onClick={() => void saveDealer()} className="h-12 rounded-xl border border-current/15 px-5 text-xs font-black uppercase">Save</button><button type="button" onClick={() => void share()} className="h-12 rounded-xl border border-current/15 px-5 text-xs font-black uppercase">Share</button><button type="button" onClick={() => setReportOpen(true)} className="h-12 rounded-xl border border-red-500/30 px-5 text-xs font-black uppercase text-red-500">Report</button></div>
          </div>
          {dealer.short_bio ? <p className={`mt-6 max-w-4xl text-sm leading-7 ${muted}`}>{dealer.short_bio}</p> : null}
          <div className="mt-6 grid gap-3 sm:grid-cols-4"><Stat label="Active stock" value={String(stock.length || dealer.active_stock_count || 0)} darkMode={darkMode} /><Stat label="Followers" value={String(followers)} darkMode={darkMode} /><Stat label="Response" value={dealer.average_response_minutes ? `${dealer.average_response_minutes} min` : "On request"} darkMode={darkMode} /><Stat label="Trust" value={dealer.trust_score ? Number(dealer.trust_score).toFixed(1) : "Verified"} darkMode={darkMode} /></div>
          {notice ? <button type="button" onClick={() => setNotice("")} className="mt-5 w-full rounded-xl border border-[#f6b800]/40 bg-[#f6b800]/10 p-3 text-left text-sm font-bold">{notice}</button> : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#b88900]">Live approved inventory</p><h2 className="mt-2 text-3xl font-black md:text-5xl">Vehicles from {dealer.name}</h2></div><div className="grid gap-2 sm:grid-cols-2"><input value={query} onChange={(event) => setQuery(event.target.value)} className={field} placeholder="Search this dealership" /><select value={status} onChange={(event) => setStatus(event.target.value)} className={field}><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option><option value="all">All visible stock</option></select></div></div>
        {visible.length ? <><div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visible.map((item) => <MarketplaceCard key={item.id} item={item} darkMode={darkMode} />)}</div>{totalPages > 1 ? <nav className="mt-7 flex flex-wrap justify-center gap-2" aria-label="Dealership stock pages">{Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => <button key={number} type="button" onClick={() => setPage(number)} className={`h-11 min-w-11 rounded-xl border px-3 text-sm font-black ${page === number ? "border-[#f6b800] bg-[#f6b800] text-black" : "border-current/15"}`}>{number}</button>)}</nav> : null}</> : <div className="mt-7"><EmptyState title="No matching stock" body="Try a broader search or another stock status. Only approved marketplace vehicles are shown." actionLabel="Browse all vehicles" actionHref="/vehicles" darkMode={darkMode} /></div>}
      </section>

      <section className={`border-y px-5 py-12 ${darkMode ? "border-white/10 bg-[#070707]" : "border-black/10 bg-white"}`}><div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_360px]"><div><h2 className="text-3xl font-black">About the dealership</h2><p className={`mt-4 whitespace-pre-line text-sm leading-7 ${muted}`}>{dealer.business_description || dealer.short_bio || "This verified LoadLink dealership publishes approved commercial vehicle stock."}</p>{updates.length ? <div className="mt-8 grid gap-3">{updates.map((update) => <article key={update.id} className={`rounded-2xl border p-4 ${surface}`}><p className="text-[10px] font-black uppercase text-[#b88900]">{update.update_type || "Update"}</p><h3 className="mt-2 text-lg font-black">{update.title}</h3><p className={`mt-2 whitespace-pre-line text-sm leading-6 ${muted}`}>{update.body}</p></article>)}</div> : null}</div><aside className={`h-fit rounded-[24px] border p-5 ${surface}`}><h2 className="text-2xl font-black">Business contact</h2><div className={`mt-4 grid gap-3 text-sm ${muted}`}>{dealer.trading_hours ? <p><strong className="text-current">Trading hours:</strong> {dealer.trading_hours}</p> : null}{dealer.contact_email ? <a href={`mailto:${dealer.contact_email}`} className="font-black text-[#b88900]">{dealer.contact_email}</a> : null}{dealer.phone_number ? <a href={`tel:${dealer.phone_number}`} className="font-black text-[#b88900]">Call dealership</a> : null}{dealer.whatsapp_number ? <a href={`https://wa.me/${dealer.whatsapp_number.replace(/\D/g, "").replace(/^0/, "27")}`} className="font-black text-[#b88900]">WhatsApp dealership</a> : null}{dealer.website_url ? <a href={dealer.website_url} rel="noopener noreferrer" target="_blank" className="font-black text-[#b88900]">Visit official website</a> : null}</div><p className={`mt-5 border-t pt-4 text-xs leading-6 ${darkMode ? "border-white/10 text-white/45" : "border-black/10 text-black/45"}`}>Confirm stock, documentation and payment instructions before paying. Never share OTPs, passwords or banking PINs.</p></aside></div></section>
      <ProfessionalFooter darkMode={darkMode} />
      <ReportDialog open={reportOpen} entityType="dealership" entityId={dealer.id} entityTitle={dealer.name} darkMode={darkMode} onClose={() => setReportOpen(false)} onSubmitted={setNotice} />
    </main>
  );
}

function Stat({ label, value, darkMode }: { label: string; value: string; darkMode: boolean }) {
  return <div className={`rounded-2xl border p-4 text-center ${darkMode ? "border-white/10 bg-white/[.03]" : "border-black/10 bg-black/[.02]"}`}><p className="text-xl font-black">{value}</p><p className={`mt-1 text-[9px] font-black uppercase ${darkMode ? "text-white/40" : "text-black/40"}`}>{label}</p></div>;
}
