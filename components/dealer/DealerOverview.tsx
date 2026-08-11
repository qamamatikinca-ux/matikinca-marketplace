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
import DealerMoreMenuEnhancer from "./DealerMoreMenuEnhancer";
import { EmptyState, Surface } from "./ui";

type IconName =
  | "stock"
  | "lead"
  | "follow"
  | "inbox"
  | "plus"
  | "status"
  | "showroom"
  | "calendar"
  | "quote"
  | "clock"
  | "performance"
  | "alert"
  | "arrow";

export default function DealerOverview(props: any) {
  const darkMode = Boolean(props.darkMode);
  const context = props.context as DealerWorkspaceState;
  const summary = props.summary as DealerSummary;
  const leads = (props.leads || []) as DealerLead[];
  const appointments = (props.appointments || []) as DealerAppointment[];
  const insights = (props.insights || []) as DealerInsight[];
  const inventory = (props.inventory || []) as DealerInventoryItem[];
  const setSection = props.setSection as (section: DealerSection) => void;
  const onRefresh = props.onRefresh as (() => unknown) | undefined;

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
      Boolean(lead.next_follow_up_at) &&
      new Date(String(lead.next_follow_up_at)).getTime() < Date.now() &&
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

  const responseRate = Math.max(
    0,
    Math.min(100, Number(summary.response_rate || 0)),
  );

  const profileCompletion = Math.max(
    0,
    Math.min(100, Number(summary.profile_completion || 0)),
  );

  const responseTime =
    summary.avg_response_minutes == null
      ? "—"
      : summary.avg_response_minutes < 60
        ? `${Math.max(1, Math.round(summary.avg_response_minutes))}m`
        : `${(summary.avg_response_minutes / 60).toFixed(
            summary.avg_response_minutes >= 600 ? 0 : 1,
          )}h`;

  const attention = useMemo(() => {
    const items: Array<{
      label: string;
      detail: string;
      section: DealerSection;
      priority: "high" | "normal";
    }> = [];

    if (summary.overdue_followups) {
      items.push({
        label: "Follow-ups overdue",
        detail: `${summary.overdue_followups} customer${
          summary.overdue_followups === 1 ? "" : "s"
        } waiting`,
        section: "leads",
        priority: "high",
      });
    }

    if (summary.unread_messages) {
      items.push({
        label: "Unread enquiries",
        detail: `${summary.unread_messages} message${
          summary.unread_messages === 1 ? "" : "s"
        } waiting`,
        section: "messages",
        priority: "high",
      });
    }

    const stockIssues = insights.filter((item) => item.kind === "inventory").length;
    if (stockIssues) {
      items.push({
        label: "Stock needs attention",
        detail: `${stockIssues} listing${stockIssues === 1 ? "" : "s"} flagged`,
        section: "inventory",
        priority: "normal",
      });
    }

    if (context.verification_status === "changes_required") {
      items.push({
        label: "Verification action",
        detail: "Changes are required",
        section: "verification",
        priority: "high",
      });
    }

    return items.slice(0, 4);
  }, [
    context.verification_status,
    insights,
    summary.overdue_followups,
    summary.unread_messages,
  ]);

  async function statusDone() {
    setStatusLoading(true);
    await Promise.all([Promise.resolve(onRefresh?.()), loadStatuses()]);
  }

  const shell = darkMode
    ? "border-white/10 bg-[#090909] text-white"
    : "border-black/[.08] bg-white text-[#0a0a0a]";

  const soft = darkMode
    ? "border-white/10 bg-white/[.035]"
    : "border-black/[.07] bg-[#f7f6f2]";

  return (
    <div
      className="grid gap-3 sm:gap-4"
      data-loadlink-dealer-home="command-centre-v5"
    >
      <DealerMoreMenuEnhancer />
      <DealerStatusComposer
        darkMode={darkMode}
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        inventory={inventory}
        context={context}
        onDone={() => void statusDone()}
      />

      <section
        className={`relative overflow-hidden rounded-[26px] border ${shell}`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-[#f6b800]" />
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#f6b800]/[.07] blur-3xl" />

        <div className="relative p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-[.16em] opacity-40">
                  Dealer command centre
                </span>
                <span className="h-1 w-1 rounded-full bg-[#f6b800]" />
                <span className="text-[9px] font-black uppercase tracking-[.08em] opacity-35">
                  {new Date().toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>

              <h1 className="mt-2 text-[26px] font-black tracking-[-.055em] sm:text-[34px]">
                Run the dealership.
              </h1>
              <p className="mt-1.5 max-w-xl text-[11px] font-semibold leading-5 opacity-48 sm:text-xs">
                Sales, stock, customer activity and Status in one working view.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSection(waiting ? "leads" : "analytics")}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[9px] font-black transition active:scale-[.98] ${
                waiting
                  ? darkMode
                    ? "border-[#f6b800]/35 bg-[#f6b800]/10"
                    : "border-[#c59400]/25 bg-[#f6b800]/15"
                  : "border-current/10 opacity-55"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  waiting ? "bg-[#f6b800]" : "bg-emerald-500"
                }`}
              />
              {waiting ? `${waiting} need action` : "All clear"}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricCard
              icon="stock"
              label="Live stock"
              value={summary.live_stock}
              detail={`${stockTotal} total`}
              darkMode={darkMode}
              onClick={() => setSection("inventory")}
            />
            <MetricCard
              icon="lead"
              label="New leads"
              value={summary.new_leads}
              detail={`${summary.leads_30d || 0} in 30d`}
              darkMode={darkMode}
              active={summary.new_leads > 0}
              onClick={() => setSection("leads")}
            />
            <MetricCard
              icon="follow"
              label="Follow-ups"
              value={summary.overdue_followups}
              detail={
                summary.overdue_followups ? "Overdue now" : "Up to date"
              }
              darkMode={darkMode}
              active={summary.overdue_followups > 0}
              onClick={() => setSection("leads")}
            />
            <MetricCard
              icon="inbox"
              label="Inbox"
              value={summary.unread_messages}
              detail={summary.unread_messages ? "Unread" : "Clear"}
              darkMode={darkMode}
              active={summary.unread_messages > 0}
              onClick={() => setSection("messages")}
            />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <QuickAction
              icon="plus"
              label="Add vehicle"
              detail="New stock"
              darkMode={darkMode}
              onClick={() =>
                window.location.assign(
                  `/list-your-vehicle?plan=dealer&dealership=${context.dealership_id}`,
                )
              }
            />
            <QuickAction
              icon="status"
              label="Post Status"
              detail="Reach followers"
              darkMode={darkMode}
              primary
              onClick={() => setStatusOpen(true)}
            />
            <QuickAction
              icon="showroom"
              label="Dealer page"
              detail="Showroom"
              darkMode={darkMode}
              onClick={() => setSection("showroom")}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-[1.15fr_.85fr]">
        <Surface
          darkMode={darkMode}
          className="overflow-hidden rounded-[24px]"
        >
          <PanelHeader
            icon="lead"
            title="Sales desk"
            detail="Live customer work"
            action="Open sales"
            onClick={() => setSection("leads")}
          />

          <div className="grid grid-cols-3 border-b border-current/10">
            <MiniStat icon="calendar" label="Appointments" value={summary.appointments_today} />
            <MiniStat icon="quote" label="Open quotes" value={summary.quotes_open} />
            <MiniStat icon="clock" label="Avg response" value={responseTime} last />
          </div>

          {appointments.length || priorities.length ? (
            <div className="divide-y divide-current/10">
              {appointments.slice(0, 2).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection("leads")}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-current/[.025] sm:px-5"
                >
                  <RoundIcon icon="calendar" darkMode={darkMode} active />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-black sm:text-[13px]">
                      {item.customer_name || "Customer viewing"}
                    </div>
                    <div className="mt-0.5 truncate text-[9px] font-semibold opacity-42 sm:text-[10px]">
                      {item.listing_title || item.appointment_type}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black">
                      {new Date(item.starts_at).toLocaleTimeString("en-ZA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="mt-0.5 text-[8px] font-black uppercase tracking-[.08em] opacity-28">
                      Today
                    </div>
                  </div>
                </button>
              ))}

              {priorities
                .slice(0, appointments.length ? 3 : 5)
                .map((lead) => {
                  const isOverdue = overdue.some((item) => item.id === lead.id);
                  return (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => setSection("leads")}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-current/[.025] sm:px-5"
                    >
                      <RoundIcon
                        icon={isOverdue ? "follow" : "lead"}
                        darkMode={darkMode}
                        active={isOverdue || lead.priority === "high"}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-black sm:text-[13px]">
                          {lead.customer_name || "Customer enquiry"}
                        </div>
                        <div className="mt-0.5 truncate text-[9px] font-semibold opacity-42 sm:text-[10px]">
                          {lead.listing_title || lead.source}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-[9px] font-black ${
                            isOverdue ? "text-[#b88600]" : "opacity-45"
                          }`}
                        >
                          {isOverdue
                            ? "Follow up"
                            : relativeAge(
                                lead.last_activity_at || lead.created_at,
                              )}
                        </div>
                        <div className="mt-0.5 text-[8px] font-black uppercase tracking-[.06em] opacity-25">
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
              detail="New enquiries, quotes, viewings and follow-ups will appear here."
            />
          )}
        </Surface>

        <Surface
          darkMode={darkMode}
          className="overflow-hidden rounded-[24px]"
        >
          <PanelHeader
            icon="stock"
            title="Stock position"
            detail="Inventory health"
            action="Manage"
            onClick={() => setSection("inventory")}
          />

          <div className="p-4 sm:p-5">
            <div className={`rounded-[20px] border p-4 ${soft}`}>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[.11em] opacity-35">
                    Total vehicles
                  </div>
                  <div className="mt-1 text-[34px] font-black tracking-[-.055em]">
                    {stockTotal}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[20px] font-black">
                    {summary.sold_30d || 0}
                  </div>
                  <div className="text-[8px] font-black uppercase tracking-[.08em] opacity-35">
                    Sold 30d
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 overflow-hidden rounded-xl border border-current/10">
                <StockCell label="Live" value={summary.live_stock} />
                <StockCell label="Draft" value={summary.draft_stock} />
                <StockCell label="Pending" value={summary.pending_stock} />
                <StockCell label="Reserved" value={summary.reserved_stock} last />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[.08em] opacity-40">
                <span>Showroom readiness</span>
                <span>{profileCompletion}%</span>
              </div>
              <div
                className={`mt-2 h-1.5 overflow-hidden rounded-full ${
                  darkMode ? "bg-white/10" : "bg-black/10"
                }`}
              >
                <div
                  className="h-full rounded-full bg-[#f6b800]"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSection("inventory")}
              className="mt-4 flex w-full items-center justify-between rounded-xl border border-current/10 px-3.5 py-3 text-left"
            >
              <span>
                <span className="block text-[10px] font-black">
                  Review inventory
                </span>
                <span className="mt-0.5 block text-[8px] font-semibold opacity-40">
                  Keep every listing sales-ready
                </span>
              </span>
              <LLIcon name="arrow" className="h-4 w-4 opacity-45" />
            </button>
          </div>
        </Surface>
      </div>

      {attention.length ? (
        <section className={`rounded-[24px] border p-3 sm:p-4 ${shell}`}>
          <div className="flex items-center justify-between gap-3 px-1 pb-3">
            <div className="flex items-center gap-2.5">
              <RoundIcon icon="alert" darkMode={darkMode} active />
              <div>
                <h2 className="text-[13px] font-black tracking-[-.02em]">
                  Needs attention
                </h2>
                <p className="mt-0.5 text-[9px] font-semibold opacity-40">
                  Work worth acting on now
                </p>
              </div>
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
                className={`flex min-h-[78px] items-center gap-3 rounded-[18px] border p-3 text-left transition active:scale-[.99] ${soft}`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    item.priority === "high"
                      ? "bg-[#f6b800]"
                      : "bg-current opacity-25"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-black">
                    {item.label}
                  </span>
                  <span className="mt-1 block text-[8px] font-semibold opacity-42">
                    {item.detail}
                  </span>
                </span>
                <LLIcon name="arrow" className="h-3.5 w-3.5 opacity-30" />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-[.85fr_1.15fr]">
        <Surface
          darkMode={darkMode}
          className="overflow-hidden rounded-[24px]"
        >
          <PanelHeader
            icon="performance"
            title="Performance"
            detail="Dealer operating pulse"
            action="Analytics"
            onClick={() => setSection("analytics")}
          />

          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-2">
              <PerformanceCell
                label="Stock views"
                value={summary.stock_views_30d || 0}
                detail="30 days"
                darkMode={darkMode}
              />
              <PerformanceCell
                label="Leads"
                value={summary.leads_30d || 0}
                detail="30 days"
                darkMode={darkMode}
              />
              <PerformanceCell
                label="Response"
                value={`${Math.round(responseRate)}%`}
                detail="handled"
                darkMode={darkMode}
              />
              <PerformanceCell
                label="Followers"
                value={summary.followers || 0}
                detail={`${summary.active_statuses || 0} Status live`}
                darkMode={darkMode}
              />
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[.08em] opacity-40">
                <span>Response discipline</span>
                <span>{Math.round(responseRate)}%</span>
              </div>
              <div
                className={`mt-2 h-1.5 overflow-hidden rounded-full ${
                  darkMode ? "bg-white/10" : "bg-black/10"
                }`}
              >
                <div
                  className="h-full rounded-full bg-[#f6b800]"
                  style={{ width: `${responseRate}%` }}
                />
              </div>
            </div>
          </div>
        </Surface>

        <Surface
          darkMode={darkMode}
          className="overflow-hidden rounded-[24px]"
        >
          <PanelHeader
            icon="status"
            title="Dealership Status"
            detail={
              liveStatuses.length
                ? `${liveStatuses.length} live with followers`
                : "Your public update"
            }
            action="Manage"
            onClick={() => setSection("marketing")}
          />

          {statusLoading ? (
            <div className="p-6 text-xs font-bold opacity-40">
              Loading Status…
            </div>
          ) : latest ? (
            <StatusPreview item={latest} darkMode={darkMode} />
          ) : (
            <EmptyState
              title="No Status yet"
              detail="Post a photo, video, vehicle or promotion for followers."
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

function MetricCard({
  icon,
  label,
  value,
  detail,
  active,
  darkMode,
  onClick,
}: {
  icon: IconName;
  label: string;
  value: string | number;
  detail: string;
  active?: boolean;
  darkMode: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-[18px] border p-3 text-left transition active:scale-[.985] sm:p-4 ${
        darkMode
          ? "border-white/10 bg-white/[.035]"
          : "border-black/[.07] bg-[#faf9f6]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
            active
              ? "border-[#f6b800]/30 bg-[#f6b800]/10"
              : "border-current/10 bg-current/[.025]"
          }`}
        >
          <LLIcon name={icon} className="h-4 w-4" />
        </span>
        {active ? <span className="h-1.5 w-1.5 rounded-full bg-[#f6b800]" /> : null}
      </div>
      <div className="mt-3 text-[26px] font-black tracking-[-.05em]">
        {value}
      </div>
      <div className="mt-1 text-[9px] font-black uppercase tracking-[.07em] opacity-42">
        {label}
      </div>
      <div className="mt-0.5 truncate text-[8px] font-semibold opacity-32">
        {detail}
      </div>
    </button>
  );
}

function QuickAction({
  icon,
  label,
  detail,
  primary,
  darkMode,
  onClick,
}: {
  icon: IconName;
  label: string;
  detail: string;
  primary?: boolean;
  darkMode: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 items-center gap-2.5 rounded-[16px] border px-2.5 py-3 text-left transition active:scale-[.985] sm:px-3.5 ${
        primary
          ? "border-[#f6b800] bg-[#f6b800] text-black"
          : darkMode
            ? "border-white/10 bg-white/[.025]"
            : "border-black/[.07] bg-white"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
          primary ? "bg-black/10" : "bg-current/[.05]"
        }`}
      >
        <LLIcon name={icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[9px] font-black sm:text-[10px]">
          {label}
        </span>
        <span
          className={`mt-0.5 block truncate text-[7px] font-semibold ${
            primary ? "opacity-55" : "opacity-38"
          }`}
        >
          {detail}
        </span>
      </span>
    </button>
  );
}

function PanelHeader({
  icon,
  title,
  detail,
  action,
  onClick,
}: {
  icon: IconName;
  title: string;
  detail: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-current/10 px-4 py-3.5 sm:px-5 sm:py-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-current/10 bg-current/[.025]">
          <LLIcon name={icon} className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-black tracking-[-.02em] sm:text-[14px]">
            {title}
          </h2>
          <p className="mt-0.5 truncate text-[8px] font-semibold opacity-38 sm:text-[9px]">
            {detail}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClick}
        className="flex shrink-0 items-center gap-1.5 text-[9px] font-black opacity-45 transition hover:opacity-100"
      >
        {action}
        <LLIcon name="arrow" className="h-3 w-3" />
      </button>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  last,
}: {
  icon: IconName;
  label: string;
  value: string | number;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-center gap-2 px-2 py-3 ${
        last ? "" : "border-r border-current/10"
      }`}
    >
      <LLIcon name={icon} className="h-3.5 w-3.5 opacity-35" />
      <div>
        <div className="text-[13px] font-black tracking-[-.02em]">{value}</div>
        <div className="mt-0.5 text-[7px] font-black uppercase tracking-[.05em] opacity-32">
          {label}
        </div>
      </div>
    </div>
  );
}

function RoundIcon({
  icon,
  darkMode,
  active,
}: {
  icon: IconName;
  darkMode: boolean;
  active?: boolean;
}) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
        active
          ? "border-[#f6b800]/25 bg-[#f6b800]/10"
          : darkMode
            ? "border-white/10 bg-white/[.03]"
            : "border-black/[.07] bg-black/[.025]"
      }`}
    >
      <LLIcon name={icon} className="h-4 w-4" />
    </span>
  );
}

function StockCell({
  label,
  value,
  last,
}: {
  label: string;
  value: number;
  last?: boolean;
}) {
  return (
    <div
      className={`px-1 py-2.5 text-center ${
        last ? "" : "border-r border-current/10"
      }`}
    >
      <div className="text-[12px] font-black">{value}</div>
      <div className="mt-0.5 text-[7px] font-black uppercase tracking-[.04em] opacity-32">
        {label}
      </div>
    </div>
  );
}

function PerformanceCell({
  label,
  value,
  detail,
  darkMode,
}: {
  label: string;
  value: string | number;
  detail: string;
  darkMode: boolean;
}) {
  return (
    <div
      className={`rounded-[18px] border p-3 ${
        darkMode
          ? "border-white/10 bg-white/[.025]"
          : "border-black/[.07] bg-[#faf9f6]"
      }`}
    >
      <div className="text-[8px] font-black uppercase tracking-[.06em] opacity-34">
        {label}
      </div>
      <div className="mt-1.5 text-[21px] font-black tracking-[-.04em]">
        {value}
      </div>
      <div className="mt-0.5 text-[8px] font-semibold opacity-32">{detail}</div>
    </div>
  );
}

function StatusPreview({
  item,
  darkMode,
}: {
  item: DealerStatus;
  darkMode: boolean;
}) {
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
          <div
            className={`h-[108px] w-[92px] shrink-0 overflow-hidden rounded-[18px] ${
              darkMode ? "bg-white/[.04]" : "bg-black/[.04]"
            }`}
          >
            {item.content_type === "video" ? (
              <video
                src={item.media_url}
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
            ) : (
              <img
                src={item.media_url}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
          </div>
        ) : (
          <div className="flex h-[108px] w-[92px] shrink-0 items-center justify-center rounded-[18px] border border-current/10">
            <LLIcon name="status" className="h-5 w-5 opacity-35" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                ended
                  ? "bg-current opacity-25"
                  : item.publication_status === "published"
                    ? "bg-emerald-500"
                    : "bg-[#f6b800]"
              }`}
            />
            <span className="text-[8px] font-black uppercase tracking-[.09em] opacity-42">
              {ended
                ? "Ended"
                : item.publication_status.replaceAll("_", " ")}
            </span>
          </div>

          <h3 className="mt-2 truncate text-[14px] font-black sm:text-[15px]">
            {item.title ||
              item.listing_title ||
              `${item.content_type} Status`}
          </h3>

          <p className="mt-1 line-clamp-2 text-[9px] font-semibold leading-4 opacity-42 sm:text-[10px]">
            {item.body || "Live dealership Status"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 overflow-hidden rounded-xl border border-current/10">
        <StatusCell value={item.views} label="Views" />
        <StatusCell value={`${complete}%`} label="Watched" />
        <StatusCell value={item.vehicle_opens} label="Opens" />
        <StatusCell value={item.messages_generated} label="Leads" last />
      </div>
    </div>
  );
}

function StatusCell({
  value,
  label,
  last,
}: {
  value: string | number;
  label: string;
  last?: boolean;
}) {
  return (
    <div
      className={`px-1 py-2.5 text-center ${
        last ? "" : "border-r border-current/10"
      }`}
    >
      <div className="text-[12px] font-black">{value}</div>
      <div className="mt-0.5 text-[7px] font-black uppercase opacity-32 sm:text-[8px]">
        {label}
      </div>
    </div>
  );
}

function LLIcon({
  name,
  className = "h-4 w-4",
}: {
  name: IconName;
  className?: string;
}) {
  const common = {
    viewBox: "0 0 24 24",
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "stock") {
    return (
      <svg {...common}>
        <path d="M4 8.5h16v9.5H4z" />
        <path d="M6 8.5 7.5 5h9L18 8.5" />
        <path d="M7 14h10" />
        <path d="M8 18v1.5M16 18v1.5" />
      </svg>
    );
  }

  if (name === "lead") {
    return (
      <svg {...common}>
        <path d="M5 5.5h14v10H9l-4 3z" />
        <path d="M8 9h8M8 12h5" />
        <path d="m17.5 4 1 1 2-2" />
      </svg>
    );
  }

  if (name === "follow") {
    return (
      <svg {...common}>
        <path d="M12 5a7 7 0 1 0 6.6 9.3" />
        <path d="M16 4h4v4" />
        <path d="M20 4 15 9" />
        <path d="M12 8v4l2.5 1.5" />
      </svg>
    );
  }

  if (name === "inbox") {
    return (
      <svg {...common}>
        <path d="M4 6h16v12H4z" />
        <path d="m4 8 8 6 8-6" />
      </svg>
    );
  }

  if (name === "plus") {
    return (
      <svg {...common}>
        <path d="M12 5v14M5 12h14" />
        <path d="M4 4h4M16 20h4" opacity=".45" />
      </svg>
    );
  }

  if (name === "status") {
    return (
      <svg {...common}>
        <path d="M5 5h14v11H9l-4 3z" />
        <path d="M8 9h8M8 12h5" />
        <path d="M18.5 4.5h2M19.5 3.5v2" />
      </svg>
    );
  }

  if (name === "showroom") {
    return (
      <svg {...common}>
        <path d="M4 10h16v10H4z" />
        <path d="m3 10 2-5h14l2 5" />
        <path d="M8 20v-5h8v5" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...common}>
        <path d="M5 5h14v15H5z" />
        <path d="M8 3v4M16 3v4M5 9h14" />
        <path d="M8 13h3v3H8z" />
      </svg>
    );
  }

  if (name === "quote") {
    return (
      <svg {...common}>
        <path d="M5 5h14v14H5z" />
        <path d="M8 9h8M8 12h6M8 15h4" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
      </svg>
    );
  }

  if (name === "performance") {
    return (
      <svg {...common}>
        <path d="M5 19V9M10 19V5M15 19v-7M20 19V8" />
        <path d="m5 8 5-3 5 5 5-4" opacity=".55" />
      </svg>
    );
  }

  if (name === "alert") {
    return (
      <svg {...common}>
        <path d="m12 4 8 15H4z" />
        <path d="M12 9v4M12 16h.01" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M5 12h13" />
      <path d="m14 8 4 4-4 4" />
    </svg>
  );
}
