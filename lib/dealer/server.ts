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

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "LoadLink could not complete that request.";
  const authFailure = /auth|sign in|permission|dealer workspace|not allowed/i.test(message);
  return Response.json({ error: message }, { status: authFailure ? 403 : 400 });
}
