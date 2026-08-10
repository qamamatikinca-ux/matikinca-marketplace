import type { NextRequest } from "next/server";
import { apiError, dealerServerClient, requireDealerContext } from "@/lib/dealer/server";
export async function GET(request: NextRequest) {
  try {
    const client = dealerServerClient(request); await requireDealerContext(client);
    const maintenance = await client.rpc("loadlink_dealer_maintenance"); if (maintenance.error) throw maintenance.error;
    const { data, error } = await client.rpc("loadlink_dealer_intelligence"); if (error) throw error;
    return Response.json({ items: data || [] });
  } catch (error) { return apiError(error); }
}
