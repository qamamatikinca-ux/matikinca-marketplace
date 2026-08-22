"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type ListingState = {
  state?: "active" | "deleted" | "rejected" | "unavailable" | string;
  id?: string | null;
  title?: string | null;
  city?: string | null;
  vehicle_group?: string | null;
  rate?: string | null;
  posted_by?: string | null;
  created_at?: string | null;
  rejection_reason?: string | null;
  rejected_at?: string | null;
  deleted_at?: string | null;
};

type MarketplaceListing = {
  id?: string | null;
  listing_kind?: string | null;
  description?: string | null;
  vehicle_group?: string | null;
};

function firstRow(data: unknown): ListingState | null {
  if (Array.isArray(data)) return (data[0] as ListingState | undefined) || null;
  if (data && typeof data === "object") return data as ListingState;
  return null;
}

function isVehicle(row: MarketplaceListing | undefined) {
  if (!row) return false;
  const kind = String(row.listing_kind || "").toLowerCase();
  if (["vehicle", "asset", "truck_sale", "vehicle_listing"].includes(kind)) return true;
  return /^Listing type:\s*(Truck|Trailer|Mobile Unit)/im.test(String(row.description || ""));
}

function isContract(row: MarketplaceListing | undefined) {
  if (!row) return false;
  const kind = String(row.listing_kind || "").toLowerCase();
  return kind === "contract" || /^Listing type:\s*Contract/im.test(String(row.description || ""));
}

async function destinationForActiveListing(id: string) {
  try {
    const response = await fetch(`/api/job-listings?t=${Date.now()}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    const row = ((payload.rows || []) as MarketplaceListing[]).find((item) => String(item.id || "") === id);
    if (isVehicle(row)) return `/vehicles/${encodeURIComponent(id)}`;
    if (isContract(row)) return `/jobs?portal=contract#job-${encodeURIComponent(id)}`;
  } catch {}
  return `/jobs?portal=job#job-${encodeURIComponent(id)}`;
}

export default function ListingCanonicalPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [state, setState] = useState<ListingState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let active = true;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase.rpc("loadlink_listing_public_state", { p_listing_id: id });
      if (!active) return;
      if (error) {
        setState({ state: "unavailable" });
        setLoading(false);
        return;
      }
      const next = firstRow(data) || { state: "unavailable" };
      if (next.state === "active") {
        const destination = await destinationForActiveListing(id);
        if (active) window.location.replace(destination);
        return;
      }
      setState(next);
      setLoading(false);
    }

    void load();
    return () => { active = false; };
  }, [id]);

  const page = darkMode ? "bg-black text-white" : "bg-[#fff7df] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const currentState = state?.state || "unavailable";
  const heading = currentState === "deleted" ? "This post has been deleted" : currentState === "rejected" ? "This post is not available" : "This post is unavailable";
  const detail = currentState === "deleted"
    ? "The poster removed this listing, so it is no longer visible on the marketplace."
    : currentState === "rejected"
      ? "LoadLink removed this listing from the public marketplace."
      : "This listing may have expired, been removed, or is no longer publicly available.";

  return (
    <main className={`min-h-screen ${page}`}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <section className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-24">
        <div className={`rounded-[28px] border p-7 shadow-[0_18px_55px_rgba(0,0,0,.08)] md:p-10 ${surface}`}>
          {loading ? (
            <div className="space-y-4" aria-label="Loading listing">
              <div className={`h-3 w-28 rounded-full ${darkMode ? "bg-white/10" : "bg-black/10"}`} />
              <div className={`h-10 w-4/5 rounded-2xl ${darkMode ? "bg-white/10" : "bg-black/10"}`} />
              <div className={`h-20 w-full rounded-2xl ${darkMode ? "bg-white/[.07]" : "bg-black/[.06]"}`} />
            </div>
          ) : (
            <>
              <span className="inline-flex rounded-full border border-[#f6b800]/45 bg-[#f6b800]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] text-[#b88900]">Listing update</span>
              <h1 className="mt-5 text-4xl font-black tracking-[-.045em] md:text-5xl">{heading}</h1>
              <p className={`mt-4 text-sm font-semibold leading-7 ${muted}`}>{detail}</p>

              {state?.title ? (
                <div className={`mt-7 rounded-[20px] border p-4 ${darkMode ? "border-white/10 bg-white/[.025]" : "border-black/[.07] bg-black/[.02]"}`}>
                  <p className="text-lg font-black">{state.title}</p>
                  <p className={`mt-1 text-xs font-semibold ${muted}`}>{[state.city, state.vehicle_group].filter(Boolean).join(" · ") || "LoadLink listing"}</p>
                </div>
              ) : null}

              {currentState === "rejected" && state?.rejection_reason ? (
                <div className="mt-5 rounded-[18px] border border-red-500/20 bg-red-500/[.06] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[.12em] text-red-500">Reason</p>
                  <p className={`mt-2 text-sm font-semibold leading-6 ${darkMode ? "text-white/72" : "text-black/72"}`}>{state.rejection_reason}</p>
                </div>
              ) : null}

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/jobs?portal=job" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-xs font-black uppercase text-black">Browse current jobs</Link>
                <Link href="/list-your-vehicle?view=marketplace#vehicle-marketplace" className={`inline-flex min-h-12 items-center justify-center rounded-xl border px-5 text-xs font-black uppercase ${darkMode ? "border-white/15" : "border-black/12"}`}>Browse vehicles</Link>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
