"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type QueueStatus = "pending" | "all" | "approved" | "rejected";
type DriverDocument = {
  id: string;
  document_type: string;
  storage_path: string;
  original_filename?: string | null;
  validation_status?: string | null;
};
type DriverRow = {
  id: string;
  user_id: string;
  full_name?: string | null;
  headline?: string | null;
  city?: string | null;
  province?: string | null;
  phone?: string | null;
  email?: string | null;
  years_experience?: number | null;
  licence_code?: string | null;
  licence_expiry?: string | null;
  prdp_required?: boolean | null;
  prdp_expiry?: string | null;
  vehicle_types?: string[] | null;
  route_experience?: string[] | null;
  languages?: string[] | null;
  previous_roles?: string | null;
  availability?: string | null;
  bio?: string | null;
  status?: string | null;
  profile_status?: string | null;
  verification_level?: string | null;
  review_reason?: string | null;
  profile_image_url?: string | null;
  submitted_at?: string | null;
  documents?: DriverDocument[] | null;
};

const statuses: QueueStatus[] = ["pending", "all", "approved", "rejected"];
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function AdminDriversPage() {
  const [rows, setRows] = useState<DriverRow[]>([]);
  const [status, setStatus] = useState<QueueStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      if (!isSupabaseConfigured) throw new Error("Supabase is not configured for this deployment.");
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sign in with an authorised LoadLink Control Centre account.");
      const result = await supabase.rpc("loadlink_admin_driver_queue", { p_status: status, p_limit: 150, p_offset: 0 });
      if (result.error) throw result.error;
      setRows((result.data || []) as DriverRow[]);
    } catch (error) {
      setRows([]);
      setMessage(error instanceof Error ? error.message : "The driver review queue could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  async function openDocument(path: string) {
    setMessage("");
    try {
      const result = await supabase.storage.from("loadlink-driver-documents").createSignedUrl(path, 300);
      if (result.error) throw result.error;
      window.open(result.data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The driver document could not be opened.");
    }
  }

  async function review(row: DriverRow, action: "approve" | "reject") {
    let reason: string | null = null;
    if (action === "reject") {
      reason = window.prompt("Give the driver a clear reason and what needs to change")?.trim() || "";
      if (reason.length < 5) {
        setMessage("A clear rejection reason is required.");
        return;
      }
    } else if (!window.confirm(`Approve ${row.full_name || "this driver"} for the LoadLink Driver marketplace?`)) {
      return;
    }

    setBusyId(row.id);
    setMessage("");
    try {
      const result = await supabase.rpc("loadlink_admin_review_driver", { p_driver_id: row.id, p_action: action, p_reason: reason });
      if (result.error) throw result.error;
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The driver decision could not be saved.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f2eb] px-4 py-8 text-black sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9a7000]">LoadLink Control Centre</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.045em]">Driver reviews</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-black/55">Review driver profiles and their private documents before they appear in the public Driver marketplace.</p>
          </div>
          <Link href="/admin" className="self-start rounded-xl bg-black px-4 py-3 text-xs font-black text-white">Control Centre</Link>
        </header>

        <div className="mt-5 flex flex-wrap gap-2 rounded-[20px] border border-black/10 bg-white p-3">
          {statuses.map((option) => <button key={option} type="button" onClick={() => setStatus(option)} className={`rounded-full px-4 py-2 text-[11px] font-black ${status === option ? "bg-[#f6b800] text-black" : "bg-[#f6f4ee] text-black/60"}`}>{label(option)}</button>)}
        </div>

        {message ? <p className="mt-5 rounded-[18px] border border-red-500/25 bg-red-50 p-4 text-sm font-bold text-red-900">{message}</p> : null}
        {loading ? <div className="mt-8 rounded-[24px] border border-black/10 bg-white p-10 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-black/15 border-t-[#f6b800]" /><p className="mt-4 text-sm font-bold text-black/50">Loading driver reviews…</p></div> : null}
        {!loading && !message && rows.length === 0 ? <div className="mt-8 rounded-[24px] border border-black/10 bg-white p-9 text-center"><h2 className="text-2xl font-black">Queue clear</h2><p className="mt-2 text-sm font-semibold text-black/50">No driver profiles match this view.</p></div> : null}

        <div className="mt-6 grid gap-5">
          {rows.map((row) => {
            const documents = Array.isArray(row.documents) ? row.documents : [];
            return <article key={row.id} className="rounded-[26px] border border-black/10 bg-white p-5 shadow-[0_16px_45px_rgba(0,0,0,.035)] sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-[#ece9df]">{row.profile_image_url ? <img src={row.profile_image_url} alt={row.full_name || "Driver"} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xl font-black text-black/25">LL</div>}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-black px-3 py-1 text-[10px] font-black text-white">{label(row.status || "pending")}</span><span className="rounded-full bg-[#f6b800] px-3 py-1 text-[10px] font-black text-black">{documents.length} documents</span></div><h2 className="mt-3 text-2xl font-black tracking-[-.035em]">{row.full_name || "Unnamed driver"}</h2><p className="mt-1 text-sm font-semibold text-black/55">{row.headline || "LoadLink driver applicant"}</p><p className="mt-1 text-xs font-semibold text-black/40">{row.email || "No email"} · {row.phone || "No phone"}</p></div>
                    <div className="rounded-[16px] bg-[#f7f5ef] p-3 text-xs font-bold text-black/60"><p>{row.city || "City unavailable"}{row.province ? `, ${row.province}` : ""}</p><p className="mt-1">{row.years_experience ?? 0} years experience · Licence {row.licence_code || "not provided"}</p>{row.licence_expiry ? <p className="mt-1">Licence expires {new Date(row.licence_expiry).toLocaleDateString("en-ZA")}</p> : null}{row.prdp_required ? <p className="mt-1">PrDP {row.prdp_expiry ? `expires ${new Date(row.prdp_expiry).toLocaleDateString("en-ZA")}` : "required"}</p> : null}</div>
                  </div>

                  {row.bio ? <p className="mt-4 text-sm font-medium leading-6 text-black/60">{row.bio}</p> : null}
                  <div className="mt-4 grid gap-2 sm:grid-cols-3"><Info label="Vehicle types" value={(row.vehicle_types || []).join(", ") || "Not supplied"} /><Info label="Routes" value={(row.route_experience || []).join(", ") || "Not supplied"} /><Info label="Languages" value={(row.languages || []).join(", ") || "Not supplied"} /></div>

                  <div className="mt-4 flex flex-wrap gap-2">{documents.map((document) => <button key={document.id} type="button" onClick={() => void openDocument(document.storage_path)} className="rounded-xl border border-black/12 bg-[#f7f5ef] px-3 py-2 text-[11px] font-black">View {label(document.document_type)}</button>)}</div>

                  {row.status === "pending" ? <div className="mt-5 flex flex-wrap gap-2"><button disabled={busyId === row.id} type="button" onClick={() => void review(row, "approve")} className="rounded-xl bg-[#f6b800] px-5 py-3 text-xs font-black text-black disabled:opacity-40">{busyId === row.id ? "Saving…" : "Approve driver"}</button><button disabled={busyId === row.id} type="button" onClick={() => void review(row, "reject")} className="rounded-xl bg-black px-5 py-3 text-xs font-black text-white disabled:opacity-40">Reject with reason</button></div> : null}
                  {row.review_reason ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-bold leading-5 text-red-900">Review reason: {row.review_reason}</p> : null}
                </div>
              </div>
            </article>;
          })}
        </div>
      </div>
    </main>
  );
}

function Info({ label: title, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-black/8 bg-[#faf9f5] p-3"><p className="text-[9px] font-black uppercase tracking-[.1em] text-black/35">{title}</p><p className="mt-1 text-xs font-semibold leading-5 text-black/65">{value}</p></div>;
}
