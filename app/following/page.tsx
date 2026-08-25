"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type Dealer = {
  id: string;
  slug: string;
  name: string;
  profile_image_url?: string | null;
  cover_image_url?: string | null;
  short_bio?: string | null;
  physical_location?: string | null;
  follower_count?: number | null;
  active_listing_count?: number | null;
  average_response_minutes?: number | null;
};

type DealerUpdate = {
  id: string;
  dealership_id: string;
  update_type: string;
  title: string;
  body: string;
  image_url?: string | null;
  listing_id?: string | null;
  published_at?: string | null;
  created_at: string;
};

type View = "following" | "updates" | "discover";

export default function FollowingPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [discoverDealers, setDiscoverDealers] = useState<Dealer[]>([]);
  const [updates, setUpdates] = useState<DealerUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);
  const [view, setView] = useState<View>("following");
  const [locationQuery, setLocationQuery] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("discover") === "1") setView("discover");
    else if (params.get("view") === "updates") setView("updates");
    void loadFollowing();
    void loadDiscovery();
  }, []);

  async function loadDiscovery() {
    if (!isSupabaseConfigured) return;
    const result = await supabase
      .from("public_dealership_profiles")
      .select("id,slug,name,profile_image_url,cover_image_url,short_bio,physical_location,follower_count,active_listing_count,average_response_minutes")
      .order("active_listing_count", { ascending: false })
      .limit(60);
    if (!result.error) setDiscoverDealers((result.data || []) as Dealer[]);
  }

  async function loadFollowing() {
    setLoading(true);
    if (!isSupabaseConfigured) {
      setSignedIn(false);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSignedIn(false);
      setLoading(false);
      return;
    }
    setSignedIn(true);

    const { data: follows, error: followError } = await supabase
      .from("dealership_followers")
      .select("dealership_id")
      .eq("user_id", user.id);

    if (followError || !follows?.length) {
      setDealers([]);
      setUpdates([]);
      setLoading(false);
      return;
    }

    const ids = follows.map((row) => String(row.dealership_id));
    const [dealerResult, updateResult] = await Promise.all([
      supabase
        .from("public_dealership_profiles")
        .select("id,slug,name,profile_image_url,cover_image_url,short_bio,physical_location,follower_count,active_listing_count,average_response_minutes")
        .in("id", ids)
        .order("active_listing_count", { ascending: false }),
      supabase
        .from("public_dealership_updates")
        .select("id,dealership_id,update_type,title,body,image_url,listing_id,published_at,created_at")
        .in("dealership_id", ids)
        .order("published_at", { ascending: false })
        .limit(40),
    ]);

    setDealers((dealerResult.data || []) as Dealer[]);
    setUpdates((updateResult.data || []) as DealerUpdate[]);
    setLoading(false);
  }

  const dealerById = useMemo(() => new Map(dealers.map((dealer) => [dealer.id, dealer])), [dealers]);
  const followedIds = useMemo(() => new Set(dealers.map((dealer) => dealer.id)), [dealers]);
  const availableDiscoverDealers = useMemo(() => {
    const q = locationQuery.trim().toLowerCase();
    return discoverDealers.filter((dealer) => {
      if (followedIds.has(dealer.id)) return false;
      if (!q) return true;
      return `${dealer.name} ${dealer.physical_location || ""} ${dealer.short_bio || ""}`.toLowerCase().includes(q);
    });
  }, [discoverDealers, followedIds, locationQuery]);

  const muted = darkMode ? "text-white/55" : "text-black/55";
  const surface = darkMode ? "border-white/10 bg-white/[.045] text-white" : "border-black/10 bg-white/[.72] text-black";

  function chooseView(next: View) {
    setView(next);
    const url = next === "updates" ? "/following?view=updates" : next === "discover" ? "/following?discover=1" : "/following";
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4efe3] text-black"} data-loadlink-dealer-network="gold-actions-v2">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-5 md:px-6 md:pt-8">
        <div className="flex flex-col gap-5 border-b border-current/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className={`text-xs font-black uppercase tracking-[.12em] ${muted}`}>Dealership network</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">Dealerships you care about</h1>
            <p className={`mt-2 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>Follow trusted dealerships, see fresh status updates, or find another dealer by city or area.</p>
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            <Tab active={view === "following"} onClick={() => chooseView("following")} darkMode={darkMode}>Following</Tab>
            <Tab active={view === "updates"} onClick={() => chooseView("updates")} darkMode={darkMode}>Updates{updates.length ? ` · ${updates.length}` : ""}</Tab>
            <Tab active={view === "discover"} onClick={() => chooseView("discover")} darkMode={darkMode}>Find dealers</Tab>
          </div>
        </div>

        {view === "discover" ? (
          <section className="pt-6">
            <div className={`rounded-[24px] border p-4 backdrop-blur-2xl sm:p-5 ${surface}`}>
              <label className="block">
                <span className={`mb-2 block text-[10px] font-black uppercase tracking-[.12em] ${muted}`}>City or area</span>
                <input value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} placeholder="Johannesburg, Pretoria, Durban…" className={`h-12 w-full rounded-2xl border px-4 text-sm font-semibold outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.045] text-white placeholder:text-white/30" : "border-black/10 bg-white/70 text-black placeholder:text-black/35"}`} />
              </label>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {availableDiscoverDealers.length ? availableDiscoverDealers.map((dealer) => <DealerCard key={dealer.id} dealer={dealer} muted={muted} surface={surface} />) : (
                <div className={`rounded-[24px] border p-8 text-center md:col-span-2 xl:col-span-3 ${surface}`}><h2 className="text-xl font-black">No dealerships match that area</h2><p className={`mt-2 text-sm font-semibold ${muted}`}>Try a nearby city, province or a broader search.</p></div>
              )}
            </div>
          </section>
        ) : loading ? (
          <div className="flex min-h-[55vh] items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-2 border-current/10 border-t-[#f6b800]" /></div>
        ) : !signedIn ? (
          <div className={`mt-6 rounded-[24px] border p-8 text-center ${surface}`}>
            <h2 className="text-2xl font-black">Sign in to see your dealership network</h2>
            <p className={`mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 ${muted}`}>Following and status activity are private to your LoadLink account.</p>
            <Link href="/login?returnTo=%2Ffollowing" className="mt-5 inline-flex h-11 items-center rounded-full bg-[#f6b800] px-6 text-sm font-black text-black shadow-[0_10px_28px_rgba(246,184,0,.22)]">Sign in</Link>
          </div>
        ) : dealers.length === 0 ? (
          <div className={`mt-6 rounded-[24px] border p-8 text-center ${surface}`}>
            <h2 className="text-2xl font-black">No dealerships followed yet</h2>
            <p className={`mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 ${muted}`}>Find a dealership, open its showroom and follow it to see its status updates here.</p>
            <button type="button" onClick={() => chooseView("discover")} className="mt-5 inline-flex h-11 items-center rounded-full bg-[#f6b800] px-6 text-sm font-black text-black shadow-[0_10px_28px_rgba(246,184,0,.22)]">Find dealers</button>
          </div>
        ) : view === "following" ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dealers.map((dealer) => <DealerCard key={dealer.id} dealer={dealer} muted={muted} surface={surface} />)}
          </div>
        ) : updates.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {updates.map((update) => {
              const dealer = dealerById.get(update.dealership_id);
              return (
                <article key={update.id} className={`overflow-hidden rounded-[24px] border backdrop-blur-xl ${surface}`}>
                  {update.image_url ? <img src={update.image_url} alt="" className="aspect-square w-full object-cover sm:aspect-[16/10]" /> : null}
                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      {dealer ? <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-current/10">{dealer.profile_image_url ? <img src={dealer.profile_image_url} alt="" className="h-full w-full object-cover" /> : dealer.name.charAt(0)}</span> : null}
                      <div className="min-w-0"><span className={`block text-[9px] font-black uppercase tracking-[.08em] ${muted}`}>{update.update_type.replaceAll("_", " ")}</span>{dealer ? <Link href={`/dealership/${dealer.slug}`} className="block truncate text-xs font-black">{dealer.name}</Link> : null}</div>
                    </div>
                    <h2 className="mt-3 text-lg font-black">{update.title}</h2>
                    <p className={`mt-2 line-clamp-4 text-sm font-semibold leading-6 ${muted}`}>{update.body}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {update.listing_id ? <Link href={`/vehicles/${update.listing_id}`} className="inline-flex min-h-10 items-center rounded-full bg-[#f6b800] px-4 text-xs font-black text-black">View vehicle</Link> : null}
                      {dealer ? <Link href={`/dealership/${dealer.slug}`} className="inline-flex min-h-10 items-center rounded-full border border-[#f6b800]/60 px-4 text-xs font-black text-[#f6b800]">Open showroom</Link> : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={`mt-6 rounded-[24px] border p-8 text-center ${surface}`}><h2 className="text-2xl font-black">No new dealership updates</h2><p className={`mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 ${muted}`}>Fresh status updates from followed dealerships will appear here.</p></div>
        )}
      </section>
    </main>
  );
}

function DealerCard({ dealer, muted, surface }: { dealer: Dealer; muted: string; surface: string }) {
  return (
    <Link href={`/dealership/${dealer.slug}`} className={`group overflow-hidden rounded-[24px] border backdrop-blur-xl transition hover:-translate-y-0.5 ${surface}`}>
      <div className="relative aspect-[16/8] overflow-hidden bg-black">
        <img src={dealer.cover_image_url || "/images/jobs/jobs-hero-fleet.jpg"} alt="" className="h-full w-full object-cover opacity-78 transition duration-500 group-hover:scale-[1.025]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/28 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-end gap-3 text-white">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-black shadow-xl">{dealer.profile_image_url ? <img src={dealer.profile_image_url} alt={`${dealer.name} logo`} className="h-full w-full rounded-full object-cover" /> : <span className="text-xs font-black">{dealer.name.charAt(0)}</span>}</div>
          <div><div className="text-[9px] font-black uppercase tracking-[.08em] text-white/68">Verified dealership</div><h2 className="mt-1 line-clamp-1 text-lg font-black">{dealer.name}</h2></div>
        </div>
      </div>
      <div className="p-4">
        <p className={`line-clamp-2 min-h-10 text-sm font-semibold leading-5 ${muted}`}>{dealer.short_bio || "Commercial vehicle dealership on LoadLink."}</p>
        <div className="mt-4 flex items-center justify-between gap-3"><span className={`truncate text-xs font-semibold ${muted}`}>{dealer.physical_location || "South Africa"}</span><span className="text-xs font-black">{Number(dealer.active_listing_count || 0)} in stock</span></div>
        <span className="mt-4 inline-flex min-h-10 items-center rounded-full bg-[#f6b800] px-5 text-xs font-black text-black shadow-[0_8px_24px_rgba(246,184,0,.20)]">Open showroom</span>
      </div>
    </Link>
  );
}

function Tab({ active, onClick, darkMode, children }: { active: boolean; onClick: () => void; darkMode: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 shrink-0 rounded-full border px-5 text-sm font-black transition ${active ? "border-[#f6b800] bg-[#f6b800] text-black shadow-[0_8px_24px_rgba(246,184,0,.20)]" : darkMode ? "border-white/12 bg-white/[.045] text-white" : "border-black/10 bg-white/65 text-black"}`}
    >
      {children}
    </button>
  );
}
