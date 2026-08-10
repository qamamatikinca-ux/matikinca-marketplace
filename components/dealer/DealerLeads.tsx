"use client";

import { useEffect, useMemo, useState } from "react";
import { dealerFetch, formatZar, relativeAge } from "@/lib/dealer/client";
import { LEAD_SOURCES, LEAD_STAGES, LOST_REASONS } from "@/lib/dealer/constants";
import type { DealerInventoryItem, DealerLead, DealerStaffMember, DealerWorkspaceState } from "@/lib/dealer/types";
import DealerSalesTools from "./DealerSalesTools";
import { EmptyState, Input, Modal, PrimaryButton, SectionHeading, Select, SecondaryButton, Surface, Textarea } from "./ui";

type LeadResponse = { items: DealerLead[]; total: number; page: number; pages: number };

export default function DealerLeads({ darkMode, context, inventory, staff }: { darkMode: boolean; context: DealerWorkspaceState; inventory: DealerInventoryItem[]; staff: DealerStaffMember[] }) {
  const [data, setData] = useState<LeadResponse>({ items: [], total: 0, page: 1, pages: 1 });
  const [stage, setStage] = useState("all");
  const [scope, setScope] = useState(context.role === "sales_agent" ? "mine" : "all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DealerLead | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", phone: "", email: "", source: "Walk-in", listing_id: "", budget: "", trade_in: false, finance_required: false, follow_up: "" });
  const [error, setError] = useState("");
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState(LOST_REASONS[0]);
  const [pendingStage, setPendingStage] = useState<string | null>(null);

  async function load(page = 1) {
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), stage, scope, q: query });
      const response = await dealerFetch<LeadResponse>(`/api/dealer/leads?${params}`);
      setData(response);
      if (selected) setSelected(response.items.find((item) => item.id === selected.id) || selected);
    } catch (e) { setError(e instanceof Error ? e.message : "Leads could not be loaded."); }
  }
  useEffect(() => { const t = setTimeout(() => void load(1), 250); return () => clearTimeout(t); }, [stage, scope, query]);

  async function mutate(action: string, payload: Record<string, unknown>) {
    setError("");
    try { await dealerFetch("/api/dealer/leads", { method: "POST", body: JSON.stringify({ action, ...payload }) }); await load(data.page); }
    catch (e) { setError(e instanceof Error ? e.message : "Lead could not be updated."); }
  }

  async function createLead() {
    if (!newLead.name.trim()) return;
    await mutate("create", newLead);
    setNewLead({ name: "", phone: "", email: "", source: "Walk-in", listing_id: "", budget: "", trade_in: false, finance_required: false, follow_up: "" }); setNewOpen(false);
  }

  const pipelineCounts = useMemo(() => LEAD_STAGES.map(([value, label]) => ({ value, label, count: data.items.filter((item) => item.status === value).length })), [data.items]);

  return <div className="grid gap-4">
    <Surface darkMode={darkMode} className="p-4 sm:p-5"><SectionHeading title="Sales pipeline" detail="LoadLink and external leads live in the same dealership workflow." action={<PrimaryButton type="button" onClick={() => setNewOpen(true)}>Add lead</PrimaryButton>} /><div className="mt-5 grid gap-2 md:grid-cols-[minmax(220px,1fr)_170px_150px]"><Input darkMode={darkMode} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customer, phone or vehicle" /><Select darkMode={darkMode} value={stage} onChange={(e) => setStage(e.target.value)}><option value="all">All stages</option>{LEAD_STAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select><Select darkMode={darkMode} value={scope} onChange={(e) => setScope(e.target.value)}><option value="all">All leads</option><option value="mine">My leads</option><option value="unassigned">Unassigned</option></Select></div></Surface>

    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">{pipelineCounts.map((item) => <button type="button" key={item.value} onClick={() => setStage(item.value)} className={`min-w-[126px] border px-3 py-3 text-left ${darkMode ? "border-white/10 bg-[#0c0c0c]" : "border-black/10 bg-white"}`}><div className="text-[10px] font-black uppercase tracking-[.1em] opacity-40">{item.label}</div><div className="mt-1 text-xl font-black">{item.count}</div></button>)}</div>

    {error ? <div className="border border-red-500/30 px-4 py-3 text-sm font-bold text-red-500">{error}</div> : null}
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,.9fr)]">
      <Surface darkMode={darkMode} className="overflow-hidden">{data.items.length ? <div className="divide-y divide-current/10">{data.items.map((lead) => <button type="button" key={lead.id} onClick={() => setSelected(lead)} className={`w-full px-4 py-4 text-left transition sm:px-5 ${selected?.id === lead.id ? darkMode ? "bg-white/[.06]" : "bg-black/[.035]" : "hover:bg-current/[.02]"}`}><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-black">{lead.customer_name || "Customer"}</span>{lead.priority === "high" ? <span className="rounded-full border border-current/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-[.1em]">High activity</span> : null}</div><div className="mt-1 truncate text-sm opacity-55">{lead.listing_title || "No vehicle selected"} · {lead.source}</div><div className="mt-2 text-xs opacity-55">{lead.assigned_name ? `Assigned to ${lead.assigned_name}` : "Unassigned"}{lead.next_follow_up_at ? ` · Follow-up ${new Date(lead.next_follow_up_at).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}</div>{lead.activity_reason ? <div className="mt-2 text-xs font-bold">{lead.activity_reason}</div> : null}</div><div className="shrink-0 text-right"><div className="text-[10px] font-black uppercase tracking-[.1em] opacity-50">{lead.status.replaceAll("_", " ")}</div><div className="mt-2 text-xs opacity-45">{relativeAge(lead.last_activity_at || lead.created_at)}</div>{lead.budget_amount ? <div className="mt-1 text-xs font-black">{formatZar(lead.budget_amount)}</div> : null}</div></div></button>)}</div> : <EmptyState title="No leads found" detail="LoadLink enquiries and leads your sales team adds manually will appear here." action={<PrimaryButton type="button" onClick={() => setNewOpen(true)}>Add lead</PrimaryButton>} />}</Surface>

      <div className="grid content-start gap-4">{selected ? <><Surface darkMode={darkMode} className="p-4 sm:p-5"><SectionHeading title="Lead actions" detail="Keep every follow-up, assignment and stage change attached to the customer." /><div className="mt-4 grid gap-2 sm:grid-cols-2"><Select darkMode={darkMode} value={pendingStage || selected.status} onChange={(e) => { const value = e.target.value; if (value === "lost") { setPendingStage(value); setLostReason(LOST_REASONS[0]); setLostOpen(true); return; } setPendingStage(null); void mutate("stage", { lead_id: selected.id, status: value }); }}>{LEAD_STAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select><Select darkMode={darkMode} value={selected.assigned_to || ""} onChange={(e) => void mutate("assign", { lead_id: selected.id, user_id: e.target.value || null })}><option value="">Unassigned</option>{staff.filter((member) => member.is_active && ["owner", "manager", "sales_agent"].includes(member.role)).map((member) => <option key={member.id} value={member.user_id || ""}>{member.name || member.email || member.role}</option>)}</Select></div><div className="mt-2 grid gap-2 sm:grid-cols-2"><SecondaryButton darkMode={darkMode} type="button" onClick={() => mutate("follow_up", { lead_id: selected.id, preset: "tomorrow", follow_up_type: "call" })}>Follow up tomorrow</SecondaryButton><SecondaryButton darkMode={darkMode} type="button" onClick={() => mutate("priority", { lead_id: selected.id, priority: selected.priority === "high" ? "normal" : "high" })}>{selected.priority === "high" ? "Normal priority" : "Mark high priority"}</SecondaryButton></div></Surface><DealerSalesTools darkMode={darkMode} selectedLead={selected} inventory={inventory} /><AlternativeStock darkMode={darkMode} lead={selected} /></> : <DealerSalesTools darkMode={darkMode} selectedLead={null} inventory={inventory} />}</div>
    </div>

    <div className="flex justify-end gap-2"><SecondaryButton darkMode={darkMode} type="button" disabled={data.page <= 1} onClick={() => load(data.page - 1)}>Previous</SecondaryButton><SecondaryButton darkMode={darkMode} type="button" disabled={data.page >= data.pages} onClick={() => load(data.page + 1)}>Next</SecondaryButton></div>

    <Modal open={newOpen} onClose={() => setNewOpen(false)} darkMode={darkMode} title="Add lead">
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-black">Customer name<Input darkMode={darkMode} className="mt-1" value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} /></label><label className="text-xs font-black">Source<Select darkMode={darkMode} className="mt-1" value={newLead.source} onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}>{LEAD_SOURCES.map((source) => <option key={source}>{source}</option>)}</Select></label><label className="text-xs font-black">Phone<Input darkMode={darkMode} className="mt-1" inputMode="tel" value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} /></label><label className="text-xs font-black">Email<Input darkMode={darkMode} className="mt-1" type="email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} /></label><label className="text-xs font-black sm:col-span-2">Vehicle<Select darkMode={darkMode} className="mt-1" value={newLead.listing_id} onChange={(e) => setNewLead({ ...newLead, listing_id: e.target.value })}><option value="">Not selected</option>{inventory.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</Select></label><label className="text-xs font-black">Budget<Input darkMode={darkMode} className="mt-1" inputMode="decimal" value={newLead.budget} onChange={(e) => setNewLead({ ...newLead, budget: e.target.value })} /></label><label className="text-xs font-black">First follow-up<Input darkMode={darkMode} className="mt-1" type="datetime-local" value={newLead.follow_up} onChange={(e) => setNewLead({ ...newLead, follow_up: e.target.value })} /></label></div><div className="mt-3 flex flex-wrap gap-4 text-sm font-bold"><label><input type="checkbox" className="mr-2" checked={newLead.trade_in} onChange={(e) => setNewLead({ ...newLead, trade_in: e.target.checked })} />Trade-in</label><label><input type="checkbox" className="mr-2" checked={newLead.finance_required} onChange={(e) => setNewLead({ ...newLead, finance_required: e.target.checked })} />Finance required</label></div><div className="mt-5 flex justify-end"><PrimaryButton type="button" onClick={createLead}>Add to pipeline</PrimaryButton></div>
    </Modal>
    <Modal open={lostOpen} onClose={() => { setLostOpen(false); setPendingStage(null); }} darkMode={darkMode} title="Why was this lead lost?">
      <p className="text-sm opacity-55">Recording the reason keeps dealership conversion reports useful.</p>
      <label className="mt-4 block text-xs font-black">Reason<Select darkMode={darkMode} className="mt-1" value={lostReason} onChange={(e) => setLostReason(e.target.value)}>{LOST_REASONS.map((reason) => <option key={reason}>{reason}</option>)}</Select></label>
      <div className="mt-5 flex justify-end gap-2"><SecondaryButton darkMode={darkMode} type="button" onClick={() => { setLostOpen(false); setPendingStage(null); }}>Cancel</SecondaryButton><PrimaryButton type="button" onClick={() => { if (!selected) return; setLostOpen(false); setPendingStage(null); void mutate("stage", { lead_id: selected.id, status: "lost", lost_reason: lostReason }); }}>Mark lost</PrimaryButton></div>
    </Modal>
  </div>;
}

function AlternativeStock({ darkMode, lead }: { darkMode: boolean; lead: DealerLead }) {
  const [items, setItems] = useState<DealerInventoryItem[]>([]);
  useEffect(() => { if (!lead.id) return; void dealerFetch<{ items: DealerInventoryItem[] }>(`/api/dealer/leads?lead_id=${lead.id}&alternatives=1`).then((r) => setItems(r.items || [])).catch(() => setItems([])); }, [lead.id]);
  if (!items.length) return null;
  return <Surface darkMode={darkMode} className="overflow-hidden"><div className="border-b border-current/10 px-4 py-3"><SectionHeading title="Alternative stock" detail="Available vehicles that may fit this customer if the first option does not." /></div><div className="divide-y divide-current/10">{items.slice(0, 3).map((item) => <div key={item.id} className="flex items-center gap-3 px-4 py-3"><div className="min-w-0 flex-1"><div className="truncate text-sm font-black">{item.title}</div><div className="mt-1 text-xs opacity-50">{formatZar(item.price_amount)} · {item.city}</div></div><button type="button" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/vehicles/${item.id}`)} className="text-xs font-black">Copy link</button></div>)}</div></Surface>;
}
