import type { NextRequest } from "next/server";
import { apiError, dealerServerClient } from "@/lib/dealer/server";

export async function GET(request: NextRequest) {
  try {
    const client = dealerServerClient(request);
    const token = request.nextUrl.searchParams.get("token") || "";
    const { data, error } = await client.rpc("loadlink_public_dealer_quote", { p_token: token });
    if (error) throw error;
    return Response.json(data || {});
  } catch (error) {
    return apiError(error);
  }
}
