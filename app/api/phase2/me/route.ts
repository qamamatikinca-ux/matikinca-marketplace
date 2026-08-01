import { NextResponse } from "next/server";
import { bearer, publicSupabase, safeError } from "@/lib/phase2/supabase";

async function authenticated(request: Request) {
  const token = bearer(request);
  if (!token) return null;
  const client = publicSupabase(token);
  const { data: userData, error } = await client.auth.getUser(token);
  if (error || !userData.user) return null;
  return { client, user: userData.user };
}

export async function GET(request: Request) {
  try {
    const auth = await authenticated(request);
    if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const { data: profile, error: profileError } = await auth.client
      .from("driver_profiles").select("*").eq("user_id", auth.user.id).maybeSingle();
    if (profileError) throw profileError;
    const { data: documents, error: documentsError } = profile
      ? await auth.client.from("driver_documents").select("id,document_type,original_filename,mime_type,size_bytes,uploaded_at")
          .eq("profile_id", profile.id).order("document_type")
      : { data: [], error: null };
    if (documentsError) throw documentsError;
    return NextResponse.json({ profile, documents: documents ?? [] });
  } catch (error) {
    return NextResponse.json(safeError(error), { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await authenticated(request);
    if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const payload = await request.json();
    const { data, error } = await auth.client.rpc("loadlink_upsert_my_driver_profile", { p_payload: payload });
    if (error) throw error;
    if (typeof payload.profile_image_url === "string") {
      const profileImageUrl = payload.profile_image_url.trim().slice(0, 1200);
      if (profileImageUrl && !profileImageUrl.startsWith("https://")) {
        return NextResponse.json({ error: "The profile image URL is invalid." }, { status: 400 });
      }
      const imageUpdate = await auth.client.rpc("loadlink_set_driver_profile_image", { p_url: profileImageUrl });
      if (imageUpdate.error) throw imageUpdate.error;
    }
    return NextResponse.json({ profile: data });
  } catch (error) {
    return NextResponse.json(safeError(error, "The driver profile could not be saved."), { status: 400 });
  }
}
