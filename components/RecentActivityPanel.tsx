"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatListingRate } from "@/lib/formatCurrency";

type RecentItem = {
  id: string;
  title: string;
  href: string;
  category: string;
  type: string;
  image?: string;
  meta?: string;
  savedAt?: number;
};

type ListingRow = {
  id: string;
  title?: string | null;
  city?: string | null;
  vehicle_group?: string | null;
  rate?: string | null;
  description?: string | null;
  photos?: string[] | null;
  created_at?: string | null;
  listing_kind?: string | null;
  status?: string | null;
  moderation_status?: string | null;
  expires_at?: string | null;
};

type ActivityTab = "posted" | "viewed" | "liked";

function parseItems(key: string): RecentItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item?.title && item?.href) : [];
  } catch {
    localStorage.removeItem(key);
    return [];
  }
}

function getViewedItems() {
  return uniqueItems(
    parseItems("loadlink-recent-viewed-jobs").filter((item) => {
      const href = String(item.href || "").toLowerCase();
      const category = String(item.category || "").toLowerCase();
      const isPortal = ["/jobs", "/contracts", "/driver-portal", "/driver-profile", "/drivers", "/list-your-vehicle"].includes(href);
      const isListing = href.includes("#job-") || href.startsWith("/listing/") || href.startsWith("/vehicle/") || ["job", "contract", "vehicle", "listing", "product"].includes(category);
      return !isPortal && isListing;
    }),
  );
}

function uniqueItems(items: RecentItem[]) {
  const unique = new Map<string, RecentItem>();
  items
    .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
    .forEach((item) => {
      const key = `${item.href}-${item.id || item.title}`;
      if (!unique.has(key)) unique.set(key, item);
    });
  return Array.from(unique.values()).slice(0, 12);
}

export default function RecentActivityPanel({ darkMode }: { darkMode: boolean }) {
  const [tab, setTab] = useState<ActivityTab>("viewed");
  const [posted, setPosted] = useState<RecentItem[]>([]);
  const [postedLoading, setPostedLoading] = useState(true);
  const [viewed, setViewed] = useState<RecentItem[]>([]);
  const [liked, setLiked] = useState<RecentItem[]>([]);
  const sliderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/job-listings?t=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (!active) return;
        const rows = ((payload.rows || []) as ListingRow[])
          .filter(isCurrent)
          .slice(0, 12)
          .map(toRecentItem);
        setPosted(rows);
      })
      .catch(() => {
        if (active) setPosted([]);
      })
      .finally(() => {
        if (active) setPostedLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const refresh = () => {
      setViewed(getViewedItems());
      setLiked(uniqueItems(parseItems("loadlink-liked-listings")));
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("loadlink-recent-activity-updated", refresh);
    window.addEventListener("loadlink-liked-listings-updated", refresh);
    window.addEventListener("loadlink-account-state-synced", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("loadlink-recent-activity-updated", refresh);
      window.removeEventListener("loadlink-liked-listings-updated", refresh);
      window.removeEventListener("loadlink-account-state-synced", refresh);
    };
  }, []);

  const items = useMemo(() => (tab === "posted" ? posted : tab === "viewed" ? viewed : liked), [liked, posted, tab, viewed]);
  useEffect(() => {
    sliderRef.current?.scrollTo({ left: 0, behavior: "auto" });
  }, [tab]);

  function moveSlider(direction: number) {
    sliderRef.current?.scrollBy({
      left: direction * Math.min(340, window.innerWidth * 0.82),
      behavior: "smooth",
    });
  }

  const emptyCopy = tab === "liked"
    ? "You have not saved any listings yet. Use the Save button on a listing to keep it here."
    : tab === "posted"
      ? "No approved marketplace listings have been published yet."
      : "Nothing has been viewed yet. Open a job, contract or vehicle listing and it will appear here.";

  return (
    <section className={`loadlink-home-activity-compact ${darkMode ? "bg-black text-white" : "bg-white text-black"} px-4 py-8 sm:px-5 md:px-10 md:py-10`}>
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-black tracking-[-0.045em] sm:text-3xl md:text-4xl">Continue where you left off</h2>
          {items.length > 1 ? (
            <div className="hidden shrink-0 gap-2 sm:flex">
              <button type="button" onClick={() => moveSlider(-1)} className={`flex h-10 w-10 items-center justify-center border outline-none ${darkMode ? "border-white/20" : "border-black/15"}`} aria-label="Previous recent item">←</button>
              <button type="button" onClick={() => moveSlider(1)} className="flex h-10 w-10 items-center justify-center bg-[#f6b800] text-black outline-none" aria-label="Next recent item">→</button>
            </div>
          ) : null}
        </div>

        <div data-loadlink-no-swipe-dots="true" className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2">
          {([[
            "posted",
            "Recently Posted",
          ], [
            "viewed",
            "Recently Viewed",
          ], [
            "liked",
            "Liked",
          ]] as [ActivityTab, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`shrink-0 snap-start border px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] sm:text-[11px] ${
                tab === value
                  ? "border-[#f6b800] bg-[#f6b800] text-black"
                  : darkMode
                    ? "border-white/15 bg-white/5 text-white/65"
                    : "border-black/10 bg-black/[0.03] text-black/65"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "posted" && postedLoading ? (
          <div className="mt-5 flex gap-3 overflow-hidden" aria-label="Loading recently posted listings">
            {[0, 1, 2].map((item) => <div key={item} className={`h-[205px] w-[70vw] max-w-[260px] shrink-0 animate-pulse border sm:w-[280px] ${darkMode ? "border-white/10 bg-white/[.04]" : "border-black/10 bg-black/[.04]"}`} />)}
          </div>
        ) : items.length ? (
          <div ref={sliderRef} data-loadlink-swipe-dots="true" className="no-scrollbar mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3 touch-pan-x" aria-label={`${tab === "posted" ? "Recently posted" : tab === "viewed" ? "Recently viewed" : "Liked"} listings`}>
            {items.map((item) => (
              <Link key={`${item.href}-${item.id}`} href={item.href} className={`w-[70vw] max-w-[260px] shrink-0 snap-start overflow-hidden border sm:w-[280px] sm:max-w-[280px] ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
                <div className="aspect-[16/10] overflow-hidden bg-black/10">
                  {item.image ? <img src={item.image} alt={item.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center bg-[#f6b800] text-2xl font-black text-black">LL</div>}
                </div>
                <div className="p-3.5">
                  <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${darkMode ? "text-white/45" : "text-black/45"}`}>{item.category}</p>
                  <h3 className="mt-1.5 line-clamp-2 text-base font-black leading-snug sm:text-lg">{item.title}</h3>
                  <p className={`mt-1.5 line-clamp-1 text-[11px] font-bold ${darkMode ? "text-white/50" : "text-black/50"}`}>{item.meta || item.type}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={`mt-5 border p-6 text-center ${darkMode ? "border-white/10 bg-[#090909] text-white/55" : "border-black/10 bg-[#fafafa] text-black/55"}`}>
            <p className="text-lg font-black">Nothing here yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6">{emptyCopy}</p>
            {tab === "liked" ? <Link href="/jobs" className="mt-5 inline-flex border border-[#f6b800] px-5 py-3 text-xs font-black uppercase tracking-wide text-[#b88900]">Browse listings</Link> : null}
          </div>
        )}
      </div>
    </section>
  );
}

function isCurrent(item: ListingRow) {
  if (item.status && item.status !== "active") return false;
  if (item.moderation_status && item.moderation_status !== "approved") return false;
  if (item.expires_at) {
    const expiry = new Date(item.expires_at).getTime();
    if (Number.isFinite(expiry) && expiry <= Date.now()) return false;
  }
  return true;
}

function listingKind(item: ListingRow) {
  const stored = String(item.listing_kind || "").toLowerCase();
  if (["vehicle", "asset", "truck_sale", "vehicle_listing"].includes(stored)) return "asset";
  if (stored === "contract") return "contract";
  const match = String(item.description || "").match(/^Listing type:\s*([^\n]+)/i);
  const value = String(match?.[1] || "").toLowerCase();
  if (value.includes("contract")) return "contract";
  if (value.includes("vehicle") || value.includes("truck") || value.includes("trailer") || value.includes("mobile unit")) return "asset";
  return "job";
}

function toRecentItem(item: ListingRow): RecentItem {
  const kind = listingKind(item);
  const category = kind === "contract" ? "Contract" : kind === "asset" ? "Vehicle" : "Job";
  return {
    id: item.id,
    title: item.title || "LoadLink listing",
    href: `/jobs?portal=${kind}#job-${item.id}`,
    category,
    type: item.vehicle_group || "Logistics",
    image: item.photos?.[0] || undefined,
    meta: `${item.city || "South Africa"} · ${formatListingRate(item.rate || "")}`,
    savedAt: item.created_at ? new Date(item.created_at).getTime() : 0,
  };
}
