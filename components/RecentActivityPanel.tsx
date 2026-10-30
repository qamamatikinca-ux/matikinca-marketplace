"use client";

import LoadLinkImage from "@/components/LoadLinkImage";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatListingRate } from "@/lib/formatCurrency";
import styles from "./recent-activity.module.css";

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

function refreshSavedItem(item: RecentItem, catalog: ListingRow[]): RecentItem | null {
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
    <section className={styles.root} data-theme={darkMode ? "dark" : "light"} data-loadlink-recent-activity="true">
      <div className={styles.inner}>
        <h2 className={styles.title}>Continue where you left off</h2>

        <div data-loadlink-no-swipe-dots="true" className={styles.tabs} role="tablist" aria-label="Recent activity">
          {([
            ["posted", "Recently posted"],
            ["viewed", "Recently viewed"],
            ["liked", "Liked"],
          ] as [ActivityTab, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              className={styles.tab}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "posted" && postedLoading ? (
          <div className={styles.carousel} aria-label="Loading recently posted listings" role="status">
            {[0, 1, 2].map((item) => <div key={item} className={styles.skeleton} />)}
          </div>
        ) : items.length ? (
          <div
            data-loadlink-product-slider="true"
            data-loadlink-swipe-dots="true"
            className={styles.carousel}
            aria-label={`${tab === "posted" ? "Recently posted" : tab === "viewed" ? "Recently viewed" : "Liked"} listings`}
          >
            {items.map((item) => (
              <Link key={`${item.href}-${item.id}`} href={item.href} className={styles.card}>
                <div className={styles.media}>
                  {item.image ? (
                    <LoadLinkImage src={item.image} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className={styles.noImage}>No listing photo</div>
                  )}
                </div>
                <div className={styles.content}>
                  <p className={styles.type}>{item.category}</p>
                  <h3 className={styles.name}>{item.title}</h3>
                  <p className={styles.meta}>{item.meta || item.type}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <strong>Nothing here yet</strong>
            <p>{emptyCopy}</p>
            {tab === "liked" ? <Link href="/jobs">Browse listings</Link> : null}
          </div>
        )}
      </div>
    </section>
  );
}
