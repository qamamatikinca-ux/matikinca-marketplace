import type { NextRequest } from "next/server";
import { apiError, dealerServerClient, requireDealerContext } from "@/lib/dealer/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { try { const client=dealerServerClient(request); await requireDealerContext(client); const q=new URL(request.url).searchParams.get("q")||""; const { data,error }=await client.rpc("loadlink_dealer_global_search",{p_query:q}); if(error)throw error; return Response.json({items:data||[]}); } catch(e){ return apiError(e); } }
