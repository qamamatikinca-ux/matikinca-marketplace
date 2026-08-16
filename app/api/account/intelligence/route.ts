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

    const [stateResult, vehicleAccessResult] = await Promise.all([
      client.rpc("loadlink_get_my_intelligence_state"),
      client.rpc("loadlink_get_vehicle_listing_access"),
    ]);

    if (stateResult.error) throw stateResult.error;

    const state = (stateResult.data || { authenticated: false }) as Record<string, any>;
    const access = vehicleAccessResult.error ? null : (vehicleAccessResult.data as Record<string, any> | null);

    if (state.authenticated && access) {
      const capabilities = { ...(state.capabilities || {}) };
      if (Boolean(access.allowed)) capabilities.can_post_vehicle = true;
      if (Number.isFinite(Number(access.photo_limit))) capabilities.image_limit = Number(access.photo_limit);
      if (access.daily_message_limit === null) capabilities.daily_message_limit = null;
      else if (Number.isFinite(Number(access.daily_message_limit))) capabilities.daily_message_limit = Number(access.daily_message_limit);
      if (typeof access.analytics_enabled === "boolean") capabilities.analytics = access.analytics_enabled;
      state.capabilities = capabilities;
      state.vehicle_listing_access = access;
    }

    return Response.json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "LoadLink could not read your account status.";
    return Response.json({ error: message }, { status: 400 });
  }
}
