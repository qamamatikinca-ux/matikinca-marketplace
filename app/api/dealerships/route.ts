import { NextRequest, NextResponse } from "next/server";
import { publicSupabase, safeApiError } from "@/lib/server/supabase";
import { requestIdentity, rateLimitHeaders, takeRateLimit } from "@/lib/server/rateLimit";

export async function GET(request: NextRequest) {
  const limiter = takeRateLimit(`dealerships:${requestIdentity(request)}`, 100, 60_000);
  if (!limiter.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: rateLimitHeaders(limiter) });
  try {
    const client = publicSupabase();
    const search = (request.nextUrl.searchParams.get("search") || "").trim().toLowerCase();
    const province = (request.nextUrl.searchParams.get("province") || "").trim().toLowerCase();
    let result: any = await client.from("loadlink_public_dealerships").select("id,slug,name,profile_image_url,cover_image_url,short_bio,physical_location,province,verification_status,average_response_minutes,trust_score,active_stock_count,year_established").order("name").limit(200);
    if (result.error) {
      result = await client.from("dealership_profiles").select("id,slug,name,profile_image_url,cover_image_url,short_bio,physical_location,verification_status,average_response_minutes,trust_score,year_established").eq("verification_status", "approved").order("name").limit(200);
    }
    if (result.error) throw result.error;
    const rows = (result.data || []).filter((row: Record<string, unknown>) => {
      const text = `${row.name || ""} ${row.short_bio || ""} ${row.physical_location || ""} ${row.province || ""}`.toLowerCase();
      return (!search || search.split(/\s+/).every((token) => text.includes(token))) && (!province || text.includes(province));
    });
    return NextResponse.json({ rows, count: rows.length }, { headers: { ...rateLimitHeaders(limiter), "Cache-Control": "public, max-age=30, s-maxage=60" } });
  } catch (error) {
    const safe = safeApiError(error, "Dealerships could not be loaded.");
    return NextResponse.json({ error: safe.message }, { status: safe.status, headers: rateLimitHeaders(limiter) });
  }
}
