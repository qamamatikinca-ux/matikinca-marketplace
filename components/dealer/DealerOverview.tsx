"use client";

import type {
  DealerAppointment,
  DealerInsight,
  DealerInventoryItem,
  DealerLead,
  DealerSection,
  DealerSummary,
  DealerWorkspaceState,
} from "@/lib/dealer/types";
import { relativeAge } from "@/lib/dealer/client";
import { Surface } from "./ui";

export default function DealerOverview(props: {
  darkMode: boolean;
  context: DealerWorkspaceState;
  summary: DealerSummary;
  leads: DealerLead[];
  appointments: DealerAppointment[];
  insights: DealerInsight[];
  inventory: DealerInventoryItem[];
  setSection: (section: DealerSection) => void;
  onRefresh?: () => unknown;
}) {
  const { darkMode, context, summary, leads, appointments, insights, inventory, setSection } = props;
  const muted = darkMode ? "text-white/48" : "text-black/48";
  const soft = darkMode ? "border-white/10 bg-white/[.035]" : "border-black/[.07] bg-[#f7f6f2]";

  const overdueLeads = leads.filter((lead) => {
    if (!lead.next_follow_up_at || ["won", "lost"].includes(lead.status)) return false;
    return new Date(lead.next_follow_up_at).getTime() < Date.now();
  });

  const priorityLeads = [...overdueLeads, ...leads]
    .filter((lead, index, all) => all.findIndex((item) => item.id === lead.id) === index)
    .slice(0, 4);

  const stockNeedsAttention = inventory.filter(
    (item) => item.moderation_status === "changes_required" || item.moderation_status === "rejected" || item.completion_score < 70,
  );

  const attention: Array<{ title: string; detail: string; section: DealerSection; urgent?: boolean }> = [];
  if (summary.unread_messages > 0) attention.push({ title: "Unread enquiries", detail: `${summary.unread_messages} conversation${summary.unread_messages === 1 ? "" : "s"} waiting`, section: "messages", urgent: true });
  if (summary.overdue_followups > 0) attention.push({ title: "Follow-ups overdue", detail: `${summary.overdue_followups} customer${summary.overdue_followups === 1 ? "" : "s"} need a response`, section: "leads", urgent: true });
  if (stockNeedsAttention.length > 0) attention.push({ title: "Stock needs attention", detail: `${stockNeedsAttention.length} listing${stockNeedsAttention.length === 1 ? "" : "s"} need changes or more information`, section: "inventory" });
  if (context.verification_status === "changes_required") attention.push({ title: "Dealership verification", detail: "LoadLink needs changes before your dealership can be fully approved", section: "verification", urgent: true });
  if (context.subscription_status === "past_due") attention.push({ title: "Plan payment", detail: "Payment attention is required to keep Dealer access uninterrupted", section: "billing", urgent: true });

  const usefulInsights = insights.filter((item) => item.severity !== "insight" || item.kind === "sales").slice(0, 3);
  const totalStock = Number(summary.live_stock || 0) + Number(summary.draft_stock || 0) + Number(summary.pending_stock || 0) + Number(summary.reserved_stock || 0);

  return (
    <div className="grid gap-4" data-loadlink-dealer-home="simple-v1">
      <section className={`rounded-[26px] border p-5 sm:p-6 ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className={`text-[10px] font-black uppercase tracking-[.14em] ${muted}`}>Today</p>
            <h2 className="mt-2 text-[30px] font-black tracking-[-.055em] sm:text-[38px]">Your dealership at a glance.</h2>
            <p className={`mt-2 max-w-xl text-sm font-semibold leading-6 ${muted}`}>Start with what needs attention, then move into stock, leads or messages.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => window.location.assign(`/list-your-vehicle?entry=vehicle&dealership=${context.dealership_id}`)} className="min-h-11 rounded-full bg-[#f6b800] px-5 text-[11px] font-black text-black">Add vehicle</button>
            <button type="button" onClick={() => setSection("leads")} className="min-h-11 rounded-full border border-current/15 px-5 text-[11px] font-black">Open leads</button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Metric label="Live stock" value={summary.live_stock} detail={`${totalStock} total`} onClick={() => setSection("inventory")} darkMode={darkMode} />
          <Metric label="New leads" value={summary.new_leads} detail={`${summary.leads_30d || 0} in 30 days`} onClick={() => setSection("leads")} darkMode={darkMode} active={summary.new_leads > 0} />
          <Metric label="Unread" value={summary.unread_messages} detail="Inbox" onClick={() => setSection("messages")} darkMode={darkMode} active={summary.unread_messages > 0} />
          <Metric label="Follow-ups" value={summary.overdue_followups} detail={summary.overdue_followups ? "Overdue" : "Up to date"} onClick={() => setSection("leads")} darkMode={darkMode} active={summary.overdue_followups > 0} />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_.9fr]">
        <Surface darkMode={darkMode} className="overflow-hidden rounded-[24px]">
          <div className="flex items-center justify-between gap-3 border-b border-current/10 p-4 sm:p-5">
            <div>
              <h3 className="text-base font-black">Needs attention</h3>
              <p className={`mt-1 text-[10px] font-semibold ${muted}`}>Only items that need action now.</p>
            </div>
          </div>

          {attention.length ? (
            <div className="divide-y divide-current/10">
              {attention.slice(0, 5).map((item) => (
                <button key={`${item.section}-${item.title}`} type="button" onClick={() => setSection(item.section)} className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-current/[.025] sm:px-5">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.urgent ? "bg-[#f6b800]" : "bg-current/20"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-black">{item.title}</span>
                    <span className={`mt-1 block text-[10px] font-semibold leading-4 ${muted}`}>{item.detail}</span>
                  </span>
                  <span className="text-base opacity-30">›</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-6 sm:p-8">
              <div className="text-sm font-black">Nothing urgent right now.</div>
              <p className={`mt-2 text-[11px] font-semibold leading-5 ${muted}`}>New enquiries, stock issues and dealership actions will appear here when they need you.</p>
            </div>
          )}
        </Surface>

        <Surface darkMode={darkMode} className="overflow-hidden rounded-[24px]">
          <div className="flex items-center justify-between gap-3 border-b border-current/10 p-4 sm:p-5">
            <div>
              <h3 className="text-base font-black">Sales activity</h3>
              <p className={`mt-1 text-[10px] font-semibold ${muted}`}>Latest customers and follow-ups.</p>
            </div>
            <button type="button" onClick={() => setSection("leads")} className="text-[10px] font-black text-[#b88600]">View all</button>
          </div>

          {priorityLeads.length ? (
            <div className="divide-y divide-current/10">
              {priorityLeads.map((lead) => {
                const overdue = overdueLeads.some((item) => item.id === lead.id);
                return (
                  <button key={lead.id} type="button" onClick={() => setSection("leads")} className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-current/[.025] sm:px-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-current/[.05] text-[10px] font-black">{(lead.customer_name || "Lead").slice(0, 2).toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-black">{lead.customer_name || "Customer enquiry"}</span>
                      <span className={`mt-1 block truncate text-[10px] font-semibold ${muted}`}>{lead.listing_title || lead.source}</span>
                    </span>
                    <span className={`text-right text-[9px] font-black ${overdue ? "text-[#b88600]" : muted}`}>{overdue ? "Follow up" : relativeAge(lead.last_activity_at || lead.created_at)}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-6 sm:p-8">
              <div className="text-sm font-black">No active leads yet.</div>
              <p className={`mt-2 text-[11px] font-semibold leading-5 ${muted}`}>New marketplace enquiries will appear here automatically.</p>
            </div>
          )}
        </Surface>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Surface darkMode={darkMode} className="rounded-[24px] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black">Stock position</h3>
              <p className={`mt-1 text-[10px] font-semibold ${muted}`}>A clean view of where your inventory stands.</p>
            </div>
            <button type="button" onClick={() => setSection("inventory")} className="text-[10px] font-black text-[#b88600]">Manage stock</button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SmallStat label="Live" value={summary.live_stock} soft={soft} />
            <SmallStat label="Draft" value={summary.draft_stock} soft={soft} />
            <SmallStat label="Review" value={summary.pending_stock} soft={soft} />
            <SmallStat label="Reserved" value={summary.reserved_stock} soft={soft} />
          </div>
        </Surface>

        <Surface darkMode={darkMode} className="rounded-[24px] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black">LoadLink recommendations</h3>
              <p className={`mt-1 text-[10px] font-semibold ${muted}`}>Only recommendations tied to dealership activity.</p>
            </div>
            <button type="button" onClick={() => setSection("analytics")} className="text-[10px] font-black text-[#b88600]">Analytics</button>
          </div>

          <div className="mt-4 grid gap-2">
            {usefulInsights.length ? usefulInsights.map((item) => (
              <button key={item.id} type="button" onClick={() => item.action_section && setSection(item.action_section)} disabled={!item.action_section} className={`rounded-[18px] border p-3 text-left ${soft} ${item.action_section ? "hover:border-[#f6b800]/45" : ""}`}>
                <div className="text-[11px] font-black">{item.title}</div>
                <p className={`mt-1 text-[10px] font-semibold leading-4 ${muted}`}>{item.message}</p>
              </button>
            )) : (
              <div className={`rounded-[18px] border p-4 ${soft}`}>
                <div className="text-[11px] font-black">No recommendations right now.</div>
                <p className={`mt-1 text-[10px] font-semibold leading-4 ${muted}`}>LoadLink will flag stock, lead and response patterns when there is something useful to act on.</p>
              </div>
            )}
          </div>
        </Surface>
      </div>

      {appointments.length > 0 ? (
        <Surface darkMode={darkMode} className="rounded-[24px] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black">Today&apos;s appointments</h3>
              <p className={`mt-1 text-[10px] font-semibold ${muted}`}>{appointments.length} scheduled</p>
            </div>
            <button type="button" onClick={() => setSection("leads")} className="text-[10px] font-black text-[#b88600]">Open leads</button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {appointments.slice(0, 3).map((item) => (
              <button key={item.id} type="button" onClick={() => setSection("leads")} className={`rounded-[18px] border p-4 text-left ${soft}`}>
                <div className="text-[11px] font-black">{item.customer_name || "Customer appointment"}</div>
                <div className={`mt-1 text-[10px] font-semibold ${muted}`}>{item.listing_title || item.appointment_type}</div>
                <div className="mt-3 text-[11px] font-black text-[#b88600]">{new Date(item.starts_at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}</div>
              </button>
            ))}
          </div>
        </Surface>
      ) : null}
    </div>
  );
}

function Metric({ label, value, detail, onClick, darkMode, active = false }: { label: string; value: number; detail: string; onClick: () => void; darkMode: boolean; active?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-[20px] border p-4 text-left transition hover:border-[#f6b800]/45 ${active ? "border-[#f6b800]/35 bg-[#f6b800]/[.07]" : darkMode ? "border-white/10 bg-white/[.03]" : "border-black/[.07] bg-[#f8f7f3]"}`}>
      <div className="text-[26px] font-black tracking-[-.05em]">{Number(value || 0)}</div>
      <div className="mt-2 text-[10px] font-black">{label}</div>
      <div className="mt-1 text-[9px] font-semibold opacity-42">{detail}</div>
    </button>
  );
}

function SmallStat({ label, value, soft }: { label: string; value: number; soft: string }) {
  return <div className={`rounded-[18px] border p-3 ${soft}`}><div className="text-xl font-black">{Number(value || 0)}</div><div className="mt-1 text-[9px] font-black opacity-48">{label}</div></div>;
}
