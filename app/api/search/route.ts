import { NextRequest, NextResponse } from "next/server";
import { PUBLIC_LISTING_SELECT, isPubliclyVisible } from "@/lib/marketplace/publicListing";
import { publicSupabase, safeApiError } from "@/lib/server/supabase";
import { requestIdentity, rateLimitHeaders, takeRateLimit } from "@/lib/server/rateLimit";

function matches(value: unknown, tokens: string[]) {
  const text = JSON.stringify(value || "").toLowerCase();
  return tokens.every((token) => text.includes(token));
}

export async function GET(request: NextRequest) {
  const limiter = takeRateLimit(`search:${requestIdentity(request)}`, 80, 60_000);
  if (!limiter.allowed) return NextResponse.json({ error: "Too many searches. Try again shortly." }, { status: 429, headers: rateLimitHeaders(limiter) });

  try {
    const query = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 120);
    if (query.length < 2) return NextResponse.json({ groups: {}, query }, { headers: rateLimitHeaders(limiter) });
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const client = publicSupabase();

    const [listingsResult, dealersResult, driversResult] = await Promise.all([
      client.from("loadlink_public_listings").select(PUBLIC_LISTING_SELECT).order("created_at", { ascending: false }).limit(300),
      client.from("loadlink_public_dealerships").select("id,slug,name,short_bio,physical_location,profile_image_url,verification_status").limit(100),
      client.from("loadlink_public_driver_profiles").select("id,full_name,headline,city,province,licence_code,vehicle_types,years_experience,availability,verification_level").limit(150),
    ]);

    const listings = ((listingsResult.data || []) as unknown as Record<string, unknown>[]).filter(isPubliclyVisible).filter((row) => matches(row, tokens));
    const groups = {
      jobs: listings.filter((row) => String(row.listing_kind || "job") === "job").slice(0, 8),
      contracts: listings.filter((row) => String(row.listing_kind || "") === "contract").slice(0, 8),
      vehicles: listings.filter((row) => ["vehicle", "asset"].includes(String(row.listing_kind || ""))).slice(0, 8),
      dealerships: ((dealersResult.data || []) as unknown[]).filter((row) => matches(row, tokens)).slice(0, 8),
      drivers: ((driversResult.data || []) as unknown[]).filter((row) => matches(row, tokens)).slice(0, 8),
    };

    return NextResponse.json({ query, groups }, { headers: { ...rateLimitHeaders(limiter), "Cache-Control": "public, max-age=20" } });
  } catch (error) {
    const safe = safeApiError(error, "Search is temporarily unavailable.");
    return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status, headers: rateLimitHeaders(limiter) });
  }
}
