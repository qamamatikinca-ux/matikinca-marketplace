import { NextResponse } from "next/server";
import { serverRateLimit } from "@/lib/serverRateLimit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_FIELDS = [
  "id","title","city","vehicle_group","rate","posted_by","contact_number","whatsapp_number","poster_photo","description","photos","sponsored","package_type","created_at","view_count","last_viewed_at","user_id","listing_kind","status","moderation_status","expires_at","stock_status","dealership_id",
].join(",");

type DealerMeta = {
  dealership_id?: string | null;
  owner_user_id?: string | null;
  dealer_package_active?: boolean;
  dealership_name?: string | null;
  dealership_slug?: string | null;
  dealership_trading_hours?: string | null;
  dealership_location?: string | null;
  dealership_phone?: string | null;
  dealership_logo?: string | null;
  active_listing_count?: number | null;
  review_count?: number | null;
  review_average?: number | string | null;
  public_profile_available?: boolean;
  verified_dealership?: boolean;
  showroom_available?: boolean;
};

type DealerMaps = {
  byDealerId: Record<string, DealerMeta>;
  byUserId: Record<string, DealerMeta>;
};

function toPublicRow(row: Record<string, unknown>) {
  return Object.fromEntries(PUBLIC_FIELDS.split(",").map((field) => [field, row[field] ?? null]));
}

function enrichDealerRows(rows: unknown[], maps: DealerMaps) {
  return rows.map((raw) => {
    const row = raw as Record<string, unknown>;
    const dealershipId = String(row.dealership_id || "");
    const userId = String(row.user_id || "");
    const dealer = (dealershipId ? maps.byDealerId[dealershipId] : undefined) || (userId ? maps.byUserId[userId] : undefined);
    if (!dealer?.dealer_package_active) return row;

    const resolvedDealerId = String(dealer.dealership_id || dealershipId || "") || null;
    const slug = dealer.public_profile_available ? dealer.dealership_slug || null : null;
    const name = dealer.public_profile_available ? dealer.dealership_name || null : null;

    return {
      ...row,
      package_type: "dealer",
      dealership_id: resolvedDealerId,
      dealer_package_active: true,
      dealership_name: name,
      dealership_slug: slug,
      dealership_trading_hours: dealer.public_profile_available ? dealer.dealership_trading_hours || null : null,
      dealership_location: dealer.public_profile_available ? dealer.dealership_location || null : null,
      dealership_phone: dealer.public_profile_available ? dealer.dealership_phone || null : null,
      dealership_logo: dealer.public_profile_available ? dealer.dealership_logo || null : null,
      dealership_verified: Boolean(dealer.verified_dealership),
      dealership_public_profile_available: Boolean(dealer.public_profile_available),
      dealership_showroom_available: Boolean(dealer.showroom_available),
      dealership_active_listing_count: Number(dealer.active_listing_count || 0),
      dealership_review_count: Number(dealer.review_count || 0),
      dealership_review_average: dealer.review_average === null || dealer.review_average === undefined ? null : Number(dealer.review_average),
      dealership_profile_url: slug ? `/dealership/${slug}` : null,
      dealership_showroom_url: slug && dealer.showroom_available ? `/dealership/${slug}#showroom` : null,
      dealership_reviews_url: slug ? `/dealership/${slug}#reviews` : null,
    };
  });
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  return { url: url.replace(/\/$/, ""), key };
}

async function supabaseRequest(url: string, key: string, path: string, init?: RequestInit) {
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    next: { revalidate: 10 },
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
}

function normaliseEntitlementRow(raw: unknown): DealerMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const nested = source.loadlink_public_dealer_entitlements;
  if (nested && typeof nested === "object") return nested as DealerMeta;
  return source as DealerMeta;
}

async function loadDealerMaps(url: string, key: string, rows: unknown[]): Promise<DealerMaps> {
  const userIds = [...new Set(rows.map((raw) => String((raw as Record<string, unknown>).user_id || "")).filter(Boolean))];
  const explicitDealerIds = [...new Set(rows.map((raw) => String((raw as Record<string, unknown>).dealership_id || "")).filter(Boolean))];
  const maps: DealerMaps = { byDealerId: {}, byUserId: {} };

  const requests: Promise<void>[] = [];

  if (userIds.length) {
    requests.push((async () => {
      const response = await supabaseRequest(url, key, "rpc/loadlink_public_dealer_entitlements", {
        method: "POST",
        body: JSON.stringify({ p_user_ids: userIds }),
      });
      if (!response.ok) return;
      const payload = await response.json() as unknown;
      if (!Array.isArray(payload)) return;

      payload.forEach((raw) => {
        const dealer = normaliseEntitlementRow(raw);
        if (!dealer) return;
        const ownerId = String(dealer.owner_user_id || "");
        const dealerId = String(dealer.dealership_id || "");
        if (ownerId) maps.byUserId[ownerId] = dealer;
        if (dealerId) maps.byDealerId[dealerId] = dealer;
      });
    })());
  }

  if (explicitDealerIds.length) {
    requests.push((async () => {
      const select = "id,name,slug,trading_hours,physical_location,phone_number,profile_image_url,active_listing_count";
      const response = await supabaseRequest(
        url,
        key,
        `public_dealership_profiles?select=${encodeURIComponent(select)}&id=in.(${explicitDealerIds.join(",")})`,
      );
      if (!response.ok) return;
      const payload = await response.json() as unknown;
      if (!Array.isArray(payload)) return;

      payload.forEach((raw) => {
        if (!raw || typeof raw !== "object") return;
        const source = raw as Record<string, unknown>;
        const dealerId = String(source.id || "");
        if (!dealerId || maps.byDealerId[dealerId]) return;
        maps.byDealerId[dealerId] = {
          dealership_id: dealerId,
          dealer_package_active: true,
          public_profile_available: true,
          verified_dealership: true,
          showroom_available: Number(source.active_listing_count || 0) > 0,
          dealership_name: String(source.name || "") || null,
          dealership_slug: String(source.slug || "") || null,
          dealership_trading_hours: source.trading_hours ? String(source.trading_hours) : null,
          dealership_location: source.physical_location ? String(source.physical_location) : null,
          dealership_phone: source.phone_number ? String(source.phone_number) : null,
          dealership_logo: source.profile_image_url ? String(source.profile_image_url) : null,
          active_listing_count: Number(source.active_listing_count || 0),
        };
      });
    })());
  }

  await Promise.all(requests);
  return maps;
}

async function tryPostService(url: string, key: string) {
  try {
    const response = await fetch(`${url}/functions/v1/loadlink-post-service?limit=120`, { next: { revalidate: 15 }, headers: { apikey: key } });
    if (!response.ok) return null;
    const payload = await response.json() as { rows?: unknown[]; dealers?: Record<string, unknown> };
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    const maps = await loadDealerMaps(url, key, rows);
    const dealers = { ...(payload.dealers || {}), ...maps.byDealerId };
    return { rows: enrichDealerRows(rows, maps), dealers };
  } catch { return null; }
}

export async function GET(request: Request) {
  const limited = serverRateLimit(request, "public-listings", 180, 60_000);
  if (limited) return limited;
  const { url, key } = getSupabaseConfig();
  if (!url.startsWith("https://") || !key) return NextResponse.json({ error: "Listings are temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });

  const service = await tryPostService(url, key);
  if (service) return NextResponse.json({ rows: service.rows, dealers: service.dealers, source: "post-service" }, { headers: { "Cache-Control": "public, max-age=5, s-maxage=15, stale-while-revalidate=60" } });

  let response = await supabaseRequest(url, key, `job_listings?select=${encodeURIComponent(PUBLIC_FIELDS)}&order=created_at.desc.nullslast&limit=500`);
  if (!response.ok) response = await supabaseRequest(url, key, "rpc/get_public_job_listings", { method: "POST", body: "{}" });
  if (!response.ok) return NextResponse.json({ error: "Listings are temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });

  const rows = (await response.json()) as unknown;
  const now = Date.now();
  const visibleRows = Array.isArray(rows)
    ? (rows as Array<Record<string, unknown> & { status?: string | null; moderation_status?: string | null; expires_at?: string | null; stock_status?: string | null }>).filter((row) => {
        const active = !row.status || row.status === "active";
        const approved = row.moderation_status === undefined || row.moderation_status === "approved";
        const expiry = row.expires_at ? new Date(row.expires_at).getTime() : 0;
        const current = !expiry || !Number.isFinite(expiry) || expiry > now;
        const inStock = !row.stock_status || row.stock_status !== "removed";
        return active && approved && current && inStock;
      }).map(toPublicRow)
    : [];

  const maps = await loadDealerMaps(url, key, visibleRows);
  return NextResponse.json(
    { rows: enrichDealerRows(visibleRows, maps), dealers: maps.byDealerId, source: "fallback" },
    { headers: { "Cache-Control": "public, max-age=5, s-maxage=10, stale-while-revalidate=30" } },
  );
}
