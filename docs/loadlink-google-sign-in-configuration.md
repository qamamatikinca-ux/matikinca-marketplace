# LoadLink Google sign-in: production configuration check

The website now uses a shared browser Supabase PKCE OAuth start function for **Login** and **Sign up**, with a single callback at `/auth/callback`. No Google OAuth secrets are stored in website source code.

**Production site:** `https://matikinca-marketplace.vercel.app`

## Confirm in Supabase Dashboard

1. Authentication → Providers → Google: ensure Google provider is enabled and the configured OAuth Client ID and secret are valid.
2. Authentication → URL Configuration: the Site URL should be the public LoadLink site. Allow `https://matikinca-marketplace.vercel.app/auth/callback` as a redirect URL.
3. Test a real Google sign-in, complete the callback, and confirm it leads to the intended LoadLink page. Preview deployment domains need their own allow-list patterns for OAuth testing.

## Confirm in Google Auth Platform

1. Use the actual **LoadLink** app name, support email, official logo, homepage, privacy policy and terms links in the OAuth consent/branding setup.
2. For the web application OAuth client, allow `https://matikinca-marketplace.vercel.app` as an authorized JavaScript origin.
3. Use the callback URL displayed on Supabase's Google provider page as the **Google OAuth Authorized redirect URI** (the Supabase Auth callback, not your site's `/auth/callback`). For this project the expected form is `https://cqmjgulfbbwxyecsnzed.supabase.co/auth/v1/callback`; confirm the exact URL in the dashboard.
4. Complete any required domain verification, publishing and app-review steps requested by Google.

## Scope and verification limits

Website build and routes can be checked without a Google login. Full OAuth consent-screen branding, a live Google account session, provider secret correctness and redirect allow-list settings **cannot be confirmed by a source-only code change**. These must be tested/configured in the two provider dashboards, without sharing credentials.

Documentation: https://supabase.com/docs/guides/auth/social-sign-in/auth-google and https://supabase.com/docs/guides/auth/redirect-urls
