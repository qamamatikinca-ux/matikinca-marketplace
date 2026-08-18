import { NextResponse } from "next/server";
import { serverRateLimit } from "@/lib/serverRateLimit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_FIELDS = [
  "id","title","city","vehicle_group","rate","posted_by","contact_number","whatsapp_number","poster_photo","description","photos","sponsored","package_type","created_at","view_count","last_viewed_at","user_id","listing_kind","status","moderation_status","expires_at","stock_status","dealership_id",
].join(",");

type DealerMeta = { name?: string; slug?: string; trading_hours?: string | null; physical_location?: string | null; phone_number?: string | null; profile_image_url?: string | null };

function toPublicRow(row: Record<string, unknown>) {
  return Object.fromEntries(PUBLIC_FIELDS.split(",").map((field) => [field, row[field] ?? null]));
}

function enrichDealerRows(rows: unknown[], dealers: Record<string, unknown>) {
  return rows.map((raw) => {
    const row = raw as Record<string, unknown>;
    const dealershipId = String(row.dealership_id || "");
    const dealer = dealershipId ? dealers[dealershipId] as DealerMeta | undefined : undefined;
    if (!dealer || String(row.package_type || "").toLowerCase() !== "dealer") return row;
    const details = [
      dealer.name ? `Dealership: ${dealer.name}` : "",
      dealer.trading_hours ? `Opening times: ${dealer.trading_hours}` : "",
      dealer.physical_location ? `Dealership location: ${dealer.physical_location}` : "",
    ].filter(Boolean);
    const description = String(row.description || "");
    const dealerBlock = details.join("\n");
    return {
      ...row,
      dealership_name: dealer.name || null,
      dealership_slug: dealer.slug || null,
      dealership_trading_hours: dealer.trading_hours || null,
      dealership_location: dealer.physical_location || null,
      dealership_phone: dealer.phone_number || null,
      dealership_logo: dealer.profile_image_url || null,
      description: dealerBlock && !/\bOpening times:/i.test(description) ? `${description}${description ? "\n\n" : ""}${dealerBlock}` : description,
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

async function tryPostService(url: string, key: string) {
  try {
    const response = await fetch(`${url}/functions/v1/loadlink-post-service?limit=120`, { next: { revalidate: 15 }, headers: { apikey: key } });
    if (!response.ok) return null;
    const payload = await response.json() as { rows?: unknown[]; dealers?: Record<string, unknown> };
    const dealers = payload.dealers || {};
    return { rows: enrichDealerRows(Array.isArray(payload.rows) ? payload.rows : [], dealers), dealers };
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
  return NextResponse.json({ rows: visibleRows, source: "fallback" }, { headers: { "Cache-Control": "public, max-age=5, s-maxage=10, stale-while-revalidate=30" } });
}
