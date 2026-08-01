import { NextResponse } from "next/server";
import { requireAdmin, safeApiError } from "@/lib/server/supabase";

const ENTITY_TYPES = new Set(["dealership", "driver", "review", "case", "ticket", "fraud"]);

export async function POST(request: Request) {
  try {
    const { client } = await requireAdmin(request);
    const body = (await request.json()) as { entityType?: string; id?: string; decision?: string; reason?: string };
    const entityType = String(body.entityType || "");
    const id = String(body.id || "");
    const decision = String(body.decision || "");
    if (!ENTITY_TYPES.has(entityType) || !/^[0-9a-f-]{36}$/i.test(id) || !decision) {
      return NextResponse.json({ error: "Invalid administrative action." }, { status: 400 });
    }
    const result = await client.rpc("loadlink_review_marketplace_record", {
      p_entity_type: entityType,
      p_entity_id: id,
      p_decision: decision,
      p_reason: body.reason?.trim() || null,
    });
    if (result.error) throw result.error;
    return NextResponse.json({ updated: result.data === true });
  } catch (error) {
    const safe = safeApiError(error);
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
