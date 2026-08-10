import type { NextRequest } from "next/server";
import { apiError, dealerServerClient, requireDealerContext } from "@/lib/dealer/server";
export async function GET(request: NextRequest) { try { const client = dealerServerClient(request); await requireDealerContext(client); const { data, error } = await client.rpc("loadlink_get_dealer_dashboard_summary"); if (error) throw error; return Response.json(data || {}); } catch (error) { return apiError(error); } }
