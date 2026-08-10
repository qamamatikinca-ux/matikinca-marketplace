"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  DealerAppointment,
  DealerInsight,
  DealerInventoryItem,
  DealerLead,
  DealerSection,
  DealerStatus,
  DealerSummary,
  DealerWorkspaceState,
} from "@/lib/dealer/types";
import { dealerFetch, relativeAge } from "@/lib/dealer/client";
import DealerStatusComposer from "./DealerStatusComposer";
import { EmptyState, Surface } from "./ui";

export default function DealerOverview({
  darkMode,
  context,
  summary,
  leads,
  appointments,
  insights,
  inventory,
  setSection,
  onRefresh,
}: {
  darkMode: boolean;
  context: DealerWorkspaceState;
  summary: DealerSummary;
  leads: DealerLead[];
  appointments: DealerAppointment[];
  insights: DealerInsight[];
  inventory: DealerInventoryItem[];
  setSection: (section: DealerSection) => void;
  onRefresh: () => void | Promise<void>;
}) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [statuses, setStatuses] = useState<DealerStatus[]>([]);
  const [statusLoading, setStatusLoading] = useState(true);

  async function loadStatuses() {
    try {
      const data = await dealerFetch<{ items: DealerStatus[] }>("/api/dealer/statuses");
      setStatuses(data.items || []);
    } catch {
      setStatuses([]);
    } finally {
      setStatusLoading(false);
    }
  }

  useEffect(() => {
    void loadStatuses();
  }, []);

  const highLeads = leads.filter(
    (lead) => lead.priority === "high" && !["won", "lost"].includes(lead.status),
  );
  const overdue = leads.filter(
    (lead) =>
      lead.next_follow_up_at &&
      new Date(lead.next_follow_up_at).getTime() < Date.now() &&
      !["won", "lost"].includes(lead.status),
  );
  const priorities = [
    ...overdue,
    ...highLeads.filter((lead) => !overdue.some((item) => item.id === lead.id)),
    ...leads,
  ]
    .filter(
      (value, index, array) =>
        array.findIndex((item) => item.id === value.id) === index,
    )
    .slice(0, 5);

  const latest = statuses[0] || null;
  const liveStatuses = statuses.filter(
    (item) =>
      item.publication_status === "published" &&
      new Date(item.expires_at).getTime() > Date.now(),
  );

  const waiting =
    Number(summary.new_leads || 0) +
    Number(summary.overdue_followups || 0) +
    Number(summary.unread_messages || 0);
  const stockTotal =
    Number(summary.live_stock || 0) +
    Number(summary.draft_stock || 0) +
    Number(summary.pending_stock || 0) +
    Number(summary.reserved_stock || 0);
  const responseRate = Math.max(0, Math.min(100, Number(summary.response_rate || 0)));
  const responseTime = summary.avg_response_minutes == null
    ? "—"
    : summary.avg_response_minutes < 60
      ? `${Math.max(1, Math.round(summary.avg_response_minutes))}m`
      : `${(summary.avg_response_minutes / 60).toFixed(summary.avg_response_minutes >= 600 ? 0 : 1)}h`;

  const attention = useMemo(() => {
    const items: Array<{
      label: string;
      detail: string;
      section: DealerSection;
      level: "high" | "normal";
    }> = [];

    if (summary.overdue_followups) {
      items.push({
        label: "Follow-ups overdue",
        detail: `${summary.overdue_followups} customer${summary.overdue_followups === 1 ? "" : "s"} waiting for action`,
        section: "leads",
        level: "high",
      });
    }
    if (summary.unread_messages) {
      items.push({
        label: "Unread enquiries",
        detail: `${summary.unread_messages} message${summary.unread_messages === 1 ? "" : "s"} not opened yet`,
        section: "messages",
        level: "high",
      });
    }
    const stockIssues = insights.filter((item) => item.kind === "inventory").length;
    if (stockIssues) {
      items.push({
        label: "Stock needs attention",
        detail: `${stockIssues} listing${stockIssues === 1 ? "" : "s"} flagged by LoadLink`,
        section: "inventory",
        level: "normal",
      });
    }
    if (context.verification_status === "changes_required") {
      items.push({
        label: "Verification changes required",
        detail: "Review the request before your dealership is fully cleared",
        section: "verification",
        level: "high",
      });
    }
    return items.slice(0, 4);
  }, [context.verification_status, insights, summary.overdue_followups, summary.unread_messages]);

  async function statusDone() {
    setStatusLoading(true);
    await Promise.all([Promise.resolve(onRefresh()), loadStatuses()]);
  }

  const panel = darkMode
    ? "border-white/10 bg-[#0b0b0b]"
    : "border-black/[.08] bg-white";
  const inset = darkMode
    ? "border-white/10 bg-white/[.035]"
    : "border-black/[.07] bg-[#faf8f3]";

  return (
    <div className="grid gap-3 sm:gap-4" data-loadlink-dealer-home="command-centre-v4">
      <DealerStatusComposer
        darkMode={darkMode}
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        inventory={inventory}
        context={context}
        onDone={() => void statusDone()}
      />

      <section className={`relative overflow-hidden rounded-[22px] border ${panel}`}>
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#f6b800]/[.06] blur-3xl" />
        <div className="relative px-4 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.13em] opacity-40">
                <span>Dealer dashboard</span>
                <span className="h-1 w-1 rounded-full bg-current opacity-40" />
                <span>{new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}</span>
              </div>
              <h1 className="mt-1.5 text-[24px] font-black tracking-[-.045em] sm:text-[30px]">
                Your business, at a glance
              </h1>
              <p className="mt-1 max-w-2xl text-[11px] font-semibold leading-5 opacity-50 sm:text-xs">
                Stock, customers and dealership activity in one working view.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSection(waiting ? "leads" : "analytics")}
              className={`shrink-0 rounded-full border px-3 py-2 text-[9px] font-black ${
                waiting
                  ? darkMode
                    ? "border-[#f6b800]/35 bg-[#f6b800]/10 text-[#f6b800]"
                    : "border-[#b88700]/25 bg-[#f6b800]/15 text-[#725600]"
                  : "border-current/10 opacity-55"
              }`}
            >
              {waiting ? `${waiting} need action` : "All clear"}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <PulseCard
              label="Live stock"
              value={summary.live_stock}
              detail={`${stockTotal} total vehicles`}
              onClick={() => setSection("inventory")}
              darkMode={darkMode}
            />
            <PulseCard
              label="New leads"
              value={summary.new_leads}
              detail={`${summary.leads_30d || 0} in 30 days`}
              hot={summary.new_leads > 0}
              onClick={() => setSection("leads")}
              darkMode={darkMode}
            />
            <PulseCard
              label="Follow-ups"
              value={summary.overdue_followups}
              detail={summary.overdue_followups ? "Overdue now" : "Nothing overdue"}
              hot={summary.overdue_followups > 0}
              onClick={() => setSection("leads")}
              darkMode={darkMode}
            />
            <PulseCard
              label="Inbox"
              value={summary.unread_messages}
              detail={summary.unread_messages ? "Unread messages" : "Inbox clear"}
              hot={summary.unread_messages > 0}
              onClick={() => setSection("messages")}
              darkMode={darkMode}
            />
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 sm:grid sm:grid-cols-3 sm:overflow-visible">
            <CommandButton
              label="Add vehicle"
              detail="List new stock"
              icon="plus"
              darkMode={darkMode}
              onClick={() =>
                window.location.assign(
                  `/list-your-vehicle?plan=dealer&dealership=${context.dealership_id}`,
                )
              }
            />
            <CommandButton
              label="Post Status"
              detail="Reach followers"
              icon="status"
              primary
              darkMode={darkMode}
              onClick={() => setStatusOpen(true)}
            />
            <CommandButton
              label="Dealer page"
              detail="Manage showroom"
              icon="store"
              darkMode={darkMode}
              onClick={() => setSection("showroom")}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-[1.18fr_.82fr]">
        <Surface darkMode={darkMode} className="overflow-hidden rounded-[22px]">
          <SectionHead
            title="Sales desk"
            detail="What needs your team first"
            action="Open sales"
            onClick={() => setSection("leads")}
          />

          <div className="grid grid-cols-3 border-b border-current/10">
            <CompactStat label="Appointments" value={summary.appointments_today} />
            <CompactStat label="Open quotes" value={summary.quotes_open} />
            <CompactStat label="Avg response" value={responseTime} last />
          </div>

          {appointments.length || priorities.length ? (
            <div className="divide-y divide-current/10">
              {appointments.slice(0, 2).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection("leads")}
                  className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-current/[.025] sm:px-5"
                >
                  <QueueBadge kind="appointment" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-black sm:text-[13px]">
                      {item.customer_name || "Customer viewing"}
                    </div>
                    <div className="mt-0.5 truncate text-[9px] font-semibold opacity-45 sm:text-[10px]">
                      Viewing · {item.listing_title || item.appointment_type}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black">
                      {new Date(item.starts_at).toLocaleTimeString("en-ZA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="mt-0.5 text-[8px] font-black uppercase tracking-[.08em] opacity-30">
                      Today
                    </div>
                  </div>
                </button>
              ))}

              {priorities.slice(0, appointments.length ? 3 : 5).map((lead) => {
                const isOverdue = overdue.some((item) => item.id === lead.id);
                return (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => setSection("leads")}
                    className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-current/[.025] sm:px-5"
                  >
                    <QueueBadge kind={isOverdue || lead.priority === "high" ? "urgent" : "lead"} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-black sm:text-[13px]">
                        {lead.customer_name || "Customer enquiry"}
                      </div>
                      <div className="mt-0.5 truncate text-[9px] font-semibold opacity-45 sm:text-[10px]">
                        {lead.listing_title || lead.source}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-[9px] font-black ${isOverdue ? "text-[#c28d00]" : "opacity-45"}`}>
                        {isOverdue ? "Follow up" : relativeAge(lead.last_activity_at || lead.created_at)}
                      </div>
                      <div className="mt-0.5 text-[8px] font-black uppercase tracking-[.07em] opacity-25">
                        {lead.status.replaceAll("_", " ")}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="Sales desk is clear"
              detail="New enquiries, quotes, viewings and follow-ups will land here."
            />
          )}
        </Surface>

        <Surface darkMode={darkMode} className="overflow-hidden rounded-[22px]">
          <SectionHead
            title="Inventory position"
            detail="Where your stock sits right now"
            action="Manage stock"
            onClick={() => setSection("inventory")}
          />
          <div className="p-4 sm:p-5">
            <div className={`rounded-2xl border p-4 ${inset}`}>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[.1em] opacity-35">Total stock</div>
                  <div className="mt-1 text-[32px] font-black tracking-[-.05em]">{stockTotal}</div>
                </div>
                <div className="text-right">
                  <div className="text-[18px] font-black">{summary.sold_30d || 0}</div>
                  <div className="text-[8px] font-black uppercase tracking-[.08em] opacity-35">Sold 30d</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-4 overflow-hidden rounded-xl border border-current/10">
                <StockStat label="Live" value={summary.live_stock} />
                <StockStat label="Draft" value={summary.draft_stock} />
                <StockStat label="Pending" value={summary.pending_stock} />
                <StockStat label="Reserved" value={summary.reserved_stock} last />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[.08em] opacity-40">
                <span>Showroom readiness</span>
                <span>{Math.max(0, Math.min(100, Number(summary.profile_completion || 0)))}%</span>
              </div>
              <div className={`mt-2 h-1.5 overflow-hidden rounded-full ${darkMode ? "bg-white/10" : "bg-black/10"}`}>
                <div
                  className="h-full rounded-full bg-[#f6b800] transition-[width]"
                  style={{ width: `${Math.max(0, Math.min(100, Number(summary.profile_completion || 0)))}%` }}
                />
              </div>
            </div>
          </div>
        </Surface>
      </div>

      {attention.length ? (
        <section className={`rounded-[22px] border p-3 sm:p-4 ${panel}`}>
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div>
              <h2 className="text-[14px] font-black tracking-[-.02em]">Needs attention</h2>
              <p className="mt-0.5 text-[9px] font-semibold opacity-40">LoadLink is surfacing work that should not be buried.</p>
            </div>
            <span className="rounded-full border border-current/10 px-2.5 py-1 text-[9px] font-black opacity-45">
              {attention.length}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {attention.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setSection(item.section)}
                className={`flex min-h-[76px] items-start gap-3 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${inset}`}
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.level === "high" ? "bg-[#f6b800]" : "bg-current opacity-25"}`} />
                <span className="min-w-0">
                  <span className="block text-[11px] font-black">{item.label}</span>
                  <span className="mt-1 block text-[9px] font-semibold leading-4 opacity-45">{item.detail}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-[.9fr_1.1fr]">
        <Surface darkMode={darkMode} className="overflow-hidden rounded-[22px]">
          <SectionHead
            title="Performance"
            detail="Useful operating numbers, not vanity metrics"
            action="Full analytics"
            onClick={() => setSection("analytics")}
          />
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-2">
              <PerformanceTile label="Stock views" value={summary.stock_views_30d || 0} suffix="30d" darkMode={darkMode} />
              <PerformanceTile label="Leads" value={summary.leads_30d || 0} suffix="30d" darkMode={darkMode} />
              <PerformanceTile label="Response rate" value={`${Math.round(responseRate)}%`} suffix="handled" darkMode={darkMode} />
              <PerformanceTile label="Followers" value={summary.followers || 0} suffix={`${summary.active_statuses || 0} Status live`} darkMode={darkMode} />
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[.08em] opacity-40">
                <span>Lead response discipline</span>
                <span>{Math.round(responseRate)}%</span>
              </div>
              <div className={`mt-2 h-1.5 overflow-hidden rounded-full ${darkMode ? "bg-white/10" : "bg-black/10"}`}>
                <div className="h-full rounded-full bg-[#f6b800]" style={{ width: `${responseRate}%` }} />
              </div>
            </div>
          </div>
        </Surface>

        <Surface darkMode={darkMode} className="overflow-hidden rounded-[22px]">
          <SectionHead
            title="Dealership Status"
            detail={liveStatuses.length ? `${liveStatuses.length} live with followers now` : "Your latest public update"}
            action="Manage Status"
            onClick={() => setSection("marketing")}
          />
          {statusLoading ? (
            <div className="p-6 text-xs font-bold opacity-40">Loading Status…</div>
          ) : latest ? (
            <StatusPreview item={latest} darkMode={darkMode} />
          ) : (
            <EmptyState
              title="No Status yet"
              detail="Post a photo, video, vehicle or promotion for followers to see."
              action={
                <button
                  type="button"
                  onClick={() => setStatusOpen(true)}
                  className="rounded-xl bg-[#f6b800] px-4 py-2.5 text-xs font-black text-black"
                >
                  Post Status
                </button>
              }
            />
          )}
        </Surface>
      </div>
    </div>
  );
}

function SectionHead({
  title,
  detail,
  action,
  onClick,
}: {
  title: string;
  detail: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-current/10 px-4 py-3.5 sm:px-5 sm:py-4">
      <div className="min-w-0">
        <h2 className="truncate text-[14px] font-black tracking-[-.02em] sm:text-[15px]">{title}</h2>
        <p className="mt-0.5 truncate text-[9px] font-semibold opacity-40 sm:text-[10px]">{detail}</p>
      </div>
      <button type="button" onClick={onClick} className="shrink-0 text-[9px] font-black opacity-45 transition hover:opacity-100 sm:text-[10px]">
        {action} →
      </button>
    </div>
  );
}

function PulseCard({
  label,
  value,
  detail,
  hot,
  onClick,
  darkMode,
}: {
  label: string;
  value: number;
  detail: string;
  hot?: boolean;
  onClick: () => void;
  darkMode: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-3 text-left transition active:scale-[.985] sm:p-4 ${
        darkMode ? "border-white/10 bg-white/[.03]" : "border-black/[.07] bg-[#fbf9f4]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[9px] font-black uppercase tracking-[.07em] opacity-40">{label}</span>
        {hot ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#f6b800]" /> : null}
      </div>
      <div className={`mt-2 text-[25px] font-black tracking-[-.045em] ${hot ? (darkMode ? "text-[#f6b800]" : "text-[#876500]") : ""}`}>{value}</div>
      <div className="mt-0.5 truncate text-[9px] font-semibold opacity-38">{detail}</div>
    </button>
  );
}

function CommandButton({
  label,
  detail,
  icon,
  onClick,
  primary,
  darkMode,
}: {
  label: string;
  detail: string;
  icon: "plus" | "status" | "store";
  onClick: () => void;
  primary?: boolean;
  darkMode: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-[156px] items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition active:scale-[.985] sm:min-w-0 ${
        primary
          ? "border-[#f6b800] bg-[#f6b800] text-black"
          : darkMode
            ? "border-white/10 bg-white/[.025] text-white"
            : "border-black/[.07] bg-white text-black"
      }`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${primary ? "bg-black/10" : "bg-current/[.055]"}`}>
        <ActionIcon kind={icon} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-black sm:text-[11px]">{label}</span>
        <span className={`mt-0.5 block truncate text-[8px] font-semibold ${primary ? "opacity-55" : "opacity-40"}`}>{detail}</span>
      </span>
    </button>
  );
}

function CompactStat({ label, value, last }: { label: string; value: string | number; last?: boolean }) {
  return (
    <div className={`px-3 py-3 text-center ${last ? "" : "border-r border-current/10"}`}>
      <div className="text-[15px] font-black tracking-[-.02em]">{value}</div>
      <div className="mt-0.5 truncate text-[8px] font-black uppercase tracking-[.06em] opacity-35">{label}</div>
    </div>
  );
}

function StockStat({ label, value, last }: { label: string; value: number; last?: boolean }) {
  return (
    <div className={`px-1 py-2.5 text-center ${last ? "" : "border-r border-current/10"}`}>
      <div className="text-[12px] font-black">{value}</div>
      <div className="mt-0.5 text-[7px] font-black uppercase tracking-[.04em] opacity-35 sm:text-[8px]">{label}</div>
    </div>
  );
}

function PerformanceTile({ label, value, suffix, darkMode }: { label: string; value: string | number; suffix: string; darkMode: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${darkMode ? "border-white/10 bg-white/[.025]" : "border-black/[.07] bg-[#faf8f3]"}`}>
      <div className="text-[9px] font-black uppercase tracking-[.06em] opacity-35">{label}</div>
      <div className="mt-1.5 text-[20px] font-black tracking-[-.035em]">{value}</div>
      <div className="mt-0.5 text-[8px] font-semibold opacity-35">{suffix}</div>
    </div>
  );
}

function QueueBadge({ kind }: { kind: "appointment" | "urgent" | "lead" }) {
  const active = kind !== "lead";
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${active ? "border-[#f6b800]/25 bg-[#f6b800]/10" : "border-current/10 bg-current/[.025]"}`}>
      {kind === "appointment" ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" />
          <path d="M8 12h3v3H8z" />
        </svg>
      ) : kind === "urgent" ? (
        <span className="h-2.5 w-2.5 rounded-full bg-[#f6b800]" />
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4 opacity-55" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 5h16v12H8l-4 3V5Z" />
          <path d="M8 9h8M8 12h5" />
        </svg>
      )}
    </span>
  );
}

function ActionIcon({ kind }: { kind: "plus" | "status" | "store" }) {
  if (kind === "plus") return <span className="text-lg font-black leading-none">＋</span>;
  if (kind === "status") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 5h14v11H9l-4 3V5Z" />
        <path d="M8 9h8M8 12h5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 10h16v10H4V10ZM3 10l2-6h14l2 6" />
      <path d="M8 20v-5h8v5" />
    </svg>
  );
}

function StatusPreview({ item, darkMode }: { item: DealerStatus; darkMode: boolean }) {
  const complete = item.views
    ? Math.round((item.completed_views / item.views) * 100)
    : 0;
  const ended =
    new Date(item.expires_at).getTime() <= Date.now() ||
    ["expired", "removed"].includes(item.publication_status);

  return (
    <div className="p-4 sm:p-5">
      <div className="flex gap-3.5">
        {item.media_url ? (
          <div className={`h-[108px] w-[92px] shrink-0 overflow-hidden rounded-2xl ${darkMode ? "bg-white/[.04]" : "bg-black/[.04]"}`}>
            {item.content_type === "video" ? (
              <video src={item.media_url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
            ) : (
              <img src={item.media_url} alt="" className="h-full w-full object-cover" />
            )}
          </div>
        ) : (
          <div className="flex h-[108px] w-[92px] shrink-0 items-center justify-center rounded-2xl border border-current/10 text-[8px] font-black uppercase tracking-[.08em] opacity-35">
            {item.content_type}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${ended ? "bg-current opacity-25" : item.publication_status === "published" ? "bg-emerald-500" : "bg-[#f6b800]"}`} />
            <span className="text-[8px] font-black uppercase tracking-[.09em] opacity-45">
              {ended ? "Ended" : item.publication_status.replaceAll("_", " ")}
            </span>
          </div>
          <h3 className="mt-2 truncate text-[14px] font-black sm:text-[15px]">
            {item.title || item.listing_title || `${item.content_type} Status`}
          </h3>
          <p className="mt-1 line-clamp-2 text-[9px] font-semibold leading-4 opacity-45 sm:text-[10px]">
            {item.body || "Live dealership Status"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 overflow-hidden rounded-xl border border-current/10">
        <StatusStat value={item.views} label="Views" />
        <StatusStat value={`${complete}%`} label="Watched" />
        <StatusStat value={item.vehicle_opens} label="Opens" />
        <StatusStat value={item.messages_generated} label="Leads" last />
      </div>
    </div>
  );
}

function StatusStat({ value, label, last }: { value: string | number; label: string; last?: boolean }) {
  return (
    <div className={`px-1 py-2.5 text-center ${last ? "" : "border-r border-current/10"}`}>
      <div className="text-[12px] font-black">{value}</div>
      <div className="mt-0.5 text-[7px] font-black uppercase opacity-35 sm:text-[8px]">{label}</div>
    </div>
  );
}
