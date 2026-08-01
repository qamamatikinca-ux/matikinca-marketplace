import { NextResponse } from "next/server";
import { publicSupabase, safeApiError } from "@/lib/server/supabase";

const PUBLIC_DRIVER_FIELDS = "id,full_name,profile_image_url,headline,city,province,years_experience,licence_code,vehicle_types,route_experience,languages,availability,bio,verification_level,profile_views,created_at,updated_at";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!/^[0-9a-f-]{20,}$/i.test(id)) return NextResponse.json({ error: "Invalid driver profile link." }, { status: 400 });
    const result = await publicSupabase().from("loadlink_public_driver_profiles").select(PUBLIC_DRIVER_FIELDS).eq("id", id).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return NextResponse.json({ error: "This driver profile is not available." }, { status: 404 });
    return NextResponse.json({ driver: result.data }, { headers: { "Cache-Control": "public, max-age=20, s-maxage=60" } });
  } catch (error) {
    const safe = safeApiError(error, "This driver profile could not be loaded.");
    return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status });
  }
}
