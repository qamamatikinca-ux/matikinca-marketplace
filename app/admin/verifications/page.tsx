"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type VerificationRequest = {
  id: string;
  full_name?: string | null;
  phone?: string | null;
  id_type?: string | null;
  id_number_last4?: string | null;
  status?: string | null;
  submitted_at?: string | null;
  id_document_path?: string | null;
  selfie_path?: string | null;
  company_document_path?: string | null;
};

export default function AdminVerifications() {
  const [items, setItems] = useState<VerificationRequest[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      if (!isSupabaseConfigured) throw new Error("Supabase is not configured for this deployment.");
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Sign in with an authorised LoadLink Control Centre account.");
      const result = await supabase.rpc("loadlink_admin_identity_verification_queue", {
        p_status: "pending",
        p_limit: 100,
        p_offset: 0,
      });
      if (result.error) throw result.error;
      setItems((result.data || []) as VerificationRequest[]);
    } catch (error) {
      setItems([]);
      setMessage(error instanceof Error ? error.message : "The verification queue could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function openDocument(path?: string | null) {
    if (!path) return;
    setMessage("");
    try {
      const result = await supabase.storage.from("verification-documents").createSignedUrl(path, 300);
      if (result.error) throw result.error;
      window.open(result.data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The verification document could not be opened.");
    }
  }

  async function review(id: string, decision: "verified" | "rejected") {
    let reason: string | null = null;
    if (decision === "rejected") {
      reason = window.prompt("Give the user a clear reason for rejection")?.trim() || "";
      if (reason.length < 5) {
        setMessage("A clear rejection reason is required.");
        return;
      }
    } else if (!window.confirm("Approve this identity verification?")) {
      return;
    }

    setBusyId(id);
    setMessage("");
    try {
      const result = await supabase.rpc("review_verification", { request_id: id, decision, reason });
      if (result.error) throw result.error;
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The review could not be saved.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f2eb] px-4 py-8 text-black sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9a7000]">LoadLink Control Centre</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.045em]">Identity verification</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-black/55">Review the user’s submitted identity files. Approval and rejection are written through the protected LoadLink moderation workflow.</p>
          </div>
          <div className="flex gap-2"><button type="button" onClick={() => void load()} className="rounded-xl border border-black/15 bg-white px-4 py-3 text-xs font-black">Refresh</button><Link href="/admin" className="rounded-xl bg-black px-4 py-3 text-xs font-black text-white">Control Centre</Link></div>
        </header>

        {message ? <section className="mt-5 rounded-[18px] border border-red-500/25 bg-red-50 p-4"><p className="text-sm font-bold text-red-900">{message}</p>{message.startsWith("Sign in") ? <Link href="/login?next=%2Fadmin%2Fverifications" className="mt-3 inline-flex rounded-xl bg-black px-4 py-2 text-xs font-black text-white">Sign in</Link> : null}</section> : null}
        {loading ? <div className="mt-8 rounded-[24px] border border-black/10 bg-white p-10 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-black/15 border-t-[#f6b800]" /><p className="mt-4 text-sm font-bold text-black/50">Loading verification requests…</p></div> : null}
        {!loading && !message && items.length === 0 ? <div className="mt-8 rounded-[24px] border border-black/10 bg-white p-9 text-center"><h2 className="text-2xl font-black">Queue clear</h2><p className="mt-2 text-sm font-semibold text-black/50">No pending identity verification requests.</p></div> : null}

        <div className="mt-6 grid gap-5">
          {items.map((item) => {
            const submitted = item.submitted_at ? new Date(item.submitted_at) : null;
            const submittedLabel = submitted && !Number.isNaN(submitted.getTime()) ? submitted.toLocaleString("en-ZA") : "Submission time unavailable";
            return <article key={item.id} className="rounded-[24px] border border-black/10 bg-white p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-2xl font-black tracking-[-.03em]">{item.full_name || "Unnamed applicant"}</h2><p className="mt-2 text-sm font-semibold text-black/55">{item.phone || "No phone number"} · {(item.id_type || "identity document").replaceAll("_", " ")}{item.id_number_last4 ? ` ending ${item.id_number_last4}` : ""}</p><span className="mt-3 inline-flex rounded-full bg-[#f6b800] px-3 py-1 text-[10px] font-black uppercase">{item.status || "pending"}</span></div><p className="text-xs font-semibold text-black/40">{submittedLabel}</p></div>
              <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => void openDocument(item.id_document_path)} disabled={!item.id_document_path} className="rounded-xl border border-black/15 px-4 py-2 text-xs font-black disabled:opacity-35">View ID</button><button type="button" onClick={() => void openDocument(item.selfie_path)} disabled={!item.selfie_path} className="rounded-xl border border-black/15 px-4 py-2 text-xs font-black disabled:opacity-35">View selfie</button>{item.company_document_path ? <button type="button" onClick={() => void openDocument(item.company_document_path)} className="rounded-xl border border-black/15 px-4 py-2 text-xs font-black">View company document</button> : null}</div>
              <div className="mt-5 flex flex-wrap gap-2"><button disabled={busyId === item.id} type="button" onClick={() => void review(item.id, "verified")} className="rounded-xl bg-[#f6b800] px-5 py-3 text-xs font-black disabled:opacity-40">{busyId === item.id ? "Saving…" : "Approve"}</button><button disabled={busyId === item.id} type="button" onClick={() => void review(item.id, "rejected")} className="rounded-xl bg-black px-5 py-3 text-xs font-black text-white disabled:opacity-40">Reject with reason</button></div>
            </article>;
          })}
        </div>
      </div>
    </main>
  );
}
