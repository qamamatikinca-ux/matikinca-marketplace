import { createClient } from "npm:@supabase/supabase-js@2.117.3";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
Deno.serve(async (request: Request) => {
  if (request.method !== "GET") return new Response(null, { status: 405, headers });
  const profileId = new URL(request.url).searchParams.get("profile") || "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId)) return new Response(null, { status: 404, headers });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile, error } = await admin.from("driver_profiles").select("user_id,status,profile_expires_at").eq("id", profileId).maybeSingle();
    if (error) throw error;
    if (!profile || profile.status !== "approved" || (profile.profile_expires_at && Date.parse(profile.profile_expires_at) <= Date.now())) return new Response(null, { status: 404, headers });
    const { data: restriction, error: restrictionError } = await admin.from("user_moderation_profiles").select("status").eq("user_id", profile.user_id).maybeSingle();
    if (restrictionError) throw restrictionError;
    if (["suspended", "blocked"].includes(restriction?.status)) return new Response(null, { status: 404, headers });
    const { data: photo, error: photoError } = await admin.from("driver_documents").select("storage_path,mime_type").eq("profile_id", profileId).eq("user_id", profile.user_id).eq("document_type", "portrait").eq("validation_status", "validated").maybeSingle();
    if (photoError) throw photoError;
    if (!photo || !["image/jpeg", "image/png"].includes(photo.mime_type)) return new Response(null, { status: 404, headers });
    const file = await admin.storage.from("loadlink-driver-documents").download(photo.storage_path);
    if (file.error || !file.data || file.data.size > 8388608) return new Response(null, { status: 503, headers });
    return new Response(file.data, { headers: { ...headers, "Content-Type": photo.mime_type, "Content-Disposition": "inline" } });
  } catch { return new Response(null, { status: 503, headers }); }
});
