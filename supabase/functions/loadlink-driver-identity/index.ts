import { createClient } from "npm:@supabase/supabase-js@2.117.3";
const headers = { "Content-Type": "application/json", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
const SOURCE = "driver_identity_service_v2";
let phoneSetting: { enabled: boolean; expires: number } | null = null;
async function phoneAvailable(url: string) {
 if (phoneSetting && phoneSetting.expires > Date.now()) return phoneSetting.enabled;
 try {
  const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY")! }, signal: AbortSignal.timeout(5000) });
  if (!response.ok) return null;
  const settings = await response.json();
  if (typeof settings.external?.phone !== "boolean") return null;
  phoneSetting = { enabled: settings.external.phone, expires: Date.now() + 60000 };
  return phoneSetting.enabled;
 } catch { return null; }
}
Deno.serve(async (request: Request) => {
 if (request.method !== "POST") return reply({ error: "Method not allowed." }, 405);
 try {
  const url = Deno.env.get("SUPABASE_URL")!;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user || user.is_anonymous) return reply({ error: "Sign in required." }, 401);
  const bodyText = await request.text();
  if (bodyText.length > 6000) return reply({ error: "Request too large." }, 413);
  const body = JSON.parse(bodyText);
  const [profileResult, restrictionResult] = await Promise.all([
   admin.from("driver_profiles").select("id,user_id,phone,email,status").eq("user_id", user.id).maybeSingle(),
   admin.from("user_moderation_profiles").select("status").eq("user_id", user.id).maybeSingle(),
  ]);
  if (profileResult.error || restrictionResult.error) return reply({ error: "Verification could not load. Retry shortly." }, 503);
  if (["blocked", "suspended"].includes(restrictionResult.data?.status)) return reply({ error: "Account access is restricted." }, 403);
  const profile = profileResult.data;
  const normalizePhone = (value: string) => { let n = value.replace(/\D/g, ""); if (/^0[6-8]\d{8}$/.test(n)) n = `27${n.slice(1)}`; if (n.startsWith("00")) n = n.slice(2); return n; };
  const phoneVerified = Boolean(user.phone_confirmed_at && user.phone && normalizePhone(profile?.phone || "") === normalizePhone(user.phone));
  const emailVerified = Boolean(user.email_confirmed_at && user.email && profile?.email?.trim().toLowerCase() === user.email.trim().toLowerCase());
  const docsResult = profile ? await admin.from("driver_documents").select("document_type,storage_path,sha256,mime_type,validation_status").eq("profile_id", profile.id) : { data: [], error: null };
  if (docsResult.error) return reply({ error: "Verification documents could not load." }, 503);
  const identity = docsResult.data?.find(d => d.document_type === "identity" && d.validation_status === "validated");
  const portrait = docsResult.data?.find(d => d.document_type === "portrait" && d.validation_status === "validated");
  const binding = () => ({ profile_id: profile!.id, identity_sha256: identity!.sha256, portrait_sha256: portrait!.sha256, identity_path: identity!.storage_path, portrait_path: portrait!.storage_path, identity_mime: identity!.mime_type });
  const current = (check: { client_observations?: Record<string, any> }) => {
   const meta = check.client_observations;
   return Boolean(identity && portrait && profile && meta?.source === SOURCE && meta.binding?.profile_id === profile.id && meta.binding?.identity_sha256 === identity.sha256 && meta.binding?.portrait_sha256 === portrait.sha256);
  };
  if (body.action === "status") {
   const result = await admin.from("identity_live_checks").select("id,status,review_feedback,client_observations,created_at").eq("user_id", user.id).eq("purpose", "driver").order("created_at", { ascending: false }).limit(20);
   if (result.error) return reply({ error: "Identity review status could not load." }, 503);
   const check = (result.data || []).find(c => current(c) && c.status !== "collecting");
   return reply({ emailVerified, phoneVerified, phoneVerificationAvailable: await phoneAvailable(url), accountEmail: user.email || "", identityReady: Boolean(identity && portrait), identityMime: identity?.mime_type || "", check: check ? { id: check.id, status: check.status, mode: check.client_observations.mode, review_feedback: check.review_feedback } : null });
  }
  if (!profile || !identity || !portrait) return reply({ error: "Upload your profile photo and ID or passport first." }, 400);
  if (body.action === "document") {
   const { data, error } = await admin.storage.from("loadlink-driver-documents").download(identity.storage_path);
   if (error || !data) return reply({ error: "Your ID could not be opened. Upload it again." }, 400);
   return new Response(data, { headers: { ...headers, "Content-Type": identity.mime_type, "Content-Disposition": "inline" } });
  }
  if (body.action === "start" || body.action === "manual") {
   if (body.consent !== true) return reply({ error: "Agree to the private identity review before continuing." }, 400);
   if (body.action === "start" && !["image/jpeg", "image/png"].includes(identity.mime_type)) return reply({ error: "A PDF needs staff review. Choose Request staff review below." }, 400);
   if (body.action === "manual" && (typeof body.reason !== "string" || body.reason.trim().length < 8 || body.reason.length > 400)) return reply({ error: "Give a short reason for staff review." }, 400);
   const reserved = await admin.rpc("loadlink_reserve_driver_evidence_attempt", { p_user_id: user.id });
   if (reserved.error) return reply({ error: "Verification could not start. Retry shortly." }, 503);
   if (!reserved.data) return reply({ error: "Too many attempts. Please wait ten minutes before trying again." }, 429);
   const isManual = body.action === "manual";
   const side = crypto.getRandomValues(new Uint8Array(1))[0] % 2 ? "left" : "right";
   const challenge = ["centre", side, "centre", side === "left" ? "right" : "left", "centre"];
   const meta = { source: SOURCE, mode: isManual ? "manual" : "camera", binding: binding(), consent_at: new Date().toISOString(), automatic_approval: false, ...(isManual ? { manual_reason: body.reason.trim() } : {}) };
   const saved = await admin.from("identity_live_checks").insert({ user_id: user.id, purpose: "driver", challenge, client_observations: meta, status: isManual ? "pending_review" : "collecting", ...(isManual ? { submitted_at: new Date().toISOString() } : {}) }).select("id,status,challenge,user_id").single();
   if (saved.error) return reply({ error: "The check could not be saved. Please retry." }, 503);
   const uploads: Record<string, { path: string; token: string }> = {};
   if (!isManual) {
    for (const [key, name] of [["portrait", "portrait.jpg"], ["webm", "capture.webm"], ["mp4", "capture.mp4"]]) {
     const signed = await admin.storage.from("identity-live-evidence").createSignedUploadUrl(`${user.id}/${saved.data.id}/${name}`, { upsert: false });
     if (signed.error || !signed.data) return reply({ error: "The capture upload could not start. Please retry." }, 503);
     uploads[key] = { path: signed.data.path, token: signed.data.token };
    }
   }
   return reply({ check: saved.data, uploads });
  }
  if (body.action === "finish") {
   if (!/^[0-9a-f-]{36}$/i.test(String(body.id || ""))) return reply({ error: "Invalid check." }, 400);
   const result = await admin.from("identity_live_checks").select("*").eq("id", body.id).eq("user_id", user.id).eq("purpose", "driver").maybeSingle();
   const check = result.data;
   if (result.error || !check || !current(check)) return reply({ error: "Your documents changed. Start a new camera check." }, 409);
   if (check.status === "pending_review") return reply({ ok: true });
   if (check.status !== "collecting" || new Date(check.expires_at).getTime() <= Date.now()) return reply({ error: "The check expired. Please start again." }, 409);
   const capture = body.capture;
   const steps = capture?.steps;
   const complete = capture?.complete === true && Array.isArray(steps) && steps.length === check.challenge.length && steps.every((s: { step: string; detected: boolean }, i: number) => s.step === check.challenge[i] && s.detected === true);
   if (!complete || !Number.isFinite(capture.duration_ms) || capture.duration_ms < 500 || capture.duration_ms > 30000 || !["mp4", "webm"].includes(body.extension)) return reply({ error: "All camera movements must finish before submission." }, 400);
   const prefix = `${user.id}/${check.id}/`;
   for (const [name, kind] of [["portrait.jpg", "image"], [`capture.${body.extension}`, "video"]]) {
    const object = await admin.storage.from("identity-live-evidence").download(prefix + name);
    if (object.error || !object.data || object.data.size < 1 || object.data.size > 6291456) return reply({ error: "The recording upload is incomplete. Retry sending it." }, 400);
    const bytes = new Uint8Array(await object.data.slice(0, 16).arrayBuffer());
    const validImage = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const validVideo = body.extension === "webm" ? bytes[0] === 26 && bytes[1] === 69 && bytes[2] === 223 && bytes[3] === 163 : new TextDecoder().decode(bytes.slice(4, 8)) === "ftyp";
    if (!(kind === "image" ? validImage : validVideo)) return reply({ error: "The capture file is not valid. Record it again." }, 400);
   }
   const safeCapture = { complete: true, steps, duration_ms: capture.duration_ms, camera: capture.camera === "environment" ? "environment" : "user", comparison_distance: Number.isFinite(capture.comparison_distance) ? capture.comparison_distance : null, note: "Browser movement and comparison observations are untrusted. Staff must inspect the original ID, portrait and recording. No automatic verification." };
   const saved = await admin.from("identity_live_checks").update({ status: "pending_review", submitted_at: new Date().toISOString(), portrait_path: prefix + "portrait.jpg", video_path: prefix + `capture.${body.extension}`, client_observations: { ...check.client_observations, capture: safeCapture } }).eq("id", check.id).eq("user_id", user.id).eq("status", "collecting").select("id").single();
   if (saved.error) return reply({ error: "The check changed. Refresh your status before retrying." }, 409);
   return reply({ ok: true });
  }
  return reply({ error: "Unknown verification action." }, 400);
 } catch (error) { console.error("Driver identity service failed", error instanceof Error ? error.name : "Error"); return reply({ error: "Verification could not finish. Please retry." }, 500); }
});
