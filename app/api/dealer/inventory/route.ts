import type { NextRequest } from "next/server";
import { apiError, dealerServerClient, requireDealerContext } from "@/lib/dealer/server";

export async function GET(request: NextRequest) {
  try {
    const client = dealerServerClient(request); await requireDealerContext(client); const sp=request.nextUrl.searchParams; const brochure=sp.get("brochure");
    if (brochure) { const {data,error}=await client.rpc("loadlink_dealer_vehicle_sheet",{p_listing_id:brochure}); if(error) throw error; return Response.json(data||{}); }
    const { data, error } = await client.rpc("loadlink_dealer_inventory_page", { p_page: Math.max(1,Number(sp.get("page")||1)), p_page_size: Math.min(100,Math.max(1,Number(sp.get("page_size")||20))), p_query: sp.get("q")||"", p_stock: sp.get("stock")||"all", p_publication: sp.get("publication")||"all", p_moderation: sp.get("moderation")||"all", p_sort: sp.get("sort")||"newest" }); if(error) throw error; return Response.json(data||{items:[],total:0,page:1,pages:1});
  } catch(error){return apiError(error)}
}
export async function POST(request: NextRequest) {
  try {
    const client=dealerServerClient(request); await requireDealerContext(client); const body=await request.json(); const action=String(body.action||"");
    if (["price","duplicate","sold","stock_number"].includes(action)) { const {data,error}=await client.rpc("loadlink_dealer_inventory_command",{p_action:action,p_payload:body}); if(error) throw error; return Response.json(data||{ok:true}); }
    const {data,error}=await client.rpc("loadlink_dealer_inventory_action",{p_action:action,p_listing_ids:Array.isArray(body.listing_ids)?body.listing_ids:[],p_value:body.value?String(body.value):null}); if(error) throw error; return Response.json(data||{ok:true});
  } catch(error){return apiError(error)}
}
