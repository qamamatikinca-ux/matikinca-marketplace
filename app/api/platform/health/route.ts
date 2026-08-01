import { NextResponse } from "next/server";
import { publicSupabase } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { ok: boolean; latencyMs?: number; note?: string }> = {};
  const started = Date.now();
  try {
    const client = publicSupabase();
    const before = Date.now();
    const result = await client.from("loadlink_public_listings").select("id", { head: true, count: "estimated" }).limit(1);
    checks.database = result.error
      ? { ok: false, latencyMs: Date.now() - before, note: "Public marketplace view unavailable" }
      : { ok: true, latencyMs: Date.now() - before };
  } catch {
    checks.database = { ok: false, note: "Supabase public configuration unavailable" };
  }

  checks.application = { ok: true, latencyMs: Date.now() - started };
  const ok = Object.values(checks).every((item) => item.ok);
  return NextResponse.json({ ok, service: "loadlink-marketplace", checks, timestamp: new Date().toISOString() }, {
    status: ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
