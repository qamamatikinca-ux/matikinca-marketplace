import { LOADLINK_SUPABASE_URL, LOADLINK_SUPABASE_PUBLISHABLE_KEY } from "@/lib/supabasePublicConfig";
import { normalizePublicDealerships } from "@/lib/publicDealerships";
import { serverRateLimit } from "@/lib/serverRateLimit";

export async function GET(request: Request) {
  const limited = serverRateLimit(request, "dealership-directory", 60, 60_000);
  if (limited) return limited;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || LOADLINK_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || LOADLINK_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return Response.json({ rows: [], error: "Dealerships are temporarily unavailable." }, { status: 503 });
  try {
    const fields = "id,slug,name,profile_image_url,short_bio,physical_location,follower_count,active_listing_count";
    const response = await fetch(`${url}/rest/v1/public_dealership_profiles?select=${fields}&order=follower_count.desc&limit=100`, {
      headers: { apikey: key }, cache: "no-store", signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error("Directory request failed");
    const rows = normalizePublicDealerships(await response.json());
    return Response.json({ rows }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ rows: [], error: "Dealerships could not load. Please try again." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
