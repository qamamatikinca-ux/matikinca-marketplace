import { NextResponse } from "next/server";
import { bearer, publicSupabase, safeError } from "@/lib/phase2/supabase";

export async function GET(request: Request, context: { params: Promise<{ profileId: string }> }) {
  try {
    const token = bearer(request);
    if (!token) return NextResponse.json({ error: "Sign in to contact a driver." }, { status: 401 });
    const { profileId } = await context.params;
    const { data, error } = await publicSupabase(token).rpc("loadlink_driver_contact", { p_profile_id: profileId });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(safeError(error, "This driver cannot be contacted right now."), { status: 403 });
  }
}
