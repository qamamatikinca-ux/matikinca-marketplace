import { NextResponse } from "next/server";
import { serverRateLimit } from "@/lib/serverRateLimit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_FIELDS = [
  "id","title","city","vehicle_group","rate","posted_by","contact_number","whatsapp_number","poster_photo","description","photos","sponsored","package_type","created_at","view_count","last_viewed_at","user_id","listing_kind","status","moderation_status","expires_at","stock_status","dealership_id",
].join(",");

type DealerMeta = {
  id?: string;
  name?: string;
  slug?: string;
  trading_hours?: string | null;
  physical_location?: string | null;
  phone_number?: string | null;
  profile_image_url?: string | null;
  active_listing_count?: number | null;
};

function toPublicRow(row: Record<string, unknown>) {
  return Object.fromEntries(PUBLIC_FIELDS.split(",").map((field) => [field, row[field] ?? null]));
}

function enrichDealerRows(rows: unknown[], dealers: Record<string, unknown>) {
  return rows.map((raw) => {
    const row = raw as Record<string, unknown>;
    const dealershipId = String(row.dealership_id || "");
    const dealer = dealershipId ? dealers[dealershipId] as DealerMeta | undefined : undefined;
    if (!dealer) return row;

    return {
      ...row,
      dealership_name: dealer.name || null,
      dealership_slug: dealer.slug || null,
      dealership_trading_hours: dealer.trading_hours || null,
      dealership_location: dealer.physical_location || null,
      dealership_phone: dealer.phone_number || null,
      dealership_logo: dealer.profile_image_url || null,
      dealership_active_listing_count: Number(dealer.active_listing_count || 0),
      dealership_showroom_url: dealer.slug ? `/dealership/${dealer.slug}#showroom` : null,
      dealership_reviews_url: dealer.slug ? `/dealership/${dealer.slug}#reviews` : null,
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

async function loadDealerMap(url: string, key: string, rows: unknown[]) {
  const ids = [...new Set(rows.map((raw) => String((raw as Record<string, unknown>).dealership_id || "")).filter(Boolean))];
  if (!ids.length) return {} as Record<string, unknown>;

  const select = "id,name,slug,trading_hours,physical_location,phone_number,profile_image_url,active_listing_count";
  const response = await supabaseRequest(
    url,
    key,
    `public_dealership_profiles?select=${encodeURIComponent(select)}&id=in.(${ids.join(",")})`,
  );
  if (!response.ok) return {} as Record<string, unknown>;

  const dealerRows = await response.json() as unknown;
  return Object.fromEntries(
    (Array.isArray(dealerRows) ? dealerRows : [])
      .filter((dealer) => dealer && typeof dealer === "object" && "id" in dealer)
      .map((dealer) => [String((dealer as DealerMeta).id), dealer]),
  );
}

async function tryPostService(url: string, key: string) {
  try {
    const response = await fetch(`${url}/functions/v1/loadlink-post-service?limit=120`, { next: { revalidate: 15 }, headers: { apikey: key } });
    if (!response.ok) return null;
    const payload = await response.json() as { rows?: unknown[]; dealers?: Record<string, unknown> };
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    const dealers = payload.dealers && Object.keys(payload.dealers).length ? payload.dealers : await loadDealerMap(url, key, rows);
    return { rows: enrichDealerRows(rows, dealers), dealers };
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

  const dealers = await loadDealerMap(url, key, visibleRows);
  return NextResponse.json(
    { rows: enrichDealerRows(visibleRows, dealers), dealers, source: "fallback" },
    { headers: { "Cache-Control": "public, max-age=5, s-maxage=10, stale-while-revalidate=30" } },
  );
}
