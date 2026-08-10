import type { NextRequest } from "next/server";
import { apiError, dealerServerClient, requireDealerContext } from "@/lib/dealer/server";
export async function POST(request: NextRequest) { try { const client = dealerServerClient(request); await requireDealerContext(client); const body = await request.json(); const { data, error } = await client.rpc("loadlink_dealer_support_case", { p_category: String(body.category || "other"), p_message: String(body.message || "") }); if (error) throw error; return Response.json(data || { ok: true }); } catch (error) { return apiError(error); } }
