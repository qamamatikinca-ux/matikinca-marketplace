import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

export function publicSupabase(accessToken?: string): SupabaseClient {
  if (!publicUrl || !publicKey) {
    if (!accessToken && isSupabaseConfigured) return supabase;
    throw new Error("Supabase is not connected on this deployment.");
  }

  return createClient(publicUrl, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

export function browserSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) throw new Error("Supabase is not connected on this deployment.");
  return supabase;
}

export function bearer(request: Request): string | null {
  const value = request.headers.get("authorization");
  if (!value?.toLowerCase().startsWith("bearer ")) return null;
  return value.slice(7).trim() || null;
}

export function safeError(error: unknown, fallback = "The request could not be completed.") {
  const incidentId = crypto.randomUUID();
  console.error(`[LoadLink Phase 2 ${incidentId}]`, error);
  return { error: fallback, incidentId };
}
