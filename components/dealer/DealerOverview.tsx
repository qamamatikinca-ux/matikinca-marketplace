"use client";

import { useEffect, useMemo, useState } from "react";
import type { DealerAppointment, DealerInsight, DealerInventoryItem, DealerLead, DealerSection, DealerStatus, DealerSummary, DealerWorkspaceState } from "@/lib/dealer/types";
import { dealerFetch, relativeAge } from "@/lib/dealer/client";
import DealerStatusComposer from "./DealerStatusComposer";
import { EmptyState, SectionHeading, Surface } from "./ui";

export default function DealerOverview({ darkMode, context, summary, leads, appointments, insights, inventory, setSection, onRefresh }: {
  darkMode: boolean; context: DealerWorkspaceState; summary: DealerSummary; leads: DealerLead[]; appointments: DealerAppointment[];
  insights: DealerInsight[]; inventory: DealerInventoryItem[]; setSection: (section: DealerSection) => void; onRefresh: () => void | Promise<void>;
}) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [statuses, setStatuses] = useState<DealerStatus[]>([]);
  const [statusLoading, setStatusLoading] = useState(true);

  async function loadStatuses() {
    try { const data = await dealerFetch<{items: DealerStatus[]}>("/api/dealer/statuses"); setStatuses(data.items || []); }
    catch { setStatuses([]); }
    finally { setStatusLoading(false); }
  }
  useEffect(() => { void loadStatuses(); }, []);

  const highLeads = leads.filter((lead) => lead.priority === "high" && !["won", "lost"].includes(lead.status));
  const overdue = leads.filter((lead) => lead.next_follow_up_at && new Date(lead.next_follow_up_at).getTime() < Date.now() && !["won", "lost"].includes(lead.status));
  const priorities = [...overdue, ...highLeads.filter((lead) => !overdue.some((item) => item.id === lead.id)), ...leads].filter((value, index, array) => array.findIndex((item) => item.id === value.id) === index).slice(0, 3);
  const latest = statuses[0] || null;
  const live = statuses.filter((item) => item.publication_status === "published" && new Date(item.expires_at).getTime() > Date.now());
  const attention = useMemo(() => {
    const items: Array<{ label: string; detail: string; section: DealerSection }> = [];
    if (summary.overdue_followups) items.push({ label: "Follow-ups", detail: `${summary.overdue_followups} overdue`, section: "leads" });
    const stockIssues = insights.filter((item) => item.kind === "inventory").length;
    if (stockIssues) items.push({ label: "Stock", detail: `${stockIssues} need attention`, section: "inventory" });
    if (context.verification_status === "changes_required") items.push({ label: "Verification", detail: "Changes required", section: "verification" });
    return items;
  }, [context.verification_status, insights, summary.overdue_followups]);

  async function statusDone() { setStatusLoading(true); await Promise.all([Promise.resolve(onRefresh()), loadStatuses()]); }

  return <div className="grid gap-3 sm:gap-4">
    <DealerStatusComposer darkMode={darkMode} open={statusOpen} onClose={() => setStatusOpen(false)} inventory={inventory} context={context} onDone={() => void statusDone()} />

    <section className={`overflow-hidden rounded-2xl border ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/[.08] bg-white"}`}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div><div className="text-[10px] font-black uppercase tracking-[.11em] opacity-35">Today</div><h2 className="mt-1.5 text-[24px] font-black tracking-[-.04em]">Dealership</h2><p className="mt-1 text-[13px] opacity-50">Sales, stock and customers in one place.</p></div>
          <button type="button" onClick={() => setStatusOpen(true)} className="h-10 shrink-0 rounded-lg bg-[#f6b800] px-4 text-[12px] font-black text-black">Post Status</button>
        </div>
      </div>
      <div className="grid grid-cols-4 border-t border-current/10">
        <TopStat label="Stock" value={summary.live_stock}/><TopStat label="Leads" value={summary.new_leads} attention={summary.new_leads>0}/><TopStat label="Follow-ups" value={summary.overdue_followups} attention={summary.overdue_followups>0}/><TopStat label="Inbox" value={summary.unread_messages} attention={summary.unread_messages>0}/>
      </div>
    </section>

    <div className="grid gap-3 lg:grid-cols-[1.05fr_.95fr]">
      <Surface darkMode={darkMode} className="overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-current/10 px-4 py-3.5 sm:px-5"><SectionHeading title="Latest Status" detail={live.length ? `${live.length} live now` : "What customers see from your dealership."}/><button type="button" onClick={()=>setSection("marketing")} className="text-[11px] font-black opacity-50">All Status →</button></div>
        {statusLoading ? <div className="p-6 text-sm font-bold opacity-40">Loading Status…</div> : latest ? <StatusPreview item={latest} darkMode={darkMode}/> : <EmptyState title="No Status yet" detail="Post a photo, video, vehicle, offer or dealership update. It will appear here immediately." action={<button type="button" onClick={()=>setStatusOpen(true)} className="rounded-lg bg-[#f6b800] px-4 py-2.5 text-xs font-black text-black">Post first Status</button>}/>} 
      </Surface>

      <Surface darkMode={darkMode} className="overflow-hidden rounded-2xl">
        <div className="border-b border-current/10 px-4 py-3.5 sm:px-5"><SectionHeading title="Do something" detail="The actions used most."/></div>
        <div className="grid grid-cols-2">
          <Action title="Add vehicle" detail="Add new stock" onClick={()=>window.location.assign(`/list-your-vehicle?plan=dealer&dealership=${context.dealership_id}`)}/>
          <Action title="Work leads" detail={`${summary.new_leads} new`} onClick={()=>setSection("leads")}/>
          <Action title="Edit dealer page" detail="Bio, photos, contact" onClick={()=>setSection("showroom")}/>
          <Action title="Messages" detail={`${summary.unread_messages} unread`} onClick={()=>setSection("messages")}/>
        </div>
      </Surface>
    </div>

    <div className="grid gap-3 lg:grid-cols-[1.05fr_.95fr]">
      <Surface darkMode={darkMode} className="overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-current/10 px-4 py-3.5 sm:px-5"><SectionHeading title="Next" detail="Viewings and follow-ups."/><button type="button" onClick={()=>setSection("leads")} className="text-[11px] font-black opacity-50">Sales →</button></div>
        {appointments.length || priorities.length ? <div className="divide-y divide-current/10">{appointments.slice(0,2).map(item=><div key={item.id} className="px-4 py-3.5 sm:px-5"><div className="text-sm font-black">{item.customer_name||"Customer viewing"}</div><div className="mt-1 text-xs opacity-45">{item.listing_title||item.appointment_type} · {new Date(item.starts_at).toLocaleTimeString("en-ZA",{hour:"2-digit",minute:"2-digit"})}</div></div>)}{priorities.map(lead=><button key={lead.id} type="button" onClick={()=>setSection("leads")} className="w-full px-4 py-3.5 text-left sm:px-5"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-black">{lead.customer_name||"Customer follow-up"}</div><div className="mt-1 truncate text-xs opacity-45">{lead.listing_title||lead.source}</div></div><span className="text-xs font-black opacity-35">{relativeAge(lead.last_activity_at||lead.created_at)}</span></div></button>)}</div> : <EmptyState title="Nothing waiting" detail="New viewings and follow-ups will appear here."/>}
      </Surface>

      <Surface darkMode={darkMode} className="overflow-hidden rounded-2xl">
        <div className="border-b border-current/10 px-4 py-3.5 sm:px-5"><SectionHeading title="Dealership page" detail="Your public LoadLink presence."/></div>
        <div className="p-4 sm:p-5"><div className="grid grid-cols-2 gap-2 text-center"><Mini label="Followers" value={summary.followers}/><Mini label="Status live" value={live.length}/></div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={()=>setSection("showroom")} className="min-h-10 rounded-lg border border-current/10 px-3 text-xs font-black">Edit page</button><button type="button" onClick={()=>window.open(`/dealership/${context.slug}`,"_blank")} className="min-h-10 rounded-lg border border-current/10 px-3 text-xs font-black">View public page</button></div></div>
      </Surface>
    </div>

    {attention.length ? <Surface darkMode={darkMode} className="overflow-hidden rounded-2xl"><div className="border-b border-current/10 px-4 py-3.5 sm:px-5"><SectionHeading title="Needs attention"/></div><div className="grid sm:grid-cols-3">{attention.map(item=><button key={item.label} type="button" onClick={()=>setSection(item.section)} className="border-b border-current/10 p-4 text-left sm:border-r"><div className="text-[10px] font-black uppercase tracking-[.09em] opacity-35">{item.label}</div><div className="mt-2 text-sm font-black">{item.detail}</div></button>)}</div></Surface> : null}
  </div>;
}

function StatusPreview({item,darkMode}:{item:DealerStatus;darkMode:boolean}) {
  const complete = item.views ? Math.round((item.completed_views/item.views)*100) : 0;
  const ended = new Date(item.expires_at).getTime() <= Date.now() || ["expired","removed"].includes(item.publication_status);
  return <div className="p-4 sm:p-5"><div className="flex gap-3">{item.media_url ? <div className={`h-24 w-20 shrink-0 overflow-hidden rounded-lg ${darkMode?"bg-white/[.04]":"bg-black/[.04]"}`}>{item.content_type==="video"?<video src={item.media_url} muted playsInline preload="metadata" className="h-full w-full object-cover"/>:<img src={item.media_url} alt="" className="h-full w-full object-cover"/>}</div>:<div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-lg border border-current/10 text-[10px] font-black uppercase opacity-45">{item.content_type}</div>}<div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${ended?"bg-current opacity-25":item.publication_status==="published"?"bg-emerald-500":"bg-[#f6b800]"}`}/><span className="text-[10px] font-black uppercase tracking-[.08em] opacity-45">{ended?"Ended":item.publication_status.replaceAll("_"," ")}</span></div><h3 className="mt-2 truncate text-base font-black">{item.title||item.listing_title||`${item.content_type} Status`}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 opacity-50">{item.body||"Live dealership Status"}</p></div></div><div className="mt-4 grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-current/10 bg-current/10"><Stat value={item.views} label="Views"/><Stat value={`${complete}%`} label="Watched"/><Stat value={item.vehicle_opens} label="Opens"/><Stat value={item.messages_generated} label="Leads"/></div></div>;
}
function TopStat({label,value,attention}:{label:string;value:number;attention?:boolean}) { return <div className="border-r border-current/10 px-2 py-3 text-center"><div className="flex items-center justify-center gap-1.5 text-[9px] font-black uppercase opacity-35">{attention?<span className="h-1.5 w-1.5 rounded-full bg-[#f6b800]"/>:null}{label}</div><div className="mt-1 text-xl font-black">{value}</div></div>; }
function Stat({value,label}:{value:string|number;label:string}) { return <div className="bg-inherit px-2 py-2.5 text-center"><div className="text-sm font-black">{value}</div><div className="mt-0.5 text-[9px] font-bold uppercase opacity-35">{label}</div></div>; }
function Action({title,detail,onClick}:{title:string;detail:string;onClick:()=>void}) { return <button type="button" onClick={onClick} className="min-h-[96px] border-b border-r border-current/10 p-4 text-left transition hover:bg-current/[.03]"><div className="text-sm font-black">{title}</div><div className="mt-1 text-xs opacity-45">{detail}</div></button>; }
function Mini({label,value}:{label:string;value:number}) { return <div className="rounded-lg border border-current/10 p-3"><div className="text-xl font-black">{value}</div><div className="mt-1 text-[9px] font-black uppercase opacity-35">{label}</div></div>; }
