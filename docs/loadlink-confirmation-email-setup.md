# LoadLink account verification code — activation checklist

The website now accepts the Supabase Auth one-time verification code at signup. 
Source HTML: `supabase/email-templates/confirm-signup.html`.
The template follows the approved LoadLink email layout and inserts `{{ .Token }}` from Supabase (never from browser code).

## Activate email sending (production configuration still required)

1. Sign in to the **correct** hosted Supabase project `cqmjgulfbbwxyecsnzed` and open Authentication → Email Templates → **Confirm signup**.
2. Set subject to **Your LoadLink verification code** and paste the exact HTML from the source file. Save. GitHub commits do not update hosted Auth templates automatically.
3. Go to Authentication → SMTP settings. Connect a **separately authorised, deliverability-tested SMTP sender**. Set From to `noreplyloadlink@gmail.com` only after verifying ownership and SMTP authorization. Do not reuse the marketing Gmail OAuth access token or password. For reliable production volumes, prefer a domain-verified transactional SMTP sender on a LoadLink-owned domain if the proposed Gmail account cannot send reliably.
4. Leave **Confirm email** enabled. Do not bypass verification or send codes to Google identities that already arrive verified through trusted OAuth. Google login still requires the real Google provider.
5. Keep Supabase server-side one-time code expiration, rate limits and CAPTCHA. Existing UI requires Turnstile and uses a 60-second resend cooldown. Verify OTP using Supabase Auth; no code is stored in LoadLink tables or logs.
6. Run end-to-end tests with an authorised new email account: signup → receive code → enter code → navigate to `/complete-profile`; invalid/replayed/expired code rejects; resend cooldown works; Google OAuth creates a verified account without a redundant email challenge.
7. Confirm SMTP SPF/DKIM/DMARC, inbox delivery, mail branding and Gmail's outbound daily limits. Never claim sender is ready until a genuine message was received.

### Important limitations
- Supabase's built-in email provider is not production-ready and sends only to pre-authorized project member addresses; a custom SMTP provider is required for real customer emails.
- Email delivery speed depends on the SMTP service and recipient mailbox and cannot be guaranteed.
- The email logo uses a public HTTPS image, so some recipient email apps may block images until permitted.
- Native Android Google OAuth must launch a secure external browser (Chrome Custom Tabs / Android Credential Manager), not an embedded WebView. The native shell must handle the redirect. A website-only change cannot override the Android WebView's navigation policy.
