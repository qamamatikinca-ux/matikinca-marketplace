import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function env(name: string, fallback?: string): string {
  const value = process.env[name] ?? (fallback ? process.env[fallback] : undefined);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function publicSupabase(accessToken?: string): SupabaseClient {
  const url = env("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.SUPABASE_ANON_KEY;
  if (!key) throw new Error("Missing public Supabase key");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

export function browserSupabase(): SupabaseClient {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) throw new Error("Missing public Supabase key");
  return createClient(url, key);
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
