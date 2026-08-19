"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

function getViewedItems() {
  return uniqueItems(
    parseItems("loadlink-recent-viewed-jobs").filter((item) => {
      const href = String(item.href || "").toLowerCase();
      const category = String(item.category || "").toLowerCase();
      const isPortal = ["/jobs", "/contracts", "/driver-portal", "/driver-profile", "/drivers", "/list-your-vehicle"].includes(href);
      const isListing = href.includes("#job-") || href.startsWith("/listing/") || href.startsWith("/vehicle/") || href.startsWith("/vehicles/") || ["job", "contract", "vehicle", "listing", "product"].includes(category);
      return !isPortal && isListing;
    }),
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
    image: item.photos?.find((photo) => Boolean(String(photo || "").trim())) || undefined,
    meta: `${item.city || "South Africa"} · ${formatListingRate(item.rate || "")}`,
    savedAt: item.created_at ? new Date(item.created_at).getTime() : 0,
  };
}

function idFromRecent(item: RecentItem) {
  const direct = String(item.id || "").trim();
  if (direct) return direct;
  const href = String(item.href || "");
  const hashMatch = href.match(/#job-([^/?#&]+)/i);
  if (hashMatch?.[1]) return decodeURIComponent(hashMatch[1]);
  const pathMatch = href.match(/^\/(?:listing|vehicles?|jobs)\/([^/?#]+)/i);
  return pathMatch?.[1] ? decodeURIComponent(pathMatch[1]) : "";
}

function findListing(item: RecentItem, catalog: ListingRow[]) {
  const id = idFromRecent(item);
  if (id) {
    const byId = catalog.find((row) => String(row.id) === id);
    if (byId) return byId;
  }
  const title = item.title.trim().toLowerCase();
  return catalog.find((row) => String(row.title || "").trim().toLowerCase() === title);
}

function refreshSavedItem(item: RecentItem, catalog: ListingRow[]) {
  const row = findListing(item, catalog);
  if (!row) return null;
  const fresh = toRecentItem(row);
  return {
    ...item,
    ...fresh,
    savedAt: item.savedAt || fresh.savedAt,
  };
}

export default function RecentActivityPanel({ darkMode }: { darkMode: boolean }) {
  const [tab, setTab] = useState<ActivityTab>("viewed");
  const [posted, setPosted] = useState<RecentItem[]>([]);
  const [postedLoading, setPostedLoading] = useState(true);
  const [viewed, setViewed] = useState<RecentItem[]>([]);
  const [liked, setLiked] = useState<RecentItem[]>([]);
  const [catalog, setCatalog] = useState<ListingRow[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/job-listings?t=${Date.now()}`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Listings could not be loaded.");
        return response.json();
      })
      .then((payload) => {
        if (!active) return;
        const rows = ((payload.rows || []) as ListingRow[]).filter(isCurrent);
        setCatalog(rows);
        setPosted(rows.slice(0, 12).map(toRecentItem));
        setCatalogReady(true);
      })
      .catch(() => {
        if (!active) return;
        setPosted([]);
        setCatalog([]);
        setCatalogReady(false);
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

  const items = useMemo(() => {
    if (tab === "posted") return posted;
    const source = tab === "viewed" ? viewed : liked;
    if (!catalogReady) return source;
    return source
      .map((item) => refreshSavedItem(item, catalog))
      .filter((item): item is RecentItem => Boolean(item))
      .slice(0, 12);
  }, [catalog, catalogReady, liked, posted, tab, viewed]);

  const emptyCopy = tab === "liked"
    ? "You have not saved any current listings yet. Use the Save button on a listing to keep it here."
    : tab === "posted"
      ? "No approved marketplace listings have been published yet."
      : "Nothing current has been viewed yet. Open a job, contract or vehicle listing and it will appear here.";

  return (
    <section className={`${darkMode ? "bg-black text-white" : "bg-white text-black"} px-4 py-9 sm:px-5 md:py-10`}>
      <div className="mx-auto max-w-5xl">
        <h2 className="text-2xl font-bold tracking-[-0.03em] md:text-4xl">Continue where you left off</h2>

        <div data-loadlink-no-swipe-dots="true" className="mt-4 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 no-scrollbar">
          {([
            ["posted", "Recently Posted"],
            ["viewed", "Recently Viewed"],
            ["liked", "Liked"],
          ] as [ActivityTab, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`shrink-0 snap-start rounded-xl border px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[.04em] ${
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
          <div className="mt-6 flex gap-4 overflow-hidden" aria-label="Loading recently posted listings">
            {[0, 1, 2].map((item) => (
              <div key={item} className={`h-64 w-[82vw] max-w-[310px] shrink-0 animate-pulse rounded-[22px] border ${darkMode ? "border-white/10 bg-white/[.04]" : "border-black/10 bg-black/[.04]"}`} />
            ))}
          </div>
        ) : items.length ? (
          <div
            data-loadlink-product-slider="true"
            data-loadlink-swipe-dots="true"
            className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-3 touch-pan-x"
            aria-label={`${tab === "posted" ? "Recently posted" : tab === "viewed" ? "Recently viewed" : "Liked"} listings`}
          >
            {items.map((item) => (
              <Link
                key={`${item.href}-${item.id}`}
                href={item.href}
                className={`w-[82vw] max-w-[310px] shrink-0 snap-start overflow-hidden rounded-[22px] border ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}
              >
                <div className="aspect-[4/3] overflow-hidden bg-black/10">
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className={`flex h-full items-center justify-center text-xs font-black ${darkMode ? "bg-white/[.04] text-white/35" : "bg-black/[.04] text-black/35"}`}>No post photo</div>
                  )}
                </div>
                <div className="p-4">
                  <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${darkMode ? "text-white/45" : "text-black/45"}`}>{item.category}</p>
                  <h3 className="mt-2 line-clamp-2 text-lg font-black">{item.title}</h3>
                  <p className={`mt-2 text-xs font-bold ${darkMode ? "text-white/50" : "text-black/50"}`}>{item.meta || item.type}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={`mt-6 rounded-[22px] border p-8 text-center ${darkMode ? "border-white/10 bg-[#090909] text-white/55" : "border-black/10 bg-[#fafafa] text-black/55"}`}>
            <p className="text-lg font-black">Nothing here yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6">{emptyCopy}</p>
            {tab === "liked" ? <Link href="/jobs" className="mt-5 inline-flex rounded-xl border border-[#f6b800] px-5 py-3 text-xs font-black uppercase tracking-wide text-[#b88900]">Browse listings</Link> : null}
          </div>
        )}
      </div>
    </section>
  );
}
