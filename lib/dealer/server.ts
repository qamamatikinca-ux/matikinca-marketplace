import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export function dealerServerClient(request: NextRequest): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Supabase environment variables are missing.");
  const auth = request.headers.get("authorization") || "";
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: auth ? { Authorization: auth } : {} },
  });
}

export async function requireDealerContext(client: SupabaseClient) {
  const { data, error } = await client.rpc("loadlink_get_my_dealer_context");
  if (error) throw error;
  if (!data?.dealership_id) throw new Error("Dealer workspace not found.");
  return data;
}

function errorText(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = String(record.message || record.error_description || record.details || record.hint || "").trim();
    if (message) return message;
  }
  if (typeof error === "string" && error.trim()) return error.trim();
  return "LoadLink could not complete that request.";
}

export function apiError(error: unknown) {
  const message = errorText(error);
  const authFailure = /auth|sign in|permission|dealer workspace|not allowed/i.test(message);
  return Response.json({ error: message }, { status: authFailure ? 403 : 400 });
}
