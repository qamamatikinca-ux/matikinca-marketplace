import { NextResponse } from "next/server";
import { bearer, publicSupabase } from "@/lib/phase2/supabase";
import { serverRateLimit } from "@/lib/serverRateLimit";

function friendlySubmitError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("driver_profile_incomplete")) {
    const detail = message.split("DRIVER_PROFILE_INCOMPLETE:")[1]?.trim();
    return detail
      ? `Your driver profile could not be submitted yet: ${detail}.`
      : "Your driver profile could not be submitted yet. Check the required driver details and documents.";
  }

  if (
    normalized.includes("loadlink_save_and_submit_my_driver_profile") &&
    (normalized.includes("does not exist") || normalized.includes("schema cache"))
  ) {
    return "Driver profile submission is temporarily unavailable. Please try again shortly.";
  }

  if (normalized.includes("jwt") || normalized.includes("token") || normalized.includes("auth")) {
    return "Your sign-in session expired. Sign in again and retry.";
  }

  return "LoadLink could not submit the driver profile. Please refresh, check your profile status, and retry.";
}

export async function POST(request: Request) {
  const limited = serverRateLimit(request, "driver-submit", 10, 10 * 60_000);
  if (limited) return limited;
  const token = bearer(request);
  if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  try {
    const client = publicSupabase(token);
    const { data: userData, error: userError } = await client.auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Your sign-in session expired. Sign in again and retry." }, { status: 401 });
    }

    let body: unknown = {};
    try { body = await request.json(); } catch { body = {}; }

    const envelope = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const payload = envelope.payload && typeof envelope.payload === "object" && !Array.isArray(envelope.payload)
      ? envelope.payload
      : envelope;

    const { data, error } = await client.rpc("loadlink_save_and_submit_my_driver_profile", {
      p_payload: payload,
    });

    if (error) {
      console.error("[LoadLink driver submit]", { userId: userData.user.id, code: error.code, message: error.message, details: error.details });
      return NextResponse.json({ error: friendlySubmitError(error.message) }, { status: 400 });
    }

    if (!data || data.ok !== true || data.status !== "pending") {
      console.error("[LoadLink driver submit] Unexpected response", { userId: userData.user.id, data });
      return NextResponse.json({ error: "LoadLink did not confirm the submission. Refresh and check your profile status before retrying." }, { status: 409 });
    }

    return NextResponse.json({ ok: true, status: "pending", profileId: data.profileId });
  } catch (error) {
    console.error("[LoadLink driver submit] Route failure", error);
    return NextResponse.json({ error: "LoadLink could not submit the driver profile. Please refresh, check your profile status, and retry." }, { status: 500 });
  }
}
