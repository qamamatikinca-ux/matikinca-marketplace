import { NextResponse } from "next/server";
import { bearer, publicSupabase, safeError } from "@/lib/phase2/supabase";

export async function POST(request: Request) {
  try {
    const token = bearer(request);
    if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const client = publicSupabase(token);
    const { data, error } = await client.rpc("loadlink_submit_my_driver_profile");
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error && error.message.includes("DRIVER_PROFILE_INCOMPLETE")
      ? "Complete the required profile information and critical documents before submitting."
      : "The profile could not be submitted.";
    return NextResponse.json(safeError(error, message), { status: 400 });
  }
}
