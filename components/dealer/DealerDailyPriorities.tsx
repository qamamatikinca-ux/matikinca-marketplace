"use client";
import LoadLinkIcon from "@/components/LoadLinkIcon";
import { dealerPriorities } from "@/lib/dealer/priorities";
import type { DealerInventoryItem, DealerSection, DealerSummary, DealerWorkspaceState } from "@/lib/dealer/types";
export default function DealerDailyPriorities({summary,inventory,context,setSection}:{summary:DealerSummary;inventory:DealerInventoryItem[];context:DealerWorkspaceState;setSection:(section:DealerSection)=>void}){
 const priorities=dealerPriorities(summary,inventory,context);
 return <section className="ll-dealer-priorities"><div className="ll-section-heading"><div><p className="ll-eyebrow">Your next steps</p><h2>Today’s priorities</h2></div><span>From your current workspace data</span></div>{priorities.length?<div className="ll-priority-grid">{priorities.map((item,index)=><button type="button" key={item.id} onClick={()=>setSection(item.section)}><span className="ll-priority-number">{String(index+1).padStart(2,"0")}</span><span><strong>{item.title}</strong><span>{item.detail}</span><b>{item.label}<LoadLinkIcon name="chevronRight" size={15}/></b></span></button>)}</div>:<p className="ll-priority-empty">No priority actions in the current data. Continue managing your stock, customers and showroom using the workspace tools.</p>}<p className="ll-priority-footnote">Stock checks cover the latest {inventory.length} loaded vehicles. Open Inventory for the full stock list.</p></section>
}
