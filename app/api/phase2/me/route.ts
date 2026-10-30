import { NextResponse } from "next/server";
import { bearer, publicSupabase, safeError } from "@/lib/phase2/supabase";
import { serverRateLimit } from "@/lib/serverRateLimit";

async function authenticated(request: Request) {
  const token = bearer(request);
  if (!token) return null;
  const client = publicSupabase(token);
  const { data: userData, error } = await client.auth.getUser(token);
  if (error || !userData.user || userData.user.is_anonymous) return null;
  return { client, user: userData.user };
}

export async function GET(request: Request) {
  const limited = serverRateLimit(request, "driver-profile-read", 90, 60_000);
  if (limited) return limited;
  try {
    const auth = await authenticated(request);
    if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const { data: profile, error: profileError } = await auth.client
      .from("driver_profiles").select("*").eq("user_id", auth.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (new URL(request.url).searchParams.get("portrait") === "1") {
      if (!profile) return new Response(null, { status: 404 });
      const result = await auth.client.from("driver_documents").select("storage_path,mime_type").eq("profile_id", profile.id).eq("user_id", auth.user.id).eq("document_type", "portrait").maybeSingle();
      const doc = result.data;
      if (result.error || !doc || !doc.storage_path.startsWith(`${auth.user.id}/portrait/`) || !["image/jpeg", "image/png"].includes(doc.mime_type)) return new Response(null, { status: 404 });
      const image = await auth.client.storage.from("loadlink-driver-documents").download(doc.storage_path);
      if (image.error || !image.data) return new Response(null, { status: 404 });
      return new Response(image.data, { headers: { "Content-Type": doc.mime_type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
    }
    const { data: documents, error: documentsError } = profile
      ? await auth.client.from("driver_documents").select("id,document_type,original_filename,mime_type,size_bytes,uploaded_at")
          .eq("profile_id", profile.id).order("document_type")
      : { data: [], error: null };
    if (documentsError) throw documentsError;
    return NextResponse.json({ profile, documents: documents ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json(safeError(error), { status: 500 });
  }
}

export async function PUT(request: Request) {
  const limited = serverRateLimit(request, "driver-profile-write", 20, 60_000);
  if (limited) return limited;
  try {
    const auth = await authenticated(request);
    if (!auth) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const payload = await request.json();
    const { data, error } = await auth.client.rpc("loadlink_upsert_my_driver_profile", { p_payload: payload });
    if (error) throw error;
    return NextResponse.json({ profile: data });
  } catch (error) {
    return NextResponse.json(safeError(error, "The driver profile could not be saved."), { status: 400 });
  }
}
