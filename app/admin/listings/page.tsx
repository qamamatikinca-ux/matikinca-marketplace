"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type ListingKind = "all" | "job" | "contract" | "vehicle";
type ModerationStatus = "pending" | "approved" | "rejected" | "all";

type QueueItem = {
  id: string;
  title?: string | null;
  city?: string | null;
  listing_kind?: string | null;
  vehicle_group?: string | null;
  rate?: string | null;
  posted_by?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  package_type?: string | null;
  photos?: string[] | null;
  description?: string | null;
  moderation_status?: string | null;
  moderation_notes?: string | null;
  rejection_reason?: string | null;
  status?: string | null;
  lifecycle_status?: string | null;
  stock_status?: string | null;
  dealership_id?: string | null;
  dealership_name?: string | null;
  dealership_verification_status?: string | null;
  dealership_platform_status?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  vehicle_verification_status?: string | null;
  id_document_path?: string | null;
  licence_document_path?: string | null;
  registration_document_path?: string | null;
  ownership_document_path?: string | null;
  company_registration_document_path?: string | null;
  tax_document_path?: string | null;
  business_address_document_path?: string | null;
  representative_authority_document_path?: string | null;
};

const statusOptions: ModerationStatus[] = ["pending", "all", "approved", "rejected"];
const kindOptions: ListingKind[] = ["all", "job", "contract", "vehicle"];

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function AdminListingsPage() {
  const [rows, setRows] = useState<QueueItem[]>([]);
  const [status, setStatus] = useState<ModerationStatus>("pending");
  const [kind, setKind] = useState<ListingKind>("all");
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
      const result = await supabase.rpc("loadlink_admin_listing_queue", {
        p_status: status,
        p_kind: kind,
        p_limit: 150,
        p_offset: 0,
      });
      if (result.error) throw result.error;
      setRows((result.data || []) as QueueItem[]);
    } catch (error) {
      setRows([]);
      setMessage(error instanceof Error ? error.message : "The moderation queue could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [kind, status]);

  useEffect(() => { void load(); }, [load]);

  async function review(item: QueueItem, decision: "approved" | "rejected") {
    let reason: string | null = null;
    if (decision === "rejected") {
      reason = window.prompt("Give the user a clear reason for rejection")?.trim() || "";
      if (reason.length < 5) {
        setMessage("A clear rejection reason is required.");
        return;
      }
    } else if (!window.confirm(`Approve “${item.title || "this listing"}” for LoadLink?`)) {
      return;
    }

    setBusyId(item.id);
    setMessage("");
    try {
      const result = await supabase.rpc("loadlink_review_listing", {
        p_listing_id: item.id,
        p_decision: decision,
        p_reason: reason,
      });
      if (result.error) throw result.error;
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The listing decision could not be saved.");
    } finally {
      setBusyId("");
    }
  }

  async function openVerificationDocument(path?: string | null) {
    if (!path) return;
    setMessage("");
    try {
      const result = await supabase.storage.from("vehicle-verification").createSignedUrl(path, 300);
      if (result.error) throw result.error;
      window.open(result.data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The verification document could not be opened.");
    }
  }

  const pendingCount = useMemo(() => rows.filter((row) => row.moderation_status === "pending").length, [rows]);

  return (
    <main className="min-h-screen bg-[#f4f2eb] px-4 py-7 text-black sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-black/10 pb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9a7000]">LoadLink Control Centre</p>
              <h1 className="mt-2 text-4xl font-black tracking-[-.045em]">Listing moderation</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-black/55">Review jobs, contracts and vehicle listings before they become public. Dealer stock also checks dealership approval and photo requirements server-side.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void load()} className="rounded-xl border border-black/15 bg-white px-4 py-3 text-xs font-black">Refresh</button>
              <Link href="/admin" className="rounded-xl bg-black px-4 py-3 text-xs font-black text-white">Control Centre</Link>
            </div>
          </div>
        </header>

        <section className="mt-5 flex flex-col gap-3 rounded-[22px] border border-black/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => <button key={option} type="button" onClick={() => setStatus(option)} className={`rounded-full px-4 py-2 text-[11px] font-black ${status === option ? "bg-black text-white" : "border border-black/10 bg-[#f7f5ef] text-black"}`}>{label(option)}</button>)}
          </div>
          <div className="flex flex-wrap gap-2">
            {kindOptions.map((option) => <button key={option} type="button" onClick={() => setKind(option)} className={`rounded-full px-4 py-2 text-[11px] font-black ${kind === option ? "bg-[#f6b800] text-black" : "border border-black/10 bg-[#f7f5ef] text-black"}`}>{label(option)}</button>)}
          </div>
        </section>

        {!loading && !message ? <p className="mt-4 text-xs font-bold text-black/45">{rows.length} shown{status === "all" ? ` · ${pendingCount} pending` : ""}</p> : null}
        {message ? <div className="mt-5 rounded-[18px] border border-red-500/25 bg-red-50 p-4 text-sm font-bold text-red-900">{message}</div> : null}
        {loading ? <div className="mt-8 rounded-[24px] border border-black/10 bg-white p-10 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-black/15 border-t-[#f6b800]" /><p className="mt-4 text-sm font-bold text-black/50">Loading moderation queue…</p></div> : null}
        {!loading && !message && rows.length === 0 ? <div className="mt-8 rounded-[24px] border border-black/10 bg-white p-9 text-center"><h2 className="text-2xl font-black">Queue clear</h2><p className="mt-2 text-sm font-semibold text-black/50">No listings match these filters.</p></div> : null}

        <div className="mt-6 grid gap-5">
          {rows.map((item) => {
            const photos = Array.isArray(item.photos) ? item.photos.filter(Boolean) : [];
            const created = item.created_at ? new Date(item.created_at) : null;
            const dealerBlocked = Boolean(item.dealership_id && (item.dealership_verification_status !== "approved" || item.dealership_platform_status !== "active"));
            const documents = [
              ["ID", item.id_document_path],
              ["Licence", item.licence_document_path],
              ["Registration", item.registration_document_path],
              ["Ownership", item.ownership_document_path],
              ["Company", item.company_registration_document_path],
              ["Tax", item.tax_document_path],
              ["Address", item.business_address_document_path],
              ["Authority", item.representative_authority_document_path],
            ].filter((entry) => Boolean(entry[1])) as [string, string][];

            return <article key={item.id} className="overflow-hidden rounded-[26px] border border-black/10 bg-white shadow-[0_18px_50px_rgba(0,0,0,.04)]">
              <div className="grid md:grid-cols-[210px_1fr]">
                <div className="min-h-44 bg-[#ece9df] md:min-h-full">{photos[0] ? <img src={photos[0]} alt={item.title || "Listing"} className="h-full min-h-44 w-full object-cover" /> : <div className="flex h-full min-h-44 items-center justify-center text-xs font-black uppercase tracking-[.12em] text-black/30">No listing photo</div>}</div>
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2"><span className="rounded-full bg-black px-3 py-1 text-[10px] font-black text-white">{label(item.listing_kind || "listing")}</span><span className="rounded-full bg-[#f6b800] px-3 py-1 text-[10px] font-black text-black">{label(item.package_type || "standard")}</span><span className="rounded-full border border-black/10 px-3 py-1 text-[10px] font-black">{label(item.moderation_status || "pending")}</span></div>
                      <h2 className="mt-3 text-2xl font-black tracking-[-.035em]">{item.title || "Untitled listing"}</h2>
                      <p className="mt-2 text-sm font-semibold text-black/55">{item.city || "Location unavailable"} · {item.vehicle_group || "General"}{item.rate ? ` · ${item.rate}` : ""}</p>
                      <p className="mt-1 text-xs font-semibold text-black/40">{item.owner_name || item.posted_by || "Unknown owner"}{item.owner_email ? ` · ${item.owner_email}` : ""}{created && !Number.isNaN(created.getTime()) ? ` · ${created.toLocaleString("en-ZA")}` : ""}</p>
                    </div>
                    {item.dealership_id ? <div className={`rounded-[16px] border p-3 text-xs font-bold ${dealerBlocked ? "border-red-500/25 bg-red-50 text-red-900" : "border-emerald-500/25 bg-emerald-50 text-emerald-900"}`}><p className="font-black">{item.dealership_name || "Dealer stock"}</p><p className="mt-1">Verification: {label(item.dealership_verification_status || "unknown")} · Platform: {label(item.dealership_platform_status || "unknown")}</p></div> : null}
                  </div>

                  <p className="mt-4 whitespace-pre-line text-sm font-medium leading-6 text-black/65">{item.description || "No description supplied."}</p>
                  {photos.length ? <p className="mt-3 text-xs font-black text-black/40">{photos.length} photo{photos.length === 1 ? "" : "s"}</p> : null}

                  {documents.length ? <div className="mt-4 flex flex-wrap gap-2">{documents.map(([documentLabel, path]) => <button key={`${documentLabel}-${path}`} type="button" onClick={() => void openVerificationDocument(path)} className="rounded-xl border border-black/12 bg-[#f7f5ef] px-3 py-2 text-[11px] font-black">View {documentLabel}</button>)}</div> : null}

                  {item.moderation_status === "pending" ? <div className="mt-5 flex flex-wrap gap-2"><button disabled={busyId === item.id || dealerBlocked} type="button" onClick={() => void review(item, "approved")} className="rounded-xl bg-[#f6b800] px-5 py-3 text-xs font-black text-black disabled:cursor-not-allowed disabled:opacity-40">{busyId === item.id ? "Saving…" : "Approve"}</button><button disabled={busyId === item.id} type="button" onClick={() => void review(item, "rejected")} className="rounded-xl bg-black px-5 py-3 text-xs font-black text-white disabled:opacity-40">Reject with reason</button>{dealerBlocked ? <p className="flex items-center text-xs font-bold text-red-700">Approve the dealership before approving this stock.</p> : null}</div> : null}
                  {item.rejection_reason || item.moderation_notes ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-bold leading-5 text-red-900">Reason: {item.rejection_reason || item.moderation_notes}</p> : null}
                </div>
              </div>
            </article>;
          })}
        </div>
      </div>
    </main>
  );
}
