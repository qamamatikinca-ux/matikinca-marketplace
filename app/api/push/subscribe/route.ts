import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function clients() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !anon || !service) throw new Error("Push server environment is not configured.");
  return {
    auth: createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } }),
    admin: createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } }),
  };
}

export async function POST(request: NextRequest) {
  try {
    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
    if (!bearer) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const { auth, admin } = clients();
    const { data: { user }, error: userError } = await auth.auth.getUser(bearer);
    if (userError || !user) return NextResponse.json({ error: "Your session expired. Sign in again." }, { status: 401 });
    const body = await request.json();
    const endpoint = String(body?.endpoint || "").trim();
    const p256dh = String(body?.keys?.p256dh || "").trim();
    const authKey = String(body?.keys?.auth || "").trim();
    if (!endpoint || !p256dh || !authKey || endpoint.length > 3000) return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
    const { error } = await admin.from("loadlink_push_subscriptions").upsert({
      user_id: user.id,
      endpoint,
      p256dh,
      auth: authKey,
      user_agent: request.headers.get("user-agent")?.slice(0, 500) || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "endpoint" });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Push subscription failed." }, { status: 500 });
  }
}
