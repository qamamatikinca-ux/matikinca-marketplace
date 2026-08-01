import { NextResponse } from "next/server";
import { PUBLIC_LISTING_SELECT, isPubliclyVisible } from "@/lib/marketplace/publicListing";
import { publicSupabase, safeApiError } from "@/lib/server/supabase";

const PUBLIC_DEALER_FIELDS = "id,slug,name,profile_image_url,cover_image_url,short_bio,business_description,physical_location,province,contact_email,phone_number,whatsapp_number,website_url,trading_hours,year_established,verification_status,average_response_minutes,trust_score,is_featured,active_stock_count,created_at";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const cleanSlug = decodeURIComponent(slug).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 120);
    if (!cleanSlug) return NextResponse.json({ error: "Invalid dealership link." }, { status: 400 });
    const client = publicSupabase();

    let dealerResult = await client.from("loadlink_public_dealerships").select(PUBLIC_DEALER_FIELDS).eq("slug", cleanSlug).maybeSingle();
    if (dealerResult.error) {
      dealerResult = await client.from("dealership_profiles").select(PUBLIC_DEALER_FIELDS.replace(",active_stock_count", "")).eq("slug", cleanSlug).eq("verification_status", "approved").eq("is_public", true).maybeSingle();
    }
    if (dealerResult.error) throw dealerResult.error;
    const dealer = dealerResult.data as Record<string, unknown> | null;
    if (!dealer) return NextResponse.json({ error: "This dealership is not available." }, { status: 404 });

    const [stockResult, updatesResult, socialResult] = await Promise.all([
      client.from("loadlink_public_listings").select(PUBLIC_LISTING_SELECT).eq("dealership_id", String(dealer.id)).eq("listing_kind", "vehicle").order("created_at", { ascending: false }).limit(200),
      client.from("dealership_updates").select("id,update_type,title,body,image_url,created_at").eq("dealership_id", String(dealer.id)).eq("status", "approved").order("created_at", { ascending: false }).limit(20),
      client.rpc("loadlink_dealership_social_status", { p_dealership_id: String(dealer.id) }),
    ]);
    if (stockResult.error) throw stockResult.error;

    const stock = ((stockResult.data || []) as Record<string, unknown>[]).filter(isPubliclyVisible);
    const updates = updatesResult.error ? [] : (updatesResult.data || []);
    const social = socialResult.error ? { follower_count: 0, is_following: false } : (socialResult.data || {});
    return NextResponse.json({ dealer, stock, updates, social }, { headers: { "Cache-Control": "public, max-age=20, s-maxage=60" } });
  } catch (error) {
    const safe = safeApiError(error, "This dealership could not be loaded.");
    return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status });
  }
}
