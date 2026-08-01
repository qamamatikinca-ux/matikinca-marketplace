"use client";

import { useEffect, useMemo, useState } from "react";
import AccessibleDialog from "@/components/platform/AccessibleDialog";
import { authenticatedFetch } from "@/lib/client/authenticatedFetch";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type AdminRecordType = "listings" | "cases" | "payments" | "tickets" | "dealers" | "drivers" | "users" | "fraud" | "reviews";
type RecordRow = Record<string, unknown> & { id?: string };
type Action = { label: string; value: string; tone?: "gold" | "danger" | "neutral" };

const ACTIONS: Partial<Record<AdminRecordType, Action[]>> = {
  listings: [
    { label: "Approve", value: "approved", tone: "gold" },
    { label: "Reject", value: "rejected", tone: "danger" },
  ],
  dealers: [
    { label: "Approve", value: "approved", tone: "gold" },
    { label: "Reject", value: "rejected", tone: "danger" },
    { label: "Suspend", value: "suspended", tone: "danger" },
  ],
  drivers: [
    { label: "Approve", value: "approved", tone: "gold" },
    { label: "Reject", value: "rejected", tone: "danger" },
  ],
  reviews: [
    { label: "Publish", value: "approved", tone: "gold" },
    { label: "Reject", value: "rejected", tone: "danger" },
  ],
  cases: [
    { label: "Start", value: "in_progress", tone: "gold" },
    { label: "Resolve", value: "resolved", tone: "neutral" },
  ],
  tickets: [
    { label: "Start", value: "in_progress", tone: "gold" },
    { label: "Resolve", value: "resolved", tone: "neutral" },
  ],
  fraud: [
    { label: "Reviewed", value: "reviewed", tone: "neutral" },
    { label: "Escalate", value: "escalated", tone: "danger" },
    { label: "Dismiss", value: "dismissed", tone: "neutral" },
  ],
};

const ENTITY_BY_TYPE: Partial<Record<AdminRecordType, string>> = {
  dealers: "dealership",
  drivers: "driver",
  reviews: "review",
  cases: "case",
  tickets: "ticket",
  fraud: "fraud",
};

export default function AdminRecords({ type, title, emptyText }: { type: AdminRecordType; title: string; emptyText: string }) {
  const { darkMode } = useLoadLinkTheme();
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RecordRow | null>(null);
  const [decision, setDecision] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await authenticatedFetch(`/api/admin/records?type=${type}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Records could not be loaded.");
      setRows(data.rows || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Records could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [type]);

  const visible = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    return !normalized ? rows : rows.filter((row) => JSON.stringify(row).toLowerCase().includes(normalized));
  }, [query, rows]);

  async function applyAction() {
    if (!selected?.id || !decision) return;
    const needsReason = ["rejected", "resolved", "escalated", "suspended"].includes(decision);
    if (needsReason && reason.trim().length < 5) {
      setError("Add a clear reason or resolution of at least five characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const isListing = type === "listings";
      const endpoint = isListing ? "/api/admin/review" : "/api/admin/action";
      const body = isListing
        ? { listingId: selected.id, decision, reason }
        : { entityType: ENTITY_BY_TYPE[type], id: selected.id, decision, reason };
      const response = await authenticatedFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The record could not be updated.");
      setSelected(null);
      setDecision(null);
      setReason("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The record could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const actions = ACTIONS[type] || [];

  return <>
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
      <div><h2 className="text-3xl font-black">{title}</h2><p className={`mt-1 text-sm ${muted}`}>{visible.length} records</p></div>
      <div className="flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this queue" className={`h-11 rounded-xl border px-4 font-bold outline-none focus:border-[#f6b800] ${surface}`} /><button type="button" onClick={() => void load()} className="h-11 rounded-xl bg-[#f6b800] px-4 text-xs font-black text-black">Refresh</button></div>
    </div>
    {error ? <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 font-bold text-red-500">{error}</p> : null}
    {loading ? <p className={`mt-6 ${muted}`}>Loading records…</p> : visible.length ? <div className="mt-5 grid gap-3">{visible.map((row, index) => <article key={String(row.id || index)} className={`rounded-2xl border p-4 ${surface}`}>
      <div className="flex flex-col justify-between gap-3 md:flex-row"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#b88900]">{String(row.status || row.moderation_status || row.verification_status || row.profile_status || type)}</p><h3 className="mt-1 truncate text-lg font-black">{String(row.title || row.name || row.full_name || row.case_number || row.ticket_number || row.reference || row.id || "Record")}</h3><p className={`mt-2 line-clamp-2 text-xs leading-5 ${muted}`}>{String(row.reason || row.subject || row.city || row.entity_type || row.payment_type || "Open the record to review complete information.")}</p></div>
        <div className="flex shrink-0 flex-wrap gap-2">{actions.map((action) => <button key={action.value} type="button" onClick={() => { setSelected(row); setDecision(action.value); setReason(""); }} className={action.tone === "gold" ? "h-10 rounded-xl bg-[#f6b800] px-4 text-xs font-black text-black" : action.tone === "danger" ? "h-10 rounded-xl border border-red-500/40 px-4 text-xs font-black text-red-500" : "h-10 rounded-xl border border-current/15 px-4 text-xs font-black"}>{action.label}</button>)}<button type="button" onClick={() => { setSelected(row); setDecision(null); }} className="h-10 rounded-xl border border-current/15 px-4 text-xs font-black">View</button></div>
      </div>
    </article>)}</div> : <p className={`mt-6 rounded-xl border p-6 text-center ${surface} ${muted}`}>{emptyText}</p>}
    <AccessibleDialog open={Boolean(selected)} onClose={() => { setSelected(null); setDecision(null); setReason(""); }} title={decision ? `${decision.replaceAll("_", " ")} record` : "Record details"} description={decision ? "This action updates the record, user notification, Control Centre, public visibility and audit history together." : "Read-only record view."} darkMode={darkMode}>
      {selected ? <div className="grid gap-4">{decision && ["rejected", "resolved", "escalated", "suspended"].includes(decision) ? <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Write the reason, correction or resolution" className="min-h-32 rounded-xl border border-current/15 bg-transparent p-4" /> : null}{decision ? <button type="button" disabled={busy} onClick={() => void applyAction()} className="h-12 rounded-xl bg-[#f6b800] font-black text-black">{busy ? "Updating…" : `Confirm ${decision.replaceAll("_", " ")}`}</button> : <pre className={`max-h-[55dvh] overflow-auto whitespace-pre-wrap rounded-xl p-4 text-xs ${darkMode ? "bg-white/5" : "bg-black/5"}`}>{JSON.stringify(selected, null, 2)}</pre>}</div> : null}
    </AccessibleDialog>
  </>;
}
