LoadLink — Google One Tap

The Google One Tap homepage component uses Google's official Google Identity Services SDK and Supabase Auth. The existing Continue with Google button remains the fallback.

Activation: configure a Google OAuth Web Client ID in Google Cloud, add https://matikinca-marketplace.vercel.app to Authorized JavaScript Origins, use the same Google project as Supabase Auth's Google provider, and set the public NEXT_PUBLIC_GOOGLE_CLIENT_ID in Vercel production environment. Redeploy and test signed-out visits on Safari and Chrome.

Do not put any client secret or Supabase service-role key in a NEXT_PUBLIC_ variable.

Google controls whether One Tap appears. It may not appear due to session status, browser limits or dismissal. The integration uses a fresh SHA-256 nonce and Supabase signInWithIdToken. Do not imitate Google's consent UI.
