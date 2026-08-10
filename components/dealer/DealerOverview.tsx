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
    .slice(0, 4);

  const latest = statuses[0] || null;
  const live = statuses.filter(
    (item) =>
      item.publication_status === "published" &&
      new Date(item.expires_at).getTime() > Date.now(),
  );
  const waiting =
    Number(summary.new_leads || 0) +
    Number(summary.overdue_followups || 0) +
    Number(summary.unread_messages || 0);

  const attention = useMemo(() => {
    const items: Array<{
      label: string;
      detail: string;
      section: DealerSection;
    }> = [];
    if (summary.overdue_followups) {
      items.push({
        label: "Follow-ups",
        detail: `${summary.overdue_followups} overdue`,
        section: "leads",
      });
    }
    const stockIssues = insights.filter((item) => item.kind === "inventory").length;
    if (stockIssues) {
      items.push({
        label: "Stock",
        detail: `${stockIssues} need attention`,
        section: "inventory",
      });
    }
    if (context.verification_status === "changes_required") {
      items.push({
        label: "Verification",
        detail: "Changes required",
        section: "verification",
      });
    }
    return items;
  }, [context.verification_status, insights, summary.overdue_followups]);

  async function statusDone() {
    setStatusLoading(true);
    await Promise.all([Promise.resolve(onRefresh()), loadStatuses()]);
  }

  return (
    <div className="grid gap-3" data-loadlink-dealer-home="modern-v3">
      <DealerStatusComposer
        darkMode={darkMode}
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        inventory={inventory}
        context={context}
        onDone={() => void statusDone()}
      />

      <section
        className={`overflow-hidden rounded-[18px] border ${
          darkMode
            ? "border-white/10 bg-[#0b0b0b]"
            : "border-black/[.08] bg-white"
        }`}
      >
        <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5">
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[.14em] opacity-35">
              Today
            </div>
            <div className="mt-1 flex min-w-0 items-baseline gap-2">
              <h1 className="truncate text-[20px] font-black tracking-[-.035em] sm:text-[22px]">
                Your dealership
              </h1>
              <span
                className={`shrink-0 text-[10px] font-black ${
                  waiting
                    ? darkMode
                      ? "text-[#f6b800]"
                      : "text-[#8b6800]"
                    : "opacity-35"
                }`}
              >
                {waiting ? `${waiting} waiting` : "All clear"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSection("leads")}
            className="shrink-0 text-[10px] font-black opacity-45 transition hover:opacity-100"
          >
            Sales →
          </button>
        </div>

        <div className="grid grid-cols-4 border-y border-current/10">
          <Metric
            label="Stock"
            value={summary.live_stock}
            onClick={() => setSection("inventory")}
            darkMode={darkMode}
          />
          <Metric
            label="New leads"
            value={summary.new_leads}
            hot={summary.new_leads > 0}
            onClick={() => setSection("leads")}
            darkMode={darkMode}
          />
          <Metric
            label="Follow-ups"
            value={summary.overdue_followups}
            hot={summary.overdue_followups > 0}
            onClick={() => setSection("leads")}
            darkMode={darkMode}
          />
          <Metric
            label="Inbox"
            value={summary.unread_messages}
            hot={summary.unread_messages > 0}
            onClick={() => setSection("messages")}
            darkMode={darkMode}
            last
          />
        </div>

        <div className="grid grid-cols-3 gap-px bg-current/10">
          <QuickAction
            label="Add vehicle"
            detail="New stock"
            icon="plus"
            darkMode={darkMode}
            onClick={() =>
              window.location.assign(
                `/list-your-vehicle?plan=dealer&dealership=${context.dealership_id}`,
              )
            }
          />
          <QuickAction
            label="Post Status"
            detail="Reach followers"
            icon="status"
            gold
            darkMode={darkMode}
            onClick={() => setStatusOpen(true)}
          />
          <QuickAction
            label="Dealer page"
            detail="Edit profile"
            icon="store"
            darkMode={darkMode}
            onClick={() => setSection("showroom")}
          />
        </div>
      </section>

      {attention.length ? (
        <section
          className={`rounded-[18px] border p-2 ${
            darkMode
              ? "border-white/10 bg-[#0b0b0b]"
              : "border-black/[.08] bg-white"
          }`}
        >
          <div className="mb-2 px-2 pt-1 text-[9px] font-black uppercase tracking-[.12em] opacity-35">
            Needs attention
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {attention.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setSection(item.section)}
                className={`flex min-w-[150px] shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-left ${
                  darkMode
                    ? "border-white/10 bg-white/[.035]"
                    : "border-black/[.07] bg-[#faf8f2]"
                }`}
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#f6b800]" />
                <span className="min-w-0">
                  <span className="block truncate text-[10px] font-black opacity-45">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] font-black">
                    {item.detail}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[1.05fr_.95fr]">
        <Surface darkMode={darkMode} className="overflow-hidden rounded-[18px]">
          <div className="flex items-center justify-between gap-3 border-b border-current/10 px-4 py-3.5 sm:px-5">
            <div>
              <h2 className="text-[15px] font-black tracking-[-.02em]">Sales queue</h2>
              <p className="mt-0.5 text-[10px] font-semibold opacity-40">
                Who needs attention next
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSection("leads")}
              className="text-[10px] font-black opacity-45"
            >
              All leads →
            </button>
          </div>

          {appointments.length || priorities.length ? (
            <div className="divide-y divide-current/10">
              {appointments.slice(0, 1).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection("leads")}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-current/[.025] sm:px-5"
                >
                  <QueueMark gold />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-black">
                      {item.customer_name || "Customer viewing"}
                    </div>
                    <div className="mt-0.5 truncate text-[10px] opacity-45">
                      Viewing · {item.listing_title || item.appointment_type}
                    </div>
                  </div>
                  <span className="text-[10px] font-black opacity-40">
                    {new Date(item.starts_at).toLocaleTimeString("en-ZA", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </button>
              ))}

              {priorities.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => setSection("leads")}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-current/[.025] sm:px-5"
                >
                  <QueueMark
                    gold={
                      lead.priority === "high" ||
                      overdue.some((item) => item.id === lead.id)
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-black">
                      {lead.customer_name || "Customer enquiry"}
                    </div>
                    <div className="mt-0.5 truncate text-[10px] opacity-45">
                      {lead.listing_title || lead.source}
                    </div>
                  </div>
                  <span className="text-[10px] font-black opacity-35">
                    {relativeAge(lead.last_activity_at || lead.created_at)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nothing waiting"
              detail="New enquiries, viewings and follow-ups will appear here."
            />
          )}
        </Surface>

        <Surface darkMode={darkMode} className="overflow-hidden rounded-[18px]">
          <div className="flex items-center justify-between gap-3 border-b border-current/10 px-4 py-3.5 sm:px-5">
            <div>
              <h2 className="text-[15px] font-black tracking-[-.02em]">Status</h2>
              <p className="mt-0.5 text-[10px] font-semibold opacity-40">
                {live.length ? `${live.length} live now` : "Your latest dealership update"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSection("marketing")}
              className="text-[10px] font-black opacity-45"
            >
              Manage →
            </button>
          </div>

          {statusLoading ? (
            <div className="p-6 text-xs font-bold opacity-40">Loading Status…</div>
          ) : latest ? (
            <StatusPreview item={latest} darkMode={darkMode} />
          ) : (
            <EmptyState
              title="No Status yet"
              detail="Post a photo, video, vehicle or offer and it will appear here."
              action={
                <button
                  type="button"
                  onClick={() => setStatusOpen(true)}
                  className="rounded-lg bg-[#f6b800] px-4 py-2.5 text-xs font-black text-black"
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

function Metric({
  label,
  value,
  hot,
  onClick,
  darkMode,
  last,
}: {
  label: string;
  value: number;
  hot?: boolean;
  onClick: () => void;
  darkMode: boolean;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 px-1.5 py-3 text-center transition hover:bg-current/[.025] ${
        last ? "" : "border-r border-current/10"
      }`}
    >
      <div
        className={`text-[18px] font-black tracking-[-.03em] ${
          hot ? (darkMode ? "text-[#f6b800]" : "text-[#8b6800]") : ""
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 truncate text-[8px] font-black uppercase tracking-[.06em] opacity-35 sm:text-[9px]">
        {label}
      </div>
    </button>
  );
}

function QuickAction({
  label,
  detail,
  icon,
  onClick,
  gold,
  darkMode,
}: {
  label: string;
  detail: string;
  icon: "plus" | "status" | "store";
  onClick: () => void;
  gold?: boolean;
  darkMode: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[72px] px-3 py-3 text-left transition active:scale-[.985] sm:px-4 ${
        gold
          ? "bg-[#f6b800] text-black"
          : darkMode
            ? "bg-[#0b0b0b] text-white"
            : "bg-white text-black"
      }`}
    >
      <div className="flex items-center gap-2">
        <ActionIcon kind={icon} />
        <span className="truncate text-[11px] font-black sm:text-[12px]">{label}</span>
      </div>
      <div className={`mt-1 text-[9px] font-semibold ${gold ? "text-black/55" : "opacity-40"}`}>
        {detail}
      </div>
    </button>
  );
}

function ActionIcon({ kind }: { kind: "plus" | "status" | "store" }) {
  if (kind === "plus") {
    return <span className="text-base font-black leading-none">＋</span>;
  }
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

function QueueMark({ gold }: { gold?: boolean }) {
  return (
    <span
      className={`h-2 w-2 shrink-0 rounded-full ${
        gold ? "bg-[#f6b800]" : "bg-current opacity-20"
      }`}
    />
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
          <div
            className={`h-[94px] w-[84px] shrink-0 overflow-hidden rounded-xl ${
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
              <img src={item.media_url} alt="" className="h-full w-full object-cover" />
            )}
          </div>
        ) : (
          <div className="flex h-[94px] w-[84px] shrink-0 items-center justify-center rounded-xl border border-current/10 text-[9px] font-black uppercase opacity-40">
            {item.content_type}
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
            <span className="text-[9px] font-black uppercase tracking-[.09em] opacity-45">
              {ended ? "Ended" : item.publication_status.replaceAll("_", " ")}
            </span>
          </div>
          <h3 className="mt-2 truncate text-[14px] font-black">
            {item.title || item.listing_title || `${item.content_type} Status`}
          </h3>
          <p className="mt-1 line-clamp-2 text-[10px] leading-4 opacity-50">
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

function StatusStat({
  value,
  label,
  last,
}: {
  value: string | number;
  label: string;
  last?: boolean;
}) {
  return (
    <div className={`px-1 py-2.5 text-center ${last ? "" : "border-r border-current/10"}`}>
      <div className="text-[12px] font-black">{value}</div>
      <div className="mt-0.5 text-[8px] font-black uppercase opacity-35">{label}</div>
    </div>
  );
}
