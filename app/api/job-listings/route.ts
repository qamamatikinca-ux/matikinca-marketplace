import { NextRequest, NextResponse } from "next/server";
import { PUBLIC_LISTING_SELECT, isPubliclyVisible } from "@/lib/marketplace/publicListing";
import { publicSupabase, safeApiError } from "@/lib/server/supabase";
import { requestIdentity, rateLimitHeaders, takeRateLimit } from "@/lib/server/rateLimit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FALLBACK_FIELDS = "id,title,city,vehicle_group,rate,posted_by,poster_photo,description,photos,sponsored,package_type,created_at,expires_at,featured_until,view_count,dealership_id,stock_status,moderation_status,status,listing_kind";

function cleanLimit(value: string | null) {
  const parsed = Number(value || 100);
  return Number.isFinite(parsed) ? Math.min(200, Math.max(1, Math.floor(parsed))) : 100;
}

export async function GET(request: NextRequest) {
  const limiter = takeRateLimit(`public-listings:${requestIdentity(request)}`, 120, 60_000);
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Too many listing requests. Try again shortly." }, { status: 429, headers: rateLimitHeaders(limiter) });
  }

  try {
    const client = publicSupabase();
    const search = (request.nextUrl.searchParams.get("search") || "").trim().toLowerCase().slice(0, 120);
    const kind = (request.nextUrl.searchParams.get("kind") || "").trim().toLowerCase();
    const city = (request.nextUrl.searchParams.get("city") || "").trim().toLowerCase();
    const dealershipId = (request.nextUrl.searchParams.get("dealership") || "").trim();
    const limit = cleanLimit(request.nextUrl.searchParams.get("limit"));

    const primaryResult = await client
      .from("loadlink_public_listings")
      .select(PUBLIC_LISTING_SELECT)
      .order("created_at", { ascending: false })
      .limit(Math.max(limit, 200));

    let listingData =
      primaryResult.data as unknown as Record<string, unknown>[] | null;
    let listingError = primaryResult.error;

    if (listingError) {
      const fallbackResult = await client
        .from("job_listings")
        .select(FALLBACK_FIELDS)
        .order("created_at", { ascending: false })
        .limit(Math.max(limit, 200));

      listingData =
        fallbackResult.data as unknown as Record<string, unknown>[] | null;
      listingError = fallbackResult.error;
    }

    if (listingError) throw listingError;

    const rows = (listingData || [])
      .filter(isPubliclyVisible)
      .filter((row) => !kind || String(row.listing_kind || "job").toLowerCase() === kind)
      .filter((row) => !city || String(row.city || "").toLowerCase().includes(city))
      .filter((row) => !dealershipId || String(row.dealership_id || "") === dealershipId)
      .filter((row) => {
        if (!search) return true;
        const haystack = [row.title, row.city, row.province, row.vehicle_group, row.vehicle_type, row.brand, row.model, row.description, row.posted_by]
          .map((value) => String(value || "").toLowerCase())
          .join(" ");
        return search.split(/\s+/).every((token) => haystack.includes(token));
      })
      .slice(0, limit);

    return NextResponse.json(
      { rows, count: rows.length, generatedAt: new Date().toISOString() },
      { headers: { ...rateLimitHeaders(limiter), "Cache-Control": "public, max-age=20, s-maxage=45, stale-while-revalidate=120" } },
    );
  } catch (error) {
    const safe = safeApiError(error, "Listings could not be loaded.");
    return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status, headers: rateLimitHeaders(limiter) });
  }
}
