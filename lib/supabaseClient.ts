import { createClient } from "@supabase/supabase-js";

// These are LoadLink's public browser credentials. Supabase publishable keys are
// intentionally safe to ship in client code; database access remains protected
// by Auth + RLS. Keeping them as fallbacks prevents locally prebuilt Vercel
// deployments from silently compiling an unusable auth client when NEXT_PUBLIC
// variables are unavailable during the build step.
const LOADLINK_SUPABASE_URL = "https://cqmjgulfbbwxyecsnzed.supabase.co";
const LOADLINK_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_jpBfLJ-DUl9-JVnYX-_7Hg_UIZ47EnP";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || LOADLINK_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  LOADLINK_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = supabaseUrl.startsWith("https://") && supabaseKey.length > 20;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
