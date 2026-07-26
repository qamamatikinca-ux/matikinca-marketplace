import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    platform: "LoadLink",
    phase: 1,
    coreVersion: "2026.07-phase1-core",
    website: true,
    controlCentreBridge: true,
    notificationZeroStateTimeoutSeconds: 20,
    generatedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
