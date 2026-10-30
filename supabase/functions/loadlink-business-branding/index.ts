import { createClient } from "npm:@supabase/supabase-js@2.117.3";
const headers = { "Content-Type": "application/json", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
Deno.serve(async (request: Request) => {
 if (request.method !== "POST") return reply({ error: "Method not allowed." }, 405);
 try {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user || user.is_anonymous) return reply({ error: "Sign in required." }, 401);
  const text = await request.text(); if (text.length > 1500000) return reply({ error: "Logo is too large." }, 413);
  const body = JSON.parse(text);
  if (!["status", "read", "save", "remove"].includes(body.action)) return reply({ error: "Invalid action." }, 400);
  const client = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const access = await client.rpc("loadlink_get_my_intelligence_state");
  if (access.error) return reply({ error: "Package access could not be checked. Retry shortly." }, 503);
  const state = access.data;
  const paid = ["active", "trialing", "grace_period"].includes(state?.plan_state) || (state?.plan_state === "cancelled" && new Date(state.current_period_end || 0).getTime() > Date.now());
  const allowed = state?.authenticated === true && state.user_id === user.id && state.account_status === "active" && paid && ["pro", "dealer"].includes(state.plan);
  const path = `${user.id}/logo.png`, bucket = "loadlink-business-branding";
  const hasLogo = user.user_metadata?.loadlink_business_logo_path === path;
  if (body.action === "status") return reply({ allowed, hasLogo: allowed && hasLogo, userId: user.id });
  if (!allowed) return reply({ error: "Business logo branding requires an active Pro or Dealer package." }, 403);
  if (body.action === "read") {
   if (!hasLogo) return reply({ error: "No logo saved." }, 404);
   const image = await admin.storage.from(bucket).download(path);
   if (image.error || !image.data) return reply({ error: "The saved logo could not load. Retry shortly." }, 503);
   return new Response(image.data, { headers: { ...headers, "Content-Type": "application/octet-stream", "X-Logo-Mime": "image/png" } });
  }
  if (body.action === "save") {
   if (typeof body.image !== "string" || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(body.image)) return reply({ error: "Choose a valid PNG logo." }, 400);
   const raw = atob(body.image.split(",")[1]);
   const bytes = Uint8Array.from(raw, char => char.charCodeAt(0));
   if (!bytes.length || bytes.length > 1000000 || ![137,80,78,71,13,10,26,10].every((n,i) => bytes[i] === n)) return reply({ error: "Choose a PNG logo up to 1 MB." }, 400);
   const view = new DataView(bytes.buffer); if (bytes.length < 24 || view.getUint32(16) > 1600 || view.getUint32(20) > 1600 || view.getUint32(16) < 1 || view.getUint32(20) < 1) return reply({ error: "Choose a logo up to 1600 pixels per side." }, 400);
   const created = await admin.storage.createBucket(bucket, { public: false, fileSizeLimit: 1000000, allowedMimeTypes: ["image/png"] });
   if (created.error && !/already exists|duplicate/i.test(created.error.message)) return reply({ error: "Logo storage could not start. Please retry." }, 503);
   const uploaded = await admin.storage.from(bucket).upload(path, bytes, { contentType: "image/png", upsert: true, cacheControl: "0" });
   if (uploaded.error) return reply({ error: "The logo could not be saved. Please retry." }, 503);
  }
  const updated = await admin.auth.admin.updateUserById(user.id, { user_metadata: { loadlink_business_logo_path: body.action === "remove" ? null : path } });
  if (updated.error) return reply({ error: "Logo settings could not be saved. Please retry." }, 503);
  return reply({ ok: true });
 } catch { return reply({ error: "Business branding could not finish. Please retry." }, 503); }
});
