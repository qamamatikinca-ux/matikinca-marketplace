"use client";

import { useState, type ReactNode } from "react";
import type { DealerAppointment, DealerLead, DealerSection, DealerSummary } from "@/lib/dealer/types";

type Props = {
  darkMode: boolean;
  summary: DealerSummary;
  leads: DealerLead[];
  appointments: DealerAppointment[];
  setSection: (section: DealerSection) => void;
  onRefresh: () => Promise<void>;
  children: ReactNode;
};

export default function DealerCompactOverview({ darkMode, summary, leads, appointments, setSection, onRefresh, children }: Props) {
  const [expanded, setExpanded] = useState(false);
  const surface = darkMode ? "border-white/10 bg-[#111111]" : "border-black/10 bg-white";
  const faint = darkMode ? "border-white/10 bg-white/[.025]" : "border-black/[.07] bg-[#fafafa]";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const metrics: Array<{ name: string; value: number; section: DealerSection; detail: string }> = [
    { name: "Live inventory", value: summary.live_stock, section: "inventory", detail: "Published vehicles" },
    { name: "New enquiries", value: summary.new_leads, section: "leads", detail: "Waiting for your team" },
    { name: "Unread messages", value: summary.unread_messages, section: "messages", detail: "Customer conversations" },
    { name: "Follow-ups due", value: summary.overdue_followups, section: "leads", detail: "Past their follow-up time" },
  ];
  const actions: Array<{ label: string; section: DealerSection; detail: string }> = [
    { label: "Manage stock", section: "inventory", detail: "Vehicles and listing status" },
    { label: "Sales leads", section: "leads", detail: "Enquiries and follow-ups" },
    { label: "Customer messages", section: "messages", detail: "Your dealership inbox" },
    { label: "Public showroom", section: "showroom", detail: "Dealership profile and display" },
    { label: "Performance", section: "analytics", detail: "Traffic and sales results" },
    { label: "Team management", section: "team", detail: "People and permissions" },
  ];
  return (
    <div className="grid gap-4" data-loadlink-dealer-overview="compact">
      <section className={"rounded-[24px] border p-5 sm:p-6 " + surface}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={"text-[11px] font-bold uppercase tracking-[.1em] " + muted}>Business at a glance</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">Your dealership today</h2>
            <p className={"mt-1 text-xs leading-5 " + muted}>Live figures from your LoadLink workspace.</p>
          </div>
          <button type="button" onClick={() => void onRefresh()} className={"min-h-10 rounded-full border px-4 text-xs font-bold " + (darkMode ? "border-white/15" : "border-black/15")}>Refresh data</button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {metrics.map((metric) => (
            <button type="button" key={metric.name} onClick={() => setSection(metric.section)}
              className={"min-w-0 rounded-[18px] border p-4 text-left transition hover:border-[#f6b800]/60 " + faint}>
              <span className={"block text-[11px] font-semibold " + muted}>{metric.name}</span>
              <strong className="mt-2 block text-[30px] font-bold leading-none tabular-nums tracking-tight">{metric.value.toLocaleString("en-ZA")}</strong>
              <span className={"mt-2 block text-[10px] leading-4 " + muted}>{metric.detail}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <section className={"min-w-0 rounded-[24px] border p-5 sm:p-6 " + surface}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold">Latest enquiries</h2>
            <button type="button" onClick={() => setSection("leads")} className="text-xs font-bold text-[#bd8700] underline underline-offset-4">View all</button>
          </div>
          {leads.length ? (
            <div className="mt-4 divide-y divide-current/10">
              {leads.slice(0, 3).map((lead) => (
                <button type="button" onClick={() => setSection("leads")} key={lead.id} className="flex min-h-[70px] w-full items-center justify-between gap-4 py-3 text-left">
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-bold">{lead.customer_name || "Customer enquiry"}</span>
                    <span className={"mt-1 block truncate text-[11px] " + muted}>{lead.listing_title || "Dealership enquiry"}</span>
                  </span>
                  <span className={"shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold capitalize " + (darkMode ? "border-white/15" : "border-black/10")}>{lead.status}</span>
                </button>
              ))}
            </div>
          ) : <p className={"mt-5 text-[13px] leading-6 " + muted}>No recent enquiries to display. New leads will appear here.</p>}
        </section>

        <section className={"min-w-0 rounded-[24px] border p-5 sm:p-6 " + surface}>
          <h2 className="text-base font-bold">Today's schedule</h2>
          <div className={"mt-4 rounded-[18px] border p-4 " + faint}>
            <span className={"block text-xs " + muted}>Appointments scheduled today</span>
            <strong className="mt-1 block text-2xl font-bold tabular-nums">{summary.appointments_today}</strong>
          </div>
          {appointments.slice(0, 2).map((appointment) => (
            <div key={appointment.id} className="mt-3 flex items-start justify-between gap-3 text-[12px]">
              <span className="min-w-0">
                <strong className="block truncate">{appointment.customer_name || "Customer appointment"}</strong>
                <span className={"mt-1 block truncate " + muted}>{appointment.listing_title || appointment.appointment_type}</span>
              </span>
              <span className={"shrink-0 text-[11px] " + muted}>{new Date(appointment.starts_at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          ))}
          <button type="button" onClick={() => setSection("leads")} className={"mt-5 min-h-11 w-full rounded-full border text-xs font-bold " + (darkMode ? "border-white/15" : "border-black/15")}>Manage appointments and leads</button>
        </section>
      </div>

      <section className={"rounded-[24px] border p-5 sm:p-6 " + surface}>
        <div>
          <h2 className="text-base font-bold">Dealership tools</h2>
          <p className={"mt-1 text-xs " + muted}>Go straight to the task you need. Other tools are in the navigation menu.</p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => (
            <button type="button" key={action.section} onClick={() => setSection(action.section)}
              className={"group min-w-0 rounded-[17px] border p-4 text-left transition hover:border-[#f6b800]/60 " + faint}>
              <span className="block text-[13px] font-bold">{action.label}</span>
              <span className={"mt-1 block text-[11px] leading-5 " + muted}>{action.detail}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={"overflow-hidden rounded-[24px] border " + surface}>
        <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}
          className="flex min-h-[68px] w-full items-center justify-between gap-4 px-5 text-left sm:px-6">
          <span><strong className="block text-[13px]">Detailed operational dashboard</strong><span className={"mt-1 block text-[11px] " + muted}>Status updates, extended reporting and daily priorities</span></span>
          <span className="shrink-0 text-[12px] font-bold text-[#bd8700]">{expanded ? "Show less" : "Open details"}</span>
        </button>
        {expanded ? <div className="grid gap-4 border-t border-current/10 p-3 sm:p-5">{children}</div> : null}
      </section>
    </div>
  );
}
