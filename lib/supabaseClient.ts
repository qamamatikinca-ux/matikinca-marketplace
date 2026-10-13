import { createClient } from "@supabase/supabase-js";

import { LOADLINK_SUPABASE_URL, LOADLINK_SUPABASE_PUBLISHABLE_KEY } from "@/lib/supabasePublicConfig";

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
