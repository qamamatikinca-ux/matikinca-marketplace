import type { NextRequest } from "next/server";
import { apiError, dealerServerClient, requireDealerContext } from "@/lib/dealer/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { try { const client=dealerServerClient(request); await requireDealerContext(client); const { data,error }=await client.rpc("loadlink_dealer_settings_get"); if(error)throw error; return Response.json(data||{}); } catch(e){ return apiError(e); } }
export async function POST(request: NextRequest) { try { const client=dealerServerClient(request); await requireDealerContext(client); const body=await request.json(); const { data,error }=await client.rpc("loadlink_dealer_settings_action",{p_action:String(body.action||""),p_payload:body}); if(error)throw error; return Response.json(data||{ok:true}); } catch(e){ return apiError(e); } }
