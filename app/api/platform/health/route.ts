import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json({
    ok: true,
    service: "loadlink-public-platform",
    supabaseConfigured: isSupabaseConfigured,
    timestamp: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
