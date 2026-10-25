import { createClient } from "npm:@supabase/supabase-js@2.117.3";
const headers = { "Cache-Control": "private, no-store", "Content-Type": "application/json" };
const reply = (error: string, status: number) => new Response(JSON.stringify({ error }), { status, headers });
Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return reply("Method not allowed.", 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user || user.is_anonymous) return reply("Sign in required.", 401);
    const budget = await admin.rpc("loadlink_reserve_driver_evidence_attempt", { p_user_id: user.id });
    if (budget.error) return reply("Document processing is temporarily unavailable.", 503);
    if (!budget.data) return reply("Please wait before uploading more documents.", 429);
    const bodyText = await request.text();
    if (bodyText.length > 3000) return reply("Request too large.", 413);
    const body = JSON.parse(bodyText);
    const type = String(body.documentType || "");
    const path = String(body.path || "");
    const prefix = `${user.id}/${type}/`;
    if (!["portrait", "identity", "drivers_licence", "prdp", "cv", "driving_certificate", "work_authorisation"].includes(type) || !path.startsWith(prefix) || !/^[0-9a-f-]{36}-[a-zA-Z0-9._-]+$/.test(path.slice(prefix.length))) return reply("Invalid document upload.", 400);
    const { data: profile, error: profileError } = await admin.from("driver_profiles").select("id").eq("user_id", user.id).maybeSingle();
    if (profileError) return reply("Document processing is temporarily unavailable.", 503);
    if (!profile) return reply("Save your driver profile first.", 400);
    const { data: restriction, error: restrictionError } = await admin.from("user_moderation_profiles").select("status").eq("user_id", user.id).maybeSingle();
    if (restrictionError) return reply("Document processing is temporarily unavailable.", 503);
    if (["blocked", "suspended"].includes(restriction?.status)) return reply("Account access is restricted.", 403);
    const storage = admin.storage.from("loadlink-driver-documents");
    const { data: file, error: downloadError } = await storage.download(path);
    if (downloadError || !file) return reply("Upload did not complete. Choose the file again.", 400);
    if (file.size < 1 || file.size > 8388608) return reply("Choose a file up to 8 MB.", 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const ascii = new TextDecoder("latin1").decode(bytes);
    const pdf = ascii.startsWith("%PDF-");
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const png = [137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value);
    const mime = pdf ? "application/pdf" : jpeg ? "image/jpeg" : png ? "image/png" : "";
    if (!mime || (type === "portrait" && pdf)) return reply("Choose a valid JPG or PNG portrait, or a PDF, JPG or PNG document.", 400);
    if (pdf && (!ascii.includes("%%EOF") || /\/Encrypt\b|\/JavaScript\b|\/JS\b|\/OpenAction\b|\/Launch\b|\/EmbeddedFile\b/i.test(ascii))) return reply("The PDF is damaged, encrypted or contains active content. Export a standard unlocked PDF.", 400);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map(value => value.toString(16).padStart(2, "0")).join("");
    const result = await admin.rpc("loadlink_register_driver_document_for_user", {
      p_user_id: user.id, p_document_type: type, p_storage_path: path,
      p_original_filename: String(body.filename || "document").slice(0,180),
      p_mime_type: mime, p_size_bytes: bytes.length, p_sha256: hash,
    });
    if (result.error) { console.error("Driver evidence registration failed", result.error.code); return reply("Document could not be registered. Please retry.", 503); }
    // Keep older private evidence for staff review; do not return storage locations to callers.
    return new Response(JSON.stringify({ document: result.data?.document }), { headers });
  } catch { return reply("Document processing failed. Check the upload and retry.", 400); }
});
