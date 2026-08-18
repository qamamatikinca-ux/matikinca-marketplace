import { NextResponse } from "next/server";
import { serverRateLimit } from "@/lib/serverRateLimit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

const KINDS = new Set(["job", "contract", "asset"]);
const GROUPS = new Set(["Trucks / Trailers", "Catering / Event", "Farming / Mining"]);
const SORTS = new Set(["newest", "needed_soon", "oldest"]);

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  return { url: url.replace(/\/$/, ""), key };
}

function safeSearch(value: string | null, max = 80) {
  return String(value || "")
    .replace(/[^\p{L}\p{N}\s\-./]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function sortOrder(sort: string) {
  if (sort === "needed_soon") return "work_starts_at.asc.nullslast,created_at.desc.nullslast";
  if (sort === "oldest") return "created_at.asc.nullslast";
  return "created_at.desc.nullslast";
}

async function supabaseRequest(url: string, key: string, path: string, attempt = 0): Promise<Response> {
  try {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      cache: "no-store",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "count=exact",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok && response.status >= 500 && attempt === 0) return supabaseRequest(url, key, path, 1);
    return response;
  } catch (error) {
    if (attempt === 0) return supabaseRequest(url, key, path, 1);
    throw error;
  }
}

function parseTotal(response: Response, fallback: number) {
  const contentRange = response.headers.get("content-range") || "";
  const raw = contentRange.split("/")[1];
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export async function GET(request: Request) {
  const limited = serverRateLimit(request, "public-listings", 180, 60_000);
  if (limited) return limited;

  const { url, key } = getSupabaseConfig();
  if (!url.startsWith("https://") || !key) {
    return NextResponse.json({ error: "Listings are temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const incoming = new URL(request.url).searchParams;
  const kind = KINDS.has(incoming.get("kind") || "") ? String(incoming.get("kind")) : "job";
  const sort = SORTS.has(incoming.get("sort") || "") ? String(incoming.get("sort")) : "newest";
  const page = Math.max(1, Math.min(10000, Number(incoming.get("page") || 1) || 1));
  const pageSize = Math.max(1, Math.min(24, Number(incoming.get("limit") || 7) || 7));
  const offset = (page - 1) * pageSize;
  const query = safeSearch(incoming.get("q"));
  const city = safeSearch(incoming.get("city"), 70);
  const group = GROUPS.has(incoming.get("group") || "") ? String(incoming.get("group")) : "";

  const params = new URLSearchParams();
  params.set("select", PUBLIC_FIELDS);
  params.set("listing_kind", `eq.${kind}`);
  params.set("order", sortOrder(sort));
  params.set("limit", String(pageSize));
  params.set("offset", String(offset));

  if (group) params.set("vehicle_group", `eq.${group}`);
  if (city) params.set("or", `(city.ilike.*${city}*,province.ilike.*${city}*,route_start.ilike.*${city}*,route_end.ilike.*${city}*)`);
  if (query) {
    const wildcard = query.split(" ").filter(Boolean).join("*");
    const expression = [
      "title",
      "city",
      "province",
      "vehicle_group",
      "posted_by",
      "description",
      "vehicle_type",
      "brand",
      "model",
      "route_start",
      "route_end",
      "load_type",
    ].map((field) => `${field}.ilike.*${wildcard}*`).join(",");

    if (city) {
      // PostgREST supports one `or` key per level. When both are supplied, fold the
      // location into the broad search while preserving the explicit equipment/kind filters.
      params.set("or", `(${expression},city.ilike.*${city}*,province.ilike.*${city}*,route_start.ilike.*${city}*,route_end.ilike.*${city}*)`);
    } else {
      params.set("or", `(${expression})`);
    }
  }

  try {
    const response = await supabaseRequest(url, key, `loadlink_public_listings?${params.toString()}`);
    if (!response.ok) {
      return NextResponse.json({ error: "Listings are temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }

    const rows = await response.json();
    const safeRows = Array.isArray(rows) ? rows : [];
    return NextResponse.json(
      { rows: safeRows, total: parseTotal(response, safeRows.length), page, pageSize },
      { headers: { "Cache-Control": "public, max-age=5, s-maxage=15, stale-while-revalidate=45" } },
    );
  } catch {
    return NextResponse.json({ error: "Listings are temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
