import { NextResponse } from "next/server";
import { bearer, publicSupabase, safeError } from "@/lib/phase2/supabase";

const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
export async function GET(request: Request, context: { params: Promise<{ profileId: string }> }) {
  try {
    const token = bearer(request);
    if (!token) return NextResponse.json({ error: "Sign in to contact a driver." }, { status: 401, headers });
    const client = publicSupabase(token);
    const { data: auth, error: authError } = await client.auth.getUser(token);
    if (authError || !auth.user || auth.user.is_anonymous) return NextResponse.json({ error: "Sign in to contact a driver." }, { status: 401, headers });
    const { profileId } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId)) return NextResponse.json({ error: "Driver profile not found." }, { status: 404, headers });
    const { data, error } = await client.rpc("loadlink_driver_contact", { p_profile_id: profileId });
    if (error) {
      if (error.code === "28000") return NextResponse.json({ error: "Sign in to contact a driver." }, { status: 401, headers });
      if (error.code === "42501") return NextResponse.json({ error: "Account access is restricted." }, { status: 403, headers });
      if (error.code === "P0002") return NextResponse.json({ error: "This driver profile is no longer available." }, { status: 404, headers });
      throw error;
    }
    return NextResponse.json(data, { headers });
  } catch (error) {
    return NextResponse.json(safeError(error, "Driver contact is temporarily unavailable. Please retry."), { status: 503, headers });
  }
}
