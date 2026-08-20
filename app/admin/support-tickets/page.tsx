"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import LoadLinkLoading from "@/components/LoadLinkLoading";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed" | "all";
type TicketRow = {
  id: string;
  ticket_number: string;
  requester_name?: string | null;
  requester_email?: string | null;
  subject: string;
  description: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  status: string;
  priority?: string | null;
  created_at: string;
  updated_at?: string | null;
};

const statuses: TicketStatus[] = ["open", "in_progress", "resolved", "closed", "all"];
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function SupportTicketsPage() {
  const [status, setStatus] = useState<TicketStatus>("open");
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      if (!isSupabaseConfigured) throw new Error("Supabase is not configured for this deployment.");
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sign in with an authorised LoadLink Support account.");
      const result = await supabase.rpc("loadlink_admin_support_ticket_queue", { p_status: status, p_limit: 150, p_offset: 0 });
      if (result.error) throw result.error;
      setRows((result.data || []) as TicketRow[]);
    } catch (error) {
      setRows([]);
      setMessage(error instanceof Error ? error.message : "Support tickets could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  async function review(row: TicketRow, action: "in_progress" | "resolved" | "closed") {
    let note = "";
    if (action === "resolved" || action === "closed") {
      note = window.prompt(action === "resolved" ? "Resolution sent to the user" : "Reason for closing this ticket")?.trim() || "";
      if (note.length < 5) {
        setMessage("Add a clear outcome before closing this support request.");
        return;
      }
    }
    setBusyId(row.id);
    setMessage("");
    try {
      const result = await supabase.rpc("loadlink_admin_review_support_ticket", { p_ticket_id: row.id, p_action: action, p_note: note || null });
      if (result.error) throw result.error;
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The support-ticket update could not be saved.");
    } finally {
      setBusyId("");
    }
  }

  function relatedHref(row: TicketRow) {
    if (row.related_entity_type === "listing" && row.related_entity_id) return `/listing/${row.related_entity_id}`;
    if (row.related_entity_type === "page" && row.related_entity_id?.startsWith("/")) return row.related_entity_id;
    return "";
  }

  if (loading && rows.length === 0) return <main className="min-h-screen bg-[#f4f2eb] text-black"><LoadLinkLoading /></main>;

  return (
    <main className="min-h-screen bg-[#f4f2eb] px-4 py-8 text-black sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9a7000]">LoadLink Control Centre</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.045em]">Support tickets</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-black/55">Requests created through Talk to support arrive here with the page context required to investigate them.</p>
          </div>
          <Link href="/admin" className="self-start rounded-xl bg-black px-4 py-3 text-xs font-black text-white">Control Centre</Link>
        </header>

        <div className="mt-5 flex gap-2 overflow-x-auto rounded-[20px] border border-black/10 bg-white p-3" data-loadlink-swipe-dots="true">
          {statuses.map((option) => <button key={option} type="button" onClick={() => setStatus(option)} className={`shrink-0 rounded-full px-4 py-2 text-[11px] font-black ${status === option ? "bg-[#f6b800] text-black" : "bg-[#f6f4ee] text-black/60"}`}>{label(option)}</button>)}
        </div>

        {message ? <p className="mt-5 rounded-[18px] border border-red-500/25 bg-red-50 p-4 text-sm font-bold text-red-900">{message}</p> : null}
        {!loading && !message && rows.length === 0 ? <div className="mt-8 rounded-[24px] border border-black/10 bg-white p-9 text-center"><h2 className="text-2xl font-black">Queue clear</h2><p className="mt-2 text-sm font-semibold text-black/50">No support tickets match this view.</p></div> : null}

        <div className="mt-6 grid gap-4">
          {rows.map((row) => {
            const href = relatedHref(row);
            return <article key={row.id} className="rounded-[24px] border border-black/10 bg-white p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2"><span className="rounded-full bg-black px-3 py-1 text-[10px] font-black text-white">{label(row.status)}</span><span className="rounded-full bg-[#f6b800] px-3 py-1 text-[10px] font-black text-black">{row.ticket_number}</span></div>
                  <h2 className="mt-3 break-words text-xl font-black">{row.subject}</h2>
                  <p className="mt-1 text-xs font-semibold text-black/45">{row.requester_name || "LoadLink member"}{row.requester_email ? ` · ${row.requester_email}` : ""}</p>
                  <p className="mt-1 text-xs font-semibold text-black/40">Created {new Date(row.created_at).toLocaleString("en-ZA")}</p>
                </div>
                {href ? <Link href={href} className="shrink-0 rounded-xl border border-black/10 px-4 py-3 text-xs font-black">Open related page</Link> : null}
              </div>

              <div className="mt-5 rounded-[18px] bg-[#f7f5ef] p-4"><p className="text-[10px] font-black uppercase tracking-[.12em] text-black/35">Customer description</p><p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-black/65">{row.description}</p></div>

              {row.status === "open" || row.status === "in_progress" ? <div className="mt-5 flex flex-wrap gap-2">
                {row.status === "open" ? <button disabled={busyId === row.id} type="button" onClick={() => void review(row, "in_progress")} className="rounded-xl border border-black/10 px-4 py-3 text-xs font-black disabled:opacity-40">Start review</button> : null}
                <button disabled={busyId === row.id} type="button" onClick={() => void review(row, "resolved")} className="rounded-xl bg-[#f6b800] px-4 py-3 text-xs font-black text-black disabled:opacity-40">Resolve</button>
                <button disabled={busyId === row.id} type="button" onClick={() => void review(row, "closed")} className="rounded-xl bg-black px-4 py-3 text-xs font-black text-white disabled:opacity-40">Close</button>
              </div> : null}
            </article>;
          })}
        </div>
      </div>
    </main>
  );
}
