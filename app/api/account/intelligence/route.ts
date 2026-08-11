import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return Response.json({ error: "Account service is not configured." }, { status: 500 });
    const auth = request.headers.get("authorization") || "";
    const client = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: auth ? { Authorization: auth } : {} },
    });
    const { data, error } = await client.rpc("loadlink_get_my_intelligence_state");
    if (error) throw error;
    return Response.json(data || { authenticated: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "LoadLink could not read your account status.";
    return Response.json({ error: message }, { status: 400 });
  }
}
