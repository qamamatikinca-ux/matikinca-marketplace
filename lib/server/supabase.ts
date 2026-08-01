import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "request_failed") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function publicSupabase(accessToken?: string): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "";

  if (!url.startsWith("https://") || key.length < 20) {
    throw new ApiError("LoadLink is missing its Supabase public configuration.", 503, "supabase_not_configured");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

export function serviceSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url.startsWith("https://") || key.length < 20) {
    throw new ApiError("LoadLink is missing its server-only Supabase service configuration.", 503, "supabase_service_not_configured");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function bearerToken(request: Request) {
  const value = request.headers.get("authorization") || "";
  return value.toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : "";
}

export async function authenticatedUser(request: Request): Promise<{ user: User; token: string; client: SupabaseClient }> {
  const token = bearerToken(request);
  if (!token) throw new ApiError("Sign in to continue.", 401, "authentication_required");

  const client = publicSupabase(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user || (data.user as User & { is_anonymous?: boolean }).is_anonymous) {
    throw new ApiError("Your session is no longer valid. Sign in again.", 401, "invalid_session");
  }

  return { user: data.user, token, client };
}

export async function requireAdmin(request: Request) {
  const auth = await authenticatedUser(request);
  let result = await auth.client.rpc("loadlink_is_staff", { required_roles: null });
  if (result.error && /function|schema cache|does not exist/i.test(result.error.message)) {
    result = await auth.client.rpc("is_loadlink_admin");
  }
  if (result.error || result.data !== true) throw new ApiError("This operation is restricted to authorised LoadLink staff.", 403, "admin_required");
  return auth;
}

export function safeApiError(error: unknown, fallback = "The request could not be completed.") {
  if (error instanceof ApiError) {
    return { message: error.message, status: error.status, code: error.code };
  }
  const message = error instanceof Error && error.message ? error.message : fallback;
  return { message, status: 500, code: "internal_error" };
}
