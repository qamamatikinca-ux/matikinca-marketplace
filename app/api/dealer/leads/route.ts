import type { NextRequest } from "next/server";
import { apiError, dealerServerClient, requireDealerContext } from "@/lib/dealer/server";
export async function GET(request: NextRequest) {
  try { const client = dealerServerClient(request); await requireDealerContext(client); const sp = request.nextUrl.searchParams; if (sp.get("alternatives") === "1" && sp.get("lead_id")) { const { data, error } = await client.rpc("loadlink_dealer_alternative_stock", { p_lead_id: sp.get("lead_id") }); if (error) throw error; return Response.json({ items: data || [] }); }
    const { data, error } = await client.rpc("loadlink_dealer_leads_page", { p_page: Math.max(1, Number(sp.get("page") || 1)), p_page_size: Math.min(50, Math.max(1, Number(sp.get("page_size") || 25))), p_stage: sp.get("stage") || "all", p_scope: sp.get("scope") || "all", p_query: sp.get("q") || "" }); if (error) throw error; return Response.json(data || { items: [], total: 0, page: 1, pages: 1 });
  } catch (error) { return apiError(error); }
}
export async function POST(request: NextRequest) { try { const client = dealerServerClient(request); await requireDealerContext(client); const body = await request.json(); const { data, error } = await client.rpc("loadlink_dealer_lead_action", { p_action: String(body.action || ""), p_payload: body }); if (error) throw error; return Response.json(data || { ok: true }); } catch (error) { return apiError(error); } }
