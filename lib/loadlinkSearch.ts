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
  { id: "page-jobs", label: "Find logistics jobs", meta: "Jobs for truck and mobile-unit owners", href: "/jobs?portal=job", searchable: "jobs job work loads opportunities logistics truck mobile unit owner operator find work transport work", scope: "page", priority: 96 },
  { id: "page-contracts", label: "Find transport contracts", meta: "Recurring and project logistics work", href: "/contracts", searchable: "contracts contract tenders tender recurring project work opportunities loads transport agreement subcontract", scope: "page", priority: 96 },
  { id: "page-vehicles", label: "Commercial vehicles and units", meta: "Browse or list commercial vehicles and mobile units", href: "/list-your-vehicle?view=marketplace#vehicle-marketplace", searchable: "vehicles vehicle trucks truck trailer trailers mobile unit units side tipper superlink tautliner flatbed bakkie tractor horse commercial vehicle buy sell browse", scope: "page", priority: 96 },
  { id: "page-drivers", label: "Available drivers", meta: "Approved drivers ready for work", href: "/drivers", searchable: "drivers driver code 14 code 10 prdp pdp licence license experience hire employ operator", scope: "page", priority: 96 },
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

const INTENT_TERMS: Record<Exclude<SearchScope, "all" | "page">, Array<[string, number]>> = {
  job: [
    ["job", 8], ["jobs", 8], ["work", 5], ["load", 3], ["loads", 3], ["opportunity", 4], ["opportunities", 4],
    ["owner driver job", 10], ["transport work", 8], ["logistics work", 8], ["available job", 8],
  ],
  contract: [
    ["contract", 10], ["contracts", 10], ["tender", 9], ["tenders", 9], ["subcontract", 8], ["recurring", 6], ["long term", 6], ["long-term", 6], ["project work", 5],
  ],
  asset: [
    ["vehicle", 7], ["vehicles", 7], ["truck", 5], ["trucks", 5], ["trailer", 6], ["trailers", 6], ["mobile unit", 8], ["side tipper", 8], ["superlink", 8], ["tautliner", 8], ["flatbed", 8], ["flat deck", 8], ["bakkie", 7], ["tractor", 6], ["horse", 5], ["rigid", 5], ["refrigerated truck", 8], ["buy truck", 10], ["truck for sale", 10], ["vehicle for sale", 10],
  ],
  driver: [
    ["driver", 10], ["drivers", 10], ["code 14", 10], ["code 10", 9], ["prdp", 10], ["pdp", 8], ["licence", 5], ["license", 5], ["truck driver", 11], ["hire driver", 11],
  ],
  dealer: [
    ["dealership", 10], ["dealerships", 10], ["dealer", 9], ["dealers", 9], ["showroom", 7], ["dealer stock", 8],
  ],
};

export function inferSearchScope(query: string): SearchScope {
  const clean = normaliseSearch(query);
  if (!clean) return "all";

  const scores: Record<Exclude<SearchScope, "all" | "page">, number> = { job: 0, contract: 0, asset: 0, driver: 0, dealer: 0 };
  for (const [scope, terms] of Object.entries(INTENT_TERMS) as Array<[keyof typeof scores, Array<[string, number]>]>) {
    for (const [term, weight] of terms) if (clean.includes(normaliseSearch(term))) scores[scope] += weight;
  }

  if (/\bjobs?\b/.test(clean)) scores.job += 18;
  if (/\bcontracts?\b|\btenders?\b|\bsubcontracts?\b/.test(clean)) scores.contract += 20;
  if (/\bdrivers?\b|\bcode\s*14\b|\bcode\s*10\b|\bprdp\b|\bpdp\b/.test(clean)) scores.driver += 20;
  if (/\bdealerships?\b|\bdealers?\b|\bshowrooms?\b/.test(clean)) scores.dealer += 20;
  if (/\b(for sale|buy|sell|vehicle|vehicles|trailer|trailers|mobile unit|mobile units)\b/.test(clean) && !/\bjobs?\b|\bcontracts?\b/.test(clean)) scores.asset += 18;

  const ranked = (Object.entries(scores) as Array<[keyof typeof scores, number]>).sort((a, b) => b[1] - a[1]);
  if (!ranked[0] || ranked[0][1] < 6) return "all";
  if (ranked[1] && ranked[0][1] - ranked[1][1] < 4) return "all";
  return ranked[0][0];
}

export function listingScope(item: ListingSearchRow): "job" | "contract" | "asset" {
  const stored = String(item.listing_kind || "").toLowerCase().trim();
  if (["vehicle", "asset", "truck_sale", "vehicle_listing"].includes(stored)) return "asset";
  if (stored === "contract") return "contract";
  if (stored === "job") return "job";

  const described = String(String(item.description || "").match(/^Listing type:\s*([^\n]+)/im)?.[1] || "").toLowerCase();
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
    ? `/vehicles/${encodeURIComponent(item.id)}`
    : scope === "contract"
      ? `/contracts/${encodeURIComponent(item.id)}`
      : `/listing/${encodeURIComponent(item.id)}`;
  return {
    id: `listing-${item.id}`,
    label: title,
    meta: `${scopeLabel(scope)} · ${city}`,
    href,
    searchable: `${title} ${locationSearchTerms(city)} ${item.vehicle_group || ""} ${item.rate || ""} ${item.posted_by || ""} ${item.description || ""}`,
    location: city,
    scope,
    priority: 150,
  };
}

export function driverToSearchResult(driver: DriverSearchRow): SearchResult {
  const name = driver.full_name || "Approved LoadLink driver";
  const place = [driver.city, driver.province].filter(Boolean).join(", ") || "South Africa";
  return { id: `driver-${driver.id}`, label: name, meta: `${place} · Licence ${driver.licence_code || "on request"}`, href: `/drivers?search=${encodeURIComponent(name)}`, searchable: `${name} ${driver.headline || ""} ${locationSearchTerms(driver.city || driver.province)} ${driver.city || ""} ${driver.province || ""} ${driver.licence_code || ""} ${(driver.vehicle_types || []).join(" ")} ${driver.years_experience || ""} ${driver.availability || ""}`, location: driver.city || driver.province || "", scope: "driver", priority: 148 };
}

export function dealerToSearchResult(dealer: DealerSearchRow): SearchResult {
  const name = dealer.name || "Approved LoadLink dealership";
  return { id: `dealer-${dealer.id}`, label: name, meta: `${dealer.physical_location || dealer.province || "South Africa"} · Approved dealership`, href: dealer.slug ? `/dealership/${dealer.slug}` : "/dealer", searchable: `${name} ${dealer.short_bio || ""} ${dealer.business_description || ""} ${locationSearchTerms(dealer.physical_location || dealer.province)} ${dealer.physical_location || ""} ${dealer.province || ""} dealership dealer vehicles stock`, location: dealer.physical_location || dealer.province || "", scope: "dealer", priority: 146 };
}

export function scoreSearchResult(item: SearchResult, query: string, location = "") {
  if (location.trim() && item.scope !== "page" && !matchesSouthAfricanLocation(item.location || item.meta, location)) return -1;
  const combined = normaliseSearch(query);
  if (!combined) return item.priority + (location.trim() ? 18 : 0);
  const tokens = searchTokens(combined);
  const searchable = normaliseSearch(`${item.label} ${item.meta} ${item.searchable}`);
  const matches = tokens.filter((token) => tokenMatches(searchable, token)).length;
  if (!flexibleMatch(searchable, combined) && matches === 0) return -1;

  let score = item.priority + matches * 22;
  const cleanLabel = normaliseSearch(item.label);
  if (cleanLabel === combined) score += 90;
  else if (cleanLabel.startsWith(combined)) score += 48;
  if (searchable.includes(combined)) score += 30;
  if (location.trim() && item.scope !== "page") score += 20;

  const inferred = inferSearchScope(query);
  if (inferred !== "all") {
    if (item.scope === inferred) score += 90;
    else if (item.scope !== "page") score -= 100;
    if (item.scope === "page" && searchable.includes(normaliseSearch(scopeLabel(inferred)))) score += 38;
  }

  return score;
}

export function filterAndRankResults(items: SearchResult[], scope: SearchScope, query: string, location = "") {
  const inferred = scope === "all" ? inferSearchScope(query) : scope;
  return items
    .filter((item) => {
      if (scope !== "all") return item.scope === scope || (scope === "page" && item.scope === "page");
      if (inferred === "all") return true;
      if (item.scope === inferred) return true;
      if (item.scope === "page") return normaliseSearch(item.searchable).includes(normaliseSearch(scopeLabel(inferred)));
      return false;
    })
    .map((item) => ({ item, score: scoreSearchResult(item, query, location) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label))
    .map(({ item }) => item);
}

function withSearchParams(path: string, params: Record<string, string>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value.trim()) search.set(key, value.trim()); });
  const queryString = search.toString();
  return `${path}${queryString ? `?${queryString}` : ""}`;
}

export function routeForScope(scope: SearchScope, query: string, location: string) {
  const effective = scope === "all" ? inferSearchScope(query) : scope;
  const cleanQuery = query.trim();
  const cleanLocation = location.trim();

  if (effective === "job") return withSearchParams("/jobs", { portal: "job", search: cleanQuery, city: cleanLocation });
  if (effective === "contract") return withSearchParams("/contracts", { search: cleanQuery, city: cleanLocation });
  if (effective === "asset") {
    const base = withSearchParams("/list-your-vehicle", { search: cleanQuery, city: cleanLocation, view: "marketplace" });
    return `${base}#vehicle-marketplace`;
  }
  if (effective === "driver") return withSearchParams("/drivers", { search: cleanQuery, city: cleanLocation });
  if (effective === "dealer") return withSearchParams("/search", { q: cleanQuery, location: cleanLocation, category: "dealer" });

  const params = new URLSearchParams();
  if (cleanQuery) params.set("q", cleanQuery);
  if (cleanLocation) params.set("location", cleanLocation);
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
  if (scope === "all") return "Search jobs, contracts, vehicles, drivers or dealerships";
  if (scope === "contract") return "Search logistics contracts";
  if (scope === "asset") return "Search commercial vehicles or mobile units";
  if (scope === "driver") return "Search approved drivers";
  if (scope === "dealer") return "Search approved dealerships";
  return "Search logistics jobs";
}
