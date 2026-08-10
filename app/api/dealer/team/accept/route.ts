import type { NextRequest } from "next/server";
import { apiError, dealerServerClient } from "@/lib/dealer/server";
export async function POST(request: NextRequest) {
  try {
    const client = dealerServerClient(request); const body = await request.json();
    const { data, error } = await client.rpc("loadlink_accept_dealer_staff_invitation_token", { p_token: String(body.token || "") });
    if (error) throw error; return Response.json(data || { ok: true });
  } catch (error) { return apiError(error); }
}
