import type { NextRequest } from "next/server";
import { apiError, dealerServerClient, requireDealerContext } from "@/lib/dealer/server";

export async function GET(request: NextRequest) {
  try {
    const client = dealerServerClient(request);
    await requireDealerContext(client);
    const { data, error } = await client.rpc("loadlink_dealer_update_list");
    if (error) throw error;
    return Response.json({ items: data || [] });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const client = dealerServerClient(request);
    await requireDealerContext(client);
    const body = await request.json();
    const { data, error } = await client.rpc("loadlink_dealer_update_action", {
      p_action: String(body.action || ""),
      p_payload: body,
    });
    if (error) throw error;
    return Response.json(data || { ok: true });
  } catch (error) { return apiError(error); }
}
