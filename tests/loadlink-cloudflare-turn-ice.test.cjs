const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const iceRoute = fs.readFileSync(path.join(__dirname, "..", "app/api/calls/ice/route.ts"), "utf8");
const js = ts.transpileModule(iceRoute, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function makeRoute(turn = {}, upstream = async () => { throw new Error("Unexpected external network request."); }) {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: "https://loadlink-test.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "loadlink-test-publishable-key",
    ...turn,
  };
  const mod = { exports: {} };
  const fakeRequire = name => {
    if (name === "@supabase/supabase-js") return {
      createClient: () => ({
        auth: { getUser: async () => ({ data: { user: { id: "6f326b55-599e-4b94-841d-875a35568f50" } }, error: null }) },
        rpc: async () => ({ data: { account_status: "active" }, error: null }),
      }),
    };
    if (name === "@/lib/auth") return { isAuthenticatedUser: user => Boolean(user?.id) };
    if (name === "@/lib/serverRateLimit") return { serverRateLimit: () => null };
    return require(name);
  };
  const execute = new Function("require", "exports", "module", "process", "fetch", "Response", "AbortSignal", js);
  execute(fakeRequire, mod.exports, mod, { env }, upstream, Response, AbortSignal);
  return mod.exports.GET;
}

const request = (authorized = true) => new Request("https://loadlink.test/api/calls/ice", {
  headers: authorized ? { Authorization: "Bearer valid-test-session" } : {},
});

test("Cloudflare-managed TURN returns authorized short-lived relay credentials without leaking its API token", async () => {
  let providerRequests = 0;
  const keyId = "0123456789abcdef0123456789abcdef";
  const providerToken = "server-secret-never-expose";
  const get = makeRoute({
    LOADLINK_CLOUDFLARE_TURN_KEY_ID: keyId,
    LOADLINK_CLOUDFLARE_TURN_API_TOKEN: providerToken,
  }, async (url, options) => {
    providerRequests += 1;
    assert.equal(url, "https://rtc.live.cloudflare.com/v1/turn/keys/" + keyId + "/credentials/generate-ice-servers");
    assert.equal(options.headers.Authorization, "Bearer " + providerToken);
    assert.equal(JSON.parse(options.body).ttl, 3600);
    return Response.json({ iceServers: [
      { urls: "stun:stun.cloudflare.com:3478" },
      { urls: [
        "turn:turn.cloudflare.com:3478?transport=udp",
        "turn:turn.cloudflare.com:443?transport=udp",
        "turn:turn.cloudflare.com:3478?transport=tcp",
        "turns:turn.cloudflare.com:443?transport=tcp",
      ], username: "short-lived-user", credential: "short-lived-secret" },
    ] }, { status: 201 });
  });
  const res = await get(request());
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Cache-Control"), "private, no-store");
  const payload = await res.json();
  assert.equal(payload.relayAvailable, true);
  assert.ok(payload.iceServers.some(server => Array.isArray(server.urls) &&
    server.urls.some(url => url.includes("turns:turn.cloudflare.com:443"))));
  assert.ok(!JSON.stringify(payload).includes(providerToken));
  assert.equal(providerRequests, 1);
});

test("TURN API credentials are not issued to unsigned visitors", async () => {
  let issued = false;
  const get = makeRoute({
    LOADLINK_CLOUDFLARE_TURN_KEY_ID: "0123456789abcdef0123456789abcdef",
    LOADLINK_CLOUDFLARE_TURN_API_TOKEN: "test",
  }, async () => { issued = true; throw new Error("Should not be called."); });
  const res = await get(request(false));
  assert.equal(res.status, 401);
  assert.equal(issued, false);
});

test("Configured but unavailable relay fails safely instead of silently returning STUN-only servers", async () => {
  const get = makeRoute({
    LOADLINK_CLOUDFLARE_TURN_KEY_ID: "0123456789abcdef0123456789abcdef",
    LOADLINK_CLOUDFLARE_TURN_API_TOKEN: "secret",
  }, async () => new Response("TURN rate limited", { status: 429 }));
  const res = await get(request());
  assert.equal(res.status, 503);
  const payload = await res.json();
  assert.match(payload.error, /relay is unavailable/i);
  assert.ok(!JSON.stringify(payload).includes("secret"));
});

test("Without provider keys, existing STUN fallback remains available but is not marked as a relay", async () => {
  const get = makeRoute();
  const res = await get(request());
  assert.equal(res.status, 200);
  const payload = await res.json();
  assert.equal(payload.relayAvailable, false);
  assert.ok(payload.iceServers.some(server => String(server.urls).startsWith("stun:")));
});

test("Untrusted provider hosts never reach the browser's ICE configuration", async () => {
  const get = makeRoute({
    LOADLINK_CLOUDFLARE_TURN_KEY_ID: "0123456789abcdef0123456789abcdef",
    LOADLINK_CLOUDFLARE_TURN_API_TOKEN: "secret",
  }, async () => Response.json({ iceServers: [
    { urls: ["turn:turn.cloudflare.com:3478?transport=udp", "turn:untrusted.example:3478"], username: "temporary", credential: "temporary" },
  ] }, { status: 201 }));
  const res = await get(request());
  assert.equal(res.status, 200);
  const payload = await res.json();
  assert.equal(payload.relayAvailable, true);
  assert.ok(!JSON.stringify(payload).includes("untrusted.example"));
});
