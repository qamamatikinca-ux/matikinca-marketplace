import { NextResponse } from "next/server";
import { serverRateLimit } from "@/lib/serverRateLimit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Public marketplace search deliberately excludes direct phone numbers, WhatsApp,
// user IDs, owner keys, fraud/moderation internals and payment identifiers.
const PUBLIC_FIELDS = [
  "id",
  "title",
  "city",
  "province",
  "vehicle_group",
  "rate",
  "posted_by",
  "poster_photo",
  "description",
  "photos",
  "sponsored",
  "package_type",
  "created_at",
  "updated_at",
  "view_count",
  "listing_kind",
  "dealership_id",
  "verification_level",
  "vehicle_type",
  "vehicle_year",
  "brand",
  "model",
  "body_type",
  "transmission",
  "fuel_type",
  "axle_configuration",
  "odometer_km",
  "condition",
  "route_start",
  "route_end",
  "route_distance_km",
  "load_type",
  "required_equipment",
  "rate_amount",
  "rate_unit",
  "payment_terms",
  "work_starts_at",
  "work_ends_at",
].join(",");

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  return { url: url.replace(/\/$/, ""), key };
}

async function supabaseRequest(url: string, key: string, path: string, attempt = 0): Promise<Response> {
  try {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      cache: "no-store",
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok && response.status >= 500 && attempt === 0) return supabaseRequest(url, key, path, 1);
    return response;
  } catch (error) {
    if (attempt === 0) return supabaseRequest(url, key, path, 1);
    throw error;
  }
}

export async function GET(request: Request) {
  const limited = serverRateLimit(request, "public-listings", 180, 60_000);
  if (limited) return limited;

  const { url, key } = getSupabaseConfig();
  if (!url.startsWith("https://") || !key) {
    return NextResponse.json({ error: "Listings are temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const response = await supabaseRequest(
      url,
      key,
      `loadlink_public_listings?select=${encodeURIComponent(PUBLIC_FIELDS)}&order=created_at.desc.nullslast&limit=500`,
    );
    if (!response.ok) {
      return NextResponse.json({ error: "Listings are temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }

    const rows = await response.json();
    return NextResponse.json(
      { rows: Array.isArray(rows) ? rows : [] },
      { headers: { "Cache-Control": "public, max-age=5, s-maxage=10, stale-while-revalidate=30" } },
    );
  } catch {
    return NextResponse.json({ error: "Listings are temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
