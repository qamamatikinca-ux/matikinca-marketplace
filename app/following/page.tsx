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

export default function FollowingPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [updates, setUpdates] = useState<DealerUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);
  const [view, setView] = useState<"following" | "updates">("following");

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view") === "updates") {
      setView("updates");
    }
    void loadFollowing();
  }, []);

  async function loadFollowing() {
    setLoading(true);
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSignedIn(false);
      setLoading(false);
      return;
    }

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
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const surface = darkMode ? "border-white/10 bg-[#0c0c0c] text-white" : "border-black/10 bg-white text-black";

  function chooseView(next: "following" | "updates") {
    setView(next);
    if (typeof window !== "undefined") {
      const url = next === "updates" ? "/following?view=updates" : "/following";
      window.history.replaceState(null, "", url);
    }
  }

  return (
    <main className={darkMode ? "min-h-screen bg-black text-white" : "min-h-screen bg-[#f4efe3] text-black"}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-5 md:px-6 md:pt-8">
        <div className="flex flex-col gap-5 border-b border-current/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className={`text-xs font-black uppercase tracking-[.12em] ${muted}`}>Your dealership network</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">Following</h1>
            <p className={`mt-2 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>See the dealerships you follow, their active stock and their latest LoadLink updates in one place.</p>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            <button type="button" onClick={() => chooseView("following")} className={`min-h-11 shrink-0 rounded-full border px-5 text-sm font-black ${view === "following" ? "border-[#f6b800] bg-[#f6b800] text-black" : darkMode ? "border-white/15 bg-white/[.04] text-white" : "border-black/10 bg-white text-black"}`}>Following</button>
            <button type="button" onClick={() => chooseView("updates")} className={`min-h-11 shrink-0 rounded-full border px-5 text-sm font-black ${view === "updates" ? "border-[#f6b800] bg-[#f6b800] text-black" : darkMode ? "border-white/15 bg-white/[.04] text-white" : "border-black/10 bg-white text-black"}`}>Updates{updates.length ? ` · ${updates.length}` : ""}</button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[55vh] items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-2 border-current/10 border-t-[#f6b800]" /></div>
        ) : !signedIn ? (
          <div className={`mt-6 border p-8 text-center ${surface}`}>
            <h2 className="text-2xl font-black">Sign in to see who you follow</h2>
            <p className={`mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 ${muted}`}>Your followed dealerships and updates are linked to your LoadLink account.</p>
            <Link href="/login?returnTo=%2Ffollowing" className="mt-5 inline-flex h-11 items-center bg-[#f6b800] px-5 text-sm font-black text-black">Sign in</Link>
          </div>
        ) : dealers.length === 0 ? (
          <div className={`mt-6 border p-8 text-center ${surface}`}>
            <h2 className="text-2xl font-black">No dealerships followed yet</h2>
            <p className={`mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 ${muted}`}>Follow a verified dealership from its showroom and it will appear here with its active stock and updates.</p>
            <Link href="/vehicles" className="mt-5 inline-flex h-11 items-center bg-[#f6b800] px-5 text-sm font-black text-black">Browse vehicles</Link>
          </div>
        ) : view === "following" ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dealers.map((dealer) => (
              <Link key={dealer.id} href={`/dealership/${dealer.slug}`} className={`group overflow-hidden border transition hover:border-[#f6b800] ${surface}`}>
                <div className="relative aspect-[16/7] overflow-hidden bg-black">
                  {dealer.cover_image_url ? <img src={dealer.cover_image_url} alt="" className="h-full w-full object-cover opacity-65 transition duration-300 group-hover:scale-[1.015]" /> : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
                  <div className="absolute bottom-3 left-3 flex items-end gap-3 text-white">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden border border-white/25 bg-black">{dealer.profile_image_url ? <img src={dealer.profile_image_url} alt={`${dealer.name} logo`} className="h-full w-full object-cover" /> : <span className="text-xs font-black">LL</span>}</div>
                    <div><div className="text-[9px] font-black uppercase tracking-[.08em] text-white/65">✓ Verified Dealer</div><h2 className="mt-1 line-clamp-1 text-lg font-black">{dealer.name}</h2></div>
                  </div>
                </div>
                <div className="p-4">
                  <p className={`line-clamp-2 min-h-10 text-sm font-semibold leading-5 ${muted}`}>{dealer.short_bio || "Commercial vehicle dealership on LoadLink."}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className={`border p-3 ${darkMode ? "border-white/10 bg-white/[.025]" : "border-black/[.06] bg-[#faf8f2]"}`}><div className={`text-[9px] font-black uppercase tracking-[.08em] ${muted}`}>Active stock</div><div className="mt-1 text-xl font-black">{Number(dealer.active_listing_count || 0)}</div></div>
                    <div className={`border p-3 ${darkMode ? "border-white/10 bg-white/[.025]" : "border-black/[.06] bg-[#faf8f2]"}`}><div className={`text-[9px] font-black uppercase tracking-[.08em] ${muted}`}>Followers</div><div className="mt-1 text-xl font-black">{Number(dealer.follower_count || 0)}</div></div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3"><span className={`truncate text-xs font-semibold ${muted}`}>{dealer.physical_location || "South Africa"}</span><span className="text-xs font-black">View stock →</span></div>
                </div>
              </Link>
            ))}
          </div>
        ) : updates.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {updates.map((update) => {
              const dealer = dealerById.get(update.dealership_id);
              return (
                <article key={update.id} className={`overflow-hidden border ${surface}`}>
                  {update.image_url ? <img src={update.image_url} alt="" className="aspect-[16/8] w-full object-cover" /> : null}
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-3"><span className={`text-[9px] font-black uppercase tracking-[.08em] ${muted}`}>{update.update_type.replaceAll("_", " ")}</span>{dealer ? <Link href={`/dealership/${dealer.slug}`} className="truncate text-[10px] font-black">{dealer.name}</Link> : null}</div>
                    <h2 className="mt-2 text-lg font-black">{update.title}</h2>
                    <p className={`mt-2 line-clamp-4 text-sm font-semibold leading-6 ${muted}`}>{update.body}</p>
                    <div className="mt-4 flex gap-3">{update.listing_id ? <Link href={`/vehicles/${update.listing_id}`} className="text-xs font-black underline underline-offset-4">View vehicle</Link> : null}{dealer ? <Link href={`/dealership/${dealer.slug}`} className="text-xs font-black underline underline-offset-4">Open dealer</Link> : null}</div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={`mt-6 border p-8 text-center ${surface}`}><h2 className="text-2xl font-black">No new dealership updates</h2><p className={`mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 ${muted}`}>Updates from the dealerships you follow will appear here.</p></div>
        )}
      </section>
    </main>
  );
}
