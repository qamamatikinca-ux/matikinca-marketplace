import { NextResponse } from "next/server";
import { PUBLIC_LISTING_SELECT, isPubliclyVisible } from "@/lib/marketplace/publicListing";
import { publicSupabase, safeApiError } from "@/lib/server/supabase";

const FALLBACK_FIELDS = "id,title,city,vehicle_group,rate,posted_by,poster_photo,description,photos,sponsored,package_type,created_at,expires_at,featured_until,view_count,dealership_id,stock_status,moderation_status,status,listing_kind";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!/^[0-9a-f-]{20,}$/i.test(id)) return NextResponse.json({ error: "Invalid listing link." }, { status: 400 });
    const client = publicSupabase();

    let listingResult = await client.from("loadlink_public_listings").select(PUBLIC_LISTING_SELECT).eq("id", id).maybeSingle();
    if (listingResult.error) listingResult = await client.from("job_listings").select(FALLBACK_FIELDS).eq("id", id).maybeSingle();
    if (listingResult.error) throw listingResult.error;
    const listing = listingResult.data as Record<string, unknown> | null;
    if (!listing || !isPubliclyVisible(listing)) return NextResponse.json({ error: "This listing is not available." }, { status: 404 });

    const [details, dealer] = await Promise.all([
      client.from("truck_listing_details").select("vehicle_year,brand,model,body_type,transmission,fuel_type,axle_configuration,odometer_km,gvm_kg,payload_kg,condition,service_history,previous_owners").eq("listing_id", id).maybeSingle(),
      listing.dealership_id
        ? client.from("loadlink_public_dealerships").select("id,slug,name,profile_image_url,physical_location,verification_status,average_response_minutes,trust_score").eq("id", String(listing.dealership_id)).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const similar = await client
      .from("loadlink_public_listings")
      .select("id,title,city,rate,photos,vehicle_type,brand,model,stock_status,created_at")
      .neq("id", id)
      .eq("listing_kind", String(listing.listing_kind || "vehicle"))
      .limit(6);

    return NextResponse.json({
      listing: { ...listing, ...(details.data || {}) },
      dealership: dealer.data || null,
      similar: ((similar.data || []) as Record<string, unknown>[]).filter(isPubliclyVisible),
    }, { headers: { "Cache-Control": "public, max-age=20, s-maxage=60" } });
  } catch (error) {
    const safe = safeApiError(error, "This listing could not be loaded.");
    return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status });
  }
}
