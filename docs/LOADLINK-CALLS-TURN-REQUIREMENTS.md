# LoadLink in-app voice call reliability

LoadLink uses browser WebRTC for in-app calls. A call session or an accepted WebRTC signal does **not** guarantee that audio is connected.

## Production requirement: authenticated TURN relay

The current marketplace Vercel project has the Supabase and Turnstile variables configured, but no LoadLink TURN variables were found during the 2026-11-03 review. On restrictive mobile, carrier-grade NAT, and some Wi-Fi networks, STUN alone cannot establish two-way audio.

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
