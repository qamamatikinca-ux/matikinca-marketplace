import type { NextRequest } from "next/server";
import { apiError, dealerServerClient, requireDealerContext } from "@/lib/dealer/server";

export async function GET(request: NextRequest) {
  try {
    const client = dealerServerClient(request);
    await requireDealerContext(client);
    const sp = request.nextUrl.searchParams;
    const thread = sp.get("thread");
    if (thread) {
      const { data, error } = await client.rpc("loadlink_dealer_thread_messages", { p_thread_id: thread, p_limit: 250 });
      if (error) throw error;
      return Response.json({ items: data || [] });
    }
    const { data, error } = await client.rpc("loadlink_dealer_message_threads", { p_folder: sp.get("folder") || "inbox", p_query: sp.get("q") || "" });
    if (error) throw error;
    return Response.json({ items: data || [] });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const client = dealerServerClient(request);
    await requireDealerContext(client);
    const body = await request.json();
    if (body.action !== "send") throw new Error("Unsupported message action");
    const { data, error } = await client.rpc("loadlink_dealer_send_message", { p_thread_id: body.thread_id, p_body: body.body || "" });
    if (error) throw error;
    return Response.json(data || { ok: true });
  } catch (error) { return apiError(error); }
}
