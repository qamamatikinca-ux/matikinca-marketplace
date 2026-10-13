import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { isAuthenticatedUser } from "@/lib/auth";
import { serverRateLimit } from "@/lib/serverRateLimit";

export async function GET(request: Request) {
  const limited = serverRateLimit(request, "call-ice", 12, 60000);
  if (limited) return limited;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) return Response.json({ error: "Sign in to call." }, { status: 401 });
  if (!url || !key) return Response.json({ error: "Calls are temporarily unavailable." }, { status: 503 });
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authorization } } });
  const { data, error } = await client.auth.getUser();
  if (error || !isAuthenticatedUser(data.user)) return Response.json({ error: "Sign in to call." }, { status: 401 });
  const state = await client.rpc("loadlink_get_my_intelligence_state");
  if (state.error) return Response.json({ error: "Call access could not be checked." }, { status: 503 });
  if (["blocked", "suspended"].includes(String(state.data?.account_status))) return Response.json({ error: "Calling is unavailable for this account." }, { status: 403 });
  const servers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }];
  const turnUrl = process.env.LOADLINK_TURN_URL || process.env.NEXT_PUBLIC_LOADLINK_TURN_URL;
  const secret = process.env.LOADLINK_TURN_SHARED_SECRET;
  if (turnUrl && secret) {
    const username = `${Math.floor(Date.now() / 1000) + 3600}:${data.user.id}`;
    servers.push({ urls: turnUrl, username, credential: createHmac("sha1", secret).update(username).digest("base64") });
  } else {
    // Retain configured relay access during migration, but deliver credentials
    // only to authenticated users rather than embedding them in public bundles.
    const username = process.env.LOADLINK_TURN_USERNAME || process.env.NEXT_PUBLIC_LOADLINK_TURN_USERNAME;
    const credential = process.env.LOADLINK_TURN_CREDENTIAL || process.env.NEXT_PUBLIC_LOADLINK_TURN_CREDENTIAL;
    if (turnUrl && username && credential) servers.push({ urls: turnUrl, username, credential });
  }
  return Response.json({ iceServers: servers, relayAvailable: servers.some((server) => Boolean(server.username)) }, { headers: { "Cache-Control": "private, no-store", Vary: "Authorization" } });
}
