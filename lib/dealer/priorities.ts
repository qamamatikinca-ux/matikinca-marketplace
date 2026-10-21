import type { DealerInventoryItem, DealerSection, DealerSummary, DealerWorkspaceState } from "./types";
export type DealerPriority = {id:string;title:string;detail:string;label:string;section:DealerSection;rank:number};
export function dealerPriorities(summary:DealerSummary,inventory:DealerInventoryItem[],context:DealerWorkspaceState):DealerPriority[]{
  const items:DealerPriority[]=[];
  const can=(permission:string)=>context.permissions.includes(permission as typeof context.permissions[number]);
  if(can("leads.read")&&summary.overdue_followups>0)items.push({id:"follow-ups",title:`${summary.overdue_followups} overdue follow-up${summary.overdue_followups===1?"":"s"}`,detail:"Return to the sales pipeline and agree the next action with each customer.",label:"Open sales pipeline",section:"leads",rank:1});
  if(can("messages.read")&&summary.unread_messages>0)items.push({id:"inbox",title:`${summary.unread_messages} unread message${summary.unread_messages===1?"":"s"}`,detail:"Reply to customer enquiries while their interest is current.",label:"Open inbox",section:"messages",rank:2});
  if(can("verification.read")&&context.verification_status!=="approved")items.push({id:"verification",title:"Complete business verification",detail:context.verification_status==="changes_required"?"Read the review feedback and replace the requested evidence.":"Check the current review status and any required documents.",label:"Review verification",section:"verification",rank:3});
  if(can("billing.read")&&["past_due","grace_period","expired","payment_pending"].includes(context.subscription_status))items.push({id:"billing",title:"Check dealership access",detail:"Review the payment or subscription status before publishing new stock.",label:"Open billing",section:"billing",rank:3});
  if(can("leads.read")&&summary.new_leads>0)items.push({id:"leads",title:`${summary.new_leads} new lead${summary.new_leads===1?"":"s"}`,detail:"Assign an owner and record the first customer follow-up.",label:"Review new leads",section:"leads",rank:4});
  const needingChanges=inventory.filter(item=>item.stock_status!=="sold"&&["changes_required","rejected"].includes(item.moderation_status));
  if(can("inventory.read")&&needingChanges.length)items.push({id:"stock-review",title:`${needingChanges.length} loaded vehicle${needingChanges.length===1?"":"s"} need changes`,detail:"Read the review reason, correct the listing and resubmit for approval.",label:"Review inventory",section:"inventory",rank:5});
  const ageing=inventory.filter(item=>item.stock_status==="available"&&item.lifecycle_status==="live"&&item.days_in_stock>=60);
  if(can("inventory.read")&&ageing.length)items.push({id:"stock-age",title:`${ageing.length} loaded vehicle${ageing.length===1?" has":"s have"} been in stock 60+ days`,detail:"Compare enquiries, pricing and photo quality before deciding the next move.",label:"Review ageing stock",section:"inventory",rank:6});
  if(can("leads.read")&&summary.quotes_open>0)items.push({id:"quotes",title:`${summary.quotes_open} open quote${summary.quotes_open===1?"":"s"}`,detail:"Check outstanding proposals in Sales tools and follow up with the customer.",label:"Open sales tools",section:"leads",rank:7});
  return items.sort((a,b)=>a.rank-b.rank).slice(0,6);
}
