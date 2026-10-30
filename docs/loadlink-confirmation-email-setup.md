# LoadLink confirmation email setup

The branded email for **Confirm signup** is in `supabase/email-templates/confirm-signup.html`.

**Subject:** Welcome to LoadLink — confirm your email address

## Activate in hosted Supabase

1. Open [Supabase Authentication > Email Templates](https://supabase.com/dashboard/project/cqmjgulfbbwxyecsnzed/auth/templates).
2. Select **Confirm sign up**, set the subject above, and paste the full HTML from `confirm-signup.html`. Save.
3. In **Authentication > SMTP settings**, configure a verified transactional sender (for example Resend, Postmark, or AWS SES). Set the sender display name to `LoadLink`; use a verified address on your own domain. Keep sign-up email confirmation **enabled**.
4. Configure domain SPF, DKIM, and DMARC according to the sender's instructions. Disable link rewriting/tracking on authentication emails to protect confirmation links.
5. Confirm your Auth Site URL and redirect allowlist include the canonical production domain and `https://matikinca-marketplace.vercel.app/auth/callback`, as this page is the app's current callback target.
6. Check Auth email rate limits for realistic demand. Do not eliminate abuse throttles or CAPTCHA to chase speed.
7. Test signup with a new test address outside the Supabase organisation, confirm deliverability and timing, open the confirmation link, and verify it returns to the proper LoadLink profile flow. Test the protected resend action after its cooldown.

## Important

- The repository HTML file is a **source template**. Hosting it in GitHub does not change Supabase-hosted Auth emails. Step 2 is required for the new email to go live.
- The UI requests the initial email as part of Supabase `auth.signUp`; it cannot guarantee instant inbox delivery. SMTP provider performance, verification records, spam filtering, and rate limiting control delivery time.
- The resend form is guarded by Turnstile and a 60-second client cooldown; the server's own rate limits remain authoritative.
- **Do not change** `components/LogisticsNews.tsx`, the logistics news API, or the homepage news presentation as part of this email rollout.

Reference: https://supabase.com/docs/guides/auth/auth-email-templates and https://supabase.com/docs/guides/auth/auth-smtp
