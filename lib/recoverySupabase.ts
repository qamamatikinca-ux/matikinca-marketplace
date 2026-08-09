import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "";

const configured = supabaseUrl.startsWith("https://") && supabaseKey.length > 20;

// Password-recovery email links intentionally use the implicit browser flow.
// Unlike PKCE, the recovery link does not depend on a code verifier stored in
// the browser that originally requested the email, so the user can open the
// email from Safari, an email-app browser, or another device. The reset page
// immediately exchanges the URL tokens for a session and removes them from
// the address bar.
export const recoverySupabase = createClient(
  configured ? supabaseUrl : "https://placeholder.supabase.co",
  configured ? supabaseKey : "placeholder-key",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "implicit",
    },
  },
);
