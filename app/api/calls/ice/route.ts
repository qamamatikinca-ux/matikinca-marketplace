import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { isAuthenticatedUser } from "@/lib/auth";
import { serverRateLimit } from "@/lib/serverRateLimit";

type CallIceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

const CALL_ICE_HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Authorization",
};

const SAFE_CLOUDFLARE_TURN_URL = /^turns?:turn\.cloudflare\.com:(?:3478|5349|443|80)(?:\?transport=(?:udp|tcp))?$/i;
const SAFE_CLOUDFLARE_STUN_URL = /^stuns?:stun\.cloudflare\.com:3478$/i;

function hasRelay(servers: CallIceServer[]) {
  return servers.some(server =>
    Boolean(server.username && server.credential) &&
    (Array.isArray(server.urls) ? server.urls : [server.urls])
      .some(url => /^turns?:/i.test(url))
  );
}

/**
 * Cloudflare's managed TURN service issues short-lived credentials. The
 * permanent API token must stay on Vercel; never put it in NEXT_PUBLIC_*.
 * Docs: https://developers.cloudflare.com/realtime/turn/generate-credentials/
 */
async function cloudflareTurnServers(): Promise<CallIceServer[] | null> {
  const keyId = process.env.LOADLINK_CLOUDFLARE_TURN_KEY_ID?.trim() || "";
  const apiToken = process.env.LOADLINK_CLOUDFLARE_TURN_API_TOKEN?.trim() || "";
  if (!keyId && !apiToken) return null;
  if (!/^[0-9a-f]{32}$/i.test(keyId) || !apiToken) {
    throw new Error("Incomplete Cloudflare TURN configuration.");
  }

  const response = await fetch(
    "https://rtc.live.cloudflare.com/v1/turn/keys/" + keyId + "/credentials/generate-ice-servers",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiToken,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ ttl: 3600 }),
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    },
  );
  if (!response.ok) throw new Error("Cloudflare TURN credential request failed.");

  const payload = await response.json() as { iceServers?: unknown };
  if (!Array.isArray(payload.iceServers)) throw new Error("Invalid Cloudflare TURN response.");

  const servers: CallIceServer[] = [];
  for (const entry of payload.iceServers) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const urls = (typeof row.urls === "string" ? [row.urls] : Array.isArray(row.urls) ? row.urls : [])
      .filter((url): url is string => typeof url === "string" &&
        (SAFE_CLOUDFLARE_TURN_URL.test(url) || SAFE_CLOUDFLARE_STUN_URL.test(url)));
    if (!urls.length) continue;

    const turn = urls.filter(url => /^turns?:/i.test(url));
    const username = typeof row.username === "string" ? row.username : "";
    const credential = typeof row.credential === "string" ? row.credential : "";
    if (turn.length) {
      if (!username || !credential) continue;
      servers.push({ urls, username, credential });
    } else {
      servers.push({ urls });
    }
  }
  if (!hasRelay(servers)) throw new Error("Cloudflare TURN supplied no relay credentials.");
  return servers;
}

export async function GET(request: Request) {
  const limited = serverRateLimit(request, "call-ice", 12, 60000);
  if (limited) return limited;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) return Response.json({ error: "Sign in to call." }, { status: 401, headers: CALL_ICE_HEADERS });
  if (!url || !key) return Response.json({ error: "Calls are temporarily unavailable." }, { status: 503, headers: CALL_ICE_HEADERS });

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !isAuthenticatedUser(data.user)) return Response.json({ error: "Sign in to call." }, { status: 401, headers: CALL_ICE_HEADERS });

  const state = await client.rpc("loadlink_get_my_intelligence_state");
  if (state.error) return Response.json({ error: "Call access could not be checked." }, { status: 503, headers: CALL_ICE_HEADERS });
  if (["blocked", "suspended"].includes(String(state.data?.account_status))) {
    return Response.json({ error: "Calling is unavailable for this account." }, { status: 403, headers: CALL_ICE_HEADERS });
  }

  const servers: CallIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  // Prefer Cloudflare's global UDP/TCP/TLS relays whenever configured.
  // Do not silently fall back to STUN if a configured relay is broken.
  try {
    const managedServers = await cloudflareTurnServers();
    if (managedServers) {
      servers.push(...managedServers);
    } else {
      const turnUrl = process.env.LOADLINK_TURN_URL || process.env.NEXT_PUBLIC_LOADLINK_TURN_URL;
      const secret = process.env.LOADLINK_TURN_SHARED_SECRET;
      if (turnUrl && secret) {
        const username = String(Math.floor(Date.now() / 1000) + 3600) + ":" + data.user.id;
        servers.push({ urls: turnUrl, username, credential: createHmac("sha1", secret).update(username).digest("base64") });
      } else {
        // Backwards compatibility for existing TURN providers. Never configure
        // new credentials as NEXT_PUBLIC_* values.
        const username = process.env.LOADLINK_TURN_USERNAME || process.env.NEXT_PUBLIC_LOADLINK_TURN_USERNAME;
        const credential = process.env.LOADLINK_TURN_CREDENTIAL || process.env.NEXT_PUBLIC_LOADLINK_TURN_CREDENTIAL;
        if (turnUrl && username && credential) servers.push({ urls: turnUrl, username, credential });
      }
    }
  } catch {
    // Avoid exposing a provider token, account information, or upstream error.
    return Response.json({ error: "The voice-call relay is unavailable. Please retry shortly." }, { status: 503, headers: CALL_ICE_HEADERS });
  }

  return Response.json(
    { iceServers: servers, relayAvailable: hasRelay(servers) },
    { headers: CALL_ICE_HEADERS },
  );
}
