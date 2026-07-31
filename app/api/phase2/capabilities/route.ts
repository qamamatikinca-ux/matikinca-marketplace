import { NextResponse } from "next/server";
import { bearer, publicSupabase, safeError } from "@/lib/phase2/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const token = bearer(request);
    const { data, error } = await publicSupabase(token ?? undefined).rpc("loadlink_marketplace_capabilities");
    if (error) throw error;
    return NextResponse.json(data ?? { canBrowse: true, canLogin: true, canCall: true, canPost: true, canMessage: true });
  } catch (error) {
    return NextResponse.json(safeError(error), { status: 500 });
  }
}
