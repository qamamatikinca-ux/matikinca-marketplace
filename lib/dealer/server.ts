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

function errorRecord(error: unknown) {
  return error && typeof error === "object" ? error as Record<string, unknown> : null;
}

function errorText(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  const record = errorRecord(error);
  if (record) {
    const message = String(record.message || record.error_description || record.details || record.hint || "").trim();
    if (message) return message;
  }
  if (typeof error === "string" && error.trim()) return error.trim();
  return "LoadLink could not complete that request.";
}

function errorStatus(error: unknown, message: string) {
  const record = errorRecord(error);
  const code = String(record?.code || record?.status || "").toUpperCase();
  const normalized = message.toLowerCase();

  if (
    code === "401" || code === "PGRST301" ||
    /jwt|token expired|session expired|authentication required|not authenticated|sign in required|sign in again/.test(normalized)
  ) return 401;

  if (
    code === "403" || code === "42501" ||
    /permission denied|forbidden|not authorised|not authorized|admin permission|required permission|not allowed|subscription required|verification required/.test(normalized)
  ) return 403;

  if (code === "23505" || /duplicate|already exists|already in use|conflict/.test(normalized)) return 409;
  if (code === "23503") return 409;

  if (code === "404" || code === "PGRST116" || /not found|dealer workspace not found/.test(normalized)) return 404;

  if (
    /required|invalid|unsupported|incomplete|too large|too long|must be|choose |could not be verified/.test(normalized)
  ) return 422;

  if (
    code.startsWith("XX") || code.startsWith("PGRST") ||
    /environment variables are missing|schema cache|does not exist|internal error/.test(normalized)
  ) return 500;

  return 400;
}

export function apiError(error: unknown) {
  const message = errorText(error);
  return Response.json({ error: message }, { status: errorStatus(error, message) });
}
