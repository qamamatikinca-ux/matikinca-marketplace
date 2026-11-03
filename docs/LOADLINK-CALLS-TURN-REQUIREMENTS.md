# LoadLink in-app voice call reliability

LoadLink uses browser WebRTC for in-app calls. A call session or an accepted WebRTC signal does **not** guarantee that audio is connected.

## Production requirement: authenticated TURN relay

The current marketplace Vercel project has the Supabase and Turnstile variables configured, but no LoadLink TURN variables were found during the 2026-11-03 review. On restrictive mobile, carrier-grade NAT, and some Wi-Fi networks, STUN alone cannot establish two-way audio.

## Preferred provider: Cloudflare Realtime TURN

LoadLink's `GET /api/calls/ice` endpoint now supports Cloudflare's managed TURN relay and automatically obtains **one-hour temporary TURN credentials** for authenticated users. It supports UDP 3478/443, TCP 3478/80 and TLS 5349/443; the long-lived provider token is never returned to the browser.

**One-time Cloudflare account setup (requires an account owner):**

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com/?to=/:account/calls) → **Realtime** → **TURN Server** → **Create** and name the server "LoadLink voice calls".
2. In Vercel → **matikinca-marketplace** → **Settings** → **Environment Variables**, add the following as **encrypted server-side** environment variables for Production and Preview:
   - `LOADLINK_CLOUDFLARE_TURN_KEY_ID`: the Cloudflare **TURN Token ID** (32-character identifier).
   - `LOADLINK_CLOUDFLARE_TURN_API_TOKEN`: the associated **TURN API Token**.
3. Redeploy the reviewed marketplace release. Calls now request `https://rtc.live.cloudflare.com/v1/turn/keys/{id}/credentials/generate-ice-servers` from the server. The response is authenticated, rate-limited, no-store, and includes short-lived credentials.
4. Test with two different real mobile networks. Confirm that `/api/calls/ice` indicates `relayAvailable: true` for an authenticated account. That confirms a credential was issued, **not** that a media call succeeds; verify both-way audio before declaring the repair finished.

**Cloudflare pricing:** currently $0.05 per GB of relayed outbound traffic when used without its SFU (free in conjunction with Cloudflare Realtime SFU); usage charges may apply. The account owner must accept those terms. The site does not start billing or create a Cloudflare account merely by deploying the code.

Do not paste Cloudflare's API token into the chat or store it in Github. Never use `NEXT_PUBLIC_` for provider secrets. The code fails with a clear 503 when Cloudflare is configured but cannot supply a valid relay, rather than silently returning STUN-only candidates.

Official docs: https://developers.cloudflare.com/realtime/turn/generate-credentials/

## Other providers (existing support)

Choose a trusted TURN provider, or operate a securely managed TURN service. Configure the following as **server-side Vercel environment variables** for the marketplace project:

- `LOADLINK_TURN_URL`: provider-issued `turn:` or `turns:` URL (use TLS where available).
- **Preferred for services supporting ephemeral credentials:** `LOADLINK_TURN_SHARED_SECRET`. The protected `GET /api/calls/ice` endpoint derives time-limited credentials with HMAC-SHA1; provider settings must support the same TURN REST-API credential convention.
- **Alternatively** use `LOADLINK_TURN_USERNAME` and `LOADLINK_TURN_CREDENTIAL` from the provider. These are static credentials and require restricted issuance/rotation.

Do **not** publish TURN secrets in `NEXT_PUBLIC_*`, a Git repository, analytics, or browser logs. The API currently supports legacy `NEXT_PUBLIC_LOADLINK_TURN_*` fallback solely for compatibility; do not use that fallback for new configuration.

Redeploy the Vercel marketplace after configuring the environment. Vercel rate limits currently prevent immediately releasing this change.

## Acceptance checks

1. Log in to two different LoadLink accounts on real phones. Open an authorized chat, initiate a call and accept it on the other phone.
2. Test across Wi-Fi and separate mobile networks (including an iPhone running Safari) and verify **two-way audio** with normal speaker and mute behavior, not merely the Connected label.
3. Confirm the authorized `/api/calls/ice` response reports `relayAvailable: true` (do not share the returned TURN credentials).
4. Test declined calls, unanswered calls, hangups, incoming notifications, and audio recovery when the app returns to the foreground.
5. Monitor actual ICE connected/completed events, remote audio tracks and media playback failures; do not record personal call content.

The code now only marks the call Connected after real peer connectivity and playable remote audio. A relay is still required for dependable service on mobile networks; no code-only change can remove this infrastructure dependency.
