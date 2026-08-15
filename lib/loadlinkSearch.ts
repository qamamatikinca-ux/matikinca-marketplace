import { flexibleMatch, normaliseSearch, searchTokens, tokenMatches } from "@/lib/smartSearch";
import { locationSearchTerms, matchesSouthAfricanLocation } from "@/lib/southAfricaLocations";

export type SearchScope = "all" | "job" | "contract" | "asset" | "driver" | "dealer" | "page";

export type ListingSearchRow = {
  id: string;
  title?: string | null;
  city?: string | null;
  vehicle_group?: string | null;
  rate?: string | null;
  posted_by?: string | null;
  description?: string | null;
  listing_kind?: string | null;
  status?: string | null;
  moderation_status?: string | null;
  expires_at?: string | null;
};

export type DriverSearchRow = { id: string; full_name?: string | null; headline?: string | null; city?: string | null; province?: string | null; licence_code?: string | null; vehicle_types?: string[] | null; years_experience?: number | null; availability?: string | null };
export type DealerSearchRow = { id: string; slug?: string | null; name?: string | null; short_bio?: string | null; business_description?: string | null; physical_location?: string | null; province?: string | null; verification_status?: string | null; is_public?: boolean | null };
export type SearchResult = { id: string; label: string; meta: string; href: string; searchable: string; scope: SearchScope; priority: number; location?: string };

export const searchScopes: { label: string; value: SearchScope }[] = [
  { label: "All", value: "all" }, { label: "Jobs", value: "job" }, { label: "Contracts", value: "contract" }, { label: "Vehicles", value: "asset" }, { label: "Drivers", value: "driver" }, { label: "Dealerships", value: "dealer" },
];

export const loadLinkSitePages: SearchResult[] = [
  { id: "page-home", label: "LoadLink homepage", meta: "Main marketplace", href: "/", searchable: "home homepage loadlink marketplace start", scope: "page", priority: 82 },
  { id: "page-jobs", label: "Find logistics jobs", meta: "Jobs for truck and mobile-unit owners", href: "/jobs", searchable: "jobs work loads opportunities logistics truck mobile unit find work", scope: "page", priority: 90 },
  { id: "page-contracts", label: "Find contracts", meta: "Recurring and project logistics work", href: "/contracts", searchable: "contracts tenders recurring project work opportunities loads", scope: "page", priority: 90 },
  { id: "page-drivers", label: "Available drivers", meta: "Approved drivers ready for work", href: "/drivers", searchable: "drivers available driver profiles licence experience hire employ", scope: "page", priority: 90 },
  { id: "page-driver-profile", label: "Create or manage driver profile", meta: "Driver experience and availability", href: "/driver-profile", searchable: "create driver profile manage cv licence experience availability", scope: "page", priority: 88 },
  { id: "page-driver-portal", label: "Driver options", meta: "View drivers or manage your profile", href: "/driver-portal", searchable: "driver portal options view available create profile", scope: "page", priority: 78 },
  { id: "page-list-vehicle", label: "List a commercial vehicle", meta: "Truck, trailer or mobile-unit listing", href: "/list-your-vehicle", searchable: "sell list vehicle truck trailer mobile unit advertise post", scope: "page", priority: 88 },
  { id: "page-messages", label: "Messages", meta: "LoadLink conversations", href: "/messages", searchable: "messages chat conversation voice notes attachments contact", scope: "page", priority: 80 },
  { id: "page-notifications", label: "Notifications", meta: "Approvals, messages and account updates", href: "/notifications", searchable: "notifications alerts approval rejected messages updates", scope: "page", priority: 80 },
  { id: "page-my-posts", label: "My posts", meta: "Manage your listings", href: "/my-posts", searchable: "my posts listings edit delete manage status analytics", scope: "page", priority: 82 },
  { id: "page-dealer", label: "Dealership centre", meta: "Manage dealership profile and stock", href: "/dealer", searchable: "dealer dealership centre inventory stock add post business", scope: "page", priority: 82 },
  { id: "page-packages", label: "Packages", meta: "Manual, Pro and Dealer plans", href: "/packages", searchable: "packages pricing pro premium dealer upgrade subscription", scope: "page", priority: 78 },
  { id: "page-settings", label: "Profile settings", meta: "Account, profile and alerts", href: "/account/settings", searchable: "settings account profile picture notifications privacy theme", scope: "page", priority: 78 },
  { id: "page-help", label: "Help centre", meta: "Support, safety and frequently asked questions", href: "/help", searchable: "help support faq safety contact assistance linkbot", scope: "page", priority: 76 },
  { id: "page-verify", label: "Verification", meta: "Identity and account verification", href: "/verify", searchable: "verify verification identity id phone documents account", scope: "page", priority: 76 },
];

export function listingScope(item: ListingSearchRow): "job" | "contract" | "asset" {
  const stored = String(item.listing_kind || "").toLowerCase();
  if (["vehicle", "asset", "truck_sale", "vehicle_listing"].includes(stored)) return "asset";
  if (stored === "contract") return "contract";
  const match = String(item.description || "").match(/^Listing type:\s*([^\n]+)/i);
  const described = String(match?.[1] || "").toLowerCase();
  if (described.includes("contract")) return "contract";
  if (described.includes("vehicle") || described.includes("truck") || described.includes("trailer") || described.includes("mobile unit")) return "asset";
  return "job";
}

export function isCurrentListing(item: ListingSearchRow) {
  if (item.status && item.status !== "active") return false;
  if (item.moderation_status && item.moderation_status !== "approved") return false;
  if (item.expires_at) { const expiry = new Date(item.expires_at).getTime(); if (Number.isFinite(expiry) && expiry <= Date.now()) return false; }
  return true;
}

export function listingToSearchResult(item: ListingSearchRow): SearchResult {
  const scope = listingScope(item);
  const title = item.title || "LoadLink listing";
  const city = item.city || "South Africa";
  const href = scope === "asset"
    ? `/listing/${item.id}`
    : `/jobs?portal=${scope}&search=${encodeURIComponent(`${title} ${city}`)}#job-${item.id}`;
  return {
    id: `listing-${item.id}`,
    label: title,
    meta: `${scopeLabel(scope)} · ${city}`,
    href,
    searchable: `${title} ${locationSearchTerms(city)} ${item.vehicle_group || ""} ${item.rate || ""} ${item.posted_by || ""} ${item.description || ""}`,
    location: city,
    scope,
    priority: 140,
  };
}

export function driverToSearchResult(driver: DriverSearchRow): SearchResult {
  const name = driver.full_name || "Approved LoadLink driver";
  const place = [driver.city, driver.province].filter(Boolean).join(", ") || "South Africa";
  return { id: `driver-${driver.id}`, label: name, meta: `${place} · Licence ${driver.licence_code || "on request"}`, href: `/drivers?search=${encodeURIComponent(name)}`, searchable: `${name} ${driver.headline || ""} ${locationSearchTerms(driver.city || driver.province)} ${driver.city || ""} ${driver.province || ""} ${driver.licence_code || ""} ${(driver.vehicle_types || []).join(" ")} ${driver.years_experience || ""} ${driver.availability || ""}`, location: driver.city || driver.province || "", scope: "driver", priority: 138 };
}

export function dealerToSearchResult(dealer: DealerSearchRow): SearchResult {
  const name = dealer.name || "Approved LoadLink dealership";
  return { id: `dealer-${dealer.id}`, label: name, meta: `${dealer.physical_location || dealer.province || "South Africa"} · Approved dealership`, href: dealer.slug ? `/dealership/${dealer.slug}` : "/dealer", searchable: `${name} ${dealer.short_bio || ""} ${dealer.business_description || ""} ${locationSearchTerms(dealer.physical_location || dealer.province)} ${dealer.physical_location || ""} ${dealer.province || ""} dealership dealer vehicles stock`, location: dealer.physical_location || dealer.province || "", scope: "dealer", priority: 136 };
}

export function scoreSearchResult(item: SearchResult, query: string, location = "") {
  if (location.trim() && item.scope !== "page" && !matchesSouthAfricanLocation(item.location || item.meta, location)) return -1;
  const combined = normaliseSearch(query);
  if (!combined) return item.priority + (location.trim() ? 18 : 0);
  const tokens = searchTokens(combined);
  const searchable = normaliseSearch(`${item.label} ${item.meta} ${item.searchable}`);
  const matches = tokens.filter((token) => tokenMatches(searchable, token)).length;
  if (!flexibleMatch(searchable, combined) && matches === 0) return -1;
  let score = item.priority + matches * 20;
  const cleanQuery = normaliseSearch(query);
  if (cleanQuery && normaliseSearch(item.label).startsWith(cleanQuery)) score += 42;
  if (cleanQuery && searchable.includes(cleanQuery)) score += 24;
  if (location.trim() && item.scope !== "page") score += 18;
  return score;
}

export function filterAndRankResults(items: SearchResult[], scope: SearchScope, query: string, location = "") {
  return items.filter((item) => scope === "all" || item.scope === scope || (scope === "page" && item.scope === "page")).map((item) => ({ item, score: scoreSearchResult(item, query, location) })).filter(({ score }) => score >= 0).sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label)).map(({ item }) => item);
}

export function routeForScope(scope: SearchScope, query: string, location: string) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (location.trim()) params.set("location", location.trim());
  if (scope !== "all") params.set("category", scope);
  const queryString = params.toString();
  return `/search${queryString ? `?${queryString}` : ""}`;
}

export function scopeLabel(scope: SearchScope) {
  if (scope === "all") return "All";
  if (scope === "contract") return "Contracts";
  if (scope === "asset") return "Vehicles";
  if (scope === "driver") return "Drivers";
  if (scope === "dealer") return "Dealerships";
  if (scope === "page") return "Pages";
  return "Jobs";
}

export function placeholderForScope(scope: SearchScope) {
  if (scope === "all") return "Search everything on LoadLink";
  if (scope === "contract") return "Search logistics contracts";
  if (scope === "asset") return "Search commercial vehicles or mobile units";
  if (scope === "driver") return "Search approved drivers";
  if (scope === "dealer") return "Search approved dealerships";
  return "Search logistics jobs";
}
