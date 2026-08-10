import type { NextRequest } from "next/server";
import { apiError, dealerServerClient } from "@/lib/dealer/server";

export async function GET(request: NextRequest) {
  try {
    const client = dealerServerClient(request);
    const { data: context, error } = await client.rpc("loadlink_get_my_dealer_context");
    if (error) throw error;
    if (!context?.dealership_id) return Response.json({ context: null, profile: null });
    const profile = await client.from("dealership_profiles").select("id,owner_user_id,name,slug,profile_image_url,cover_image_url,short_bio,business_description,physical_location,contact_email,phone_number,whatsapp_number,website_url,trading_hours,year_established,is_public,verification_status,created_at").eq("id", context.dealership_id).maybeSingle();
    if (profile.error) throw profile.error;
    return Response.json({ context, profile: profile.data });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const client = dealerServerClient(request);
    const body = await request.json();
    if (body.action !== "create_profile") throw new Error("Unsupported Dealer action.");
    const { data, error } = await client.rpc("loadlink_create_dealer_workspace", { p_name: String(body.name || ""), p_location: String(body.location || "") });
    if (error) throw error;
    return Response.json(data || { ok: true });
  } catch (error) { return apiError(error); }
}
