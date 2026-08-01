"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import AccessibleDialog from "@/components/platform/AccessibleDialog";
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
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      if (!isSupabaseConfigured) {
        setMessage("Supabase is not configured for this deployment.");
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        setMessage(authError.message);
        return;
      }

      if (!authData.user) {
        setMessage("Sign in with an authorised LoadLink admin account to view verification requests.");
        return;
      }

      const result = await supabase
        .from("verification_requests")
        .select("*")
        .order("submitted_at", { ascending: true });

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      setItems((result.data || []) as VerificationRequest[]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The verification queue could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDocument(path?: string | null) {
    if (!path) {
      setMessage("This document is not available.");
      return;
    }

    try {
      const result = await supabase.storage
        .from("verification-documents")
        .createSignedUrl(path, 300);

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      window.open(result.data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The document could not be opened.");
    }
  }

  async function review(id: string, decision: "verified" | "rejected", reason: string | null = null) {
    if (decision === "rejected" && (!reason || reason.trim().length < 10)) {
      setMessage("Add a clear rejection reason of at least 10 characters.");
      return;
    }

    try {
      const result = await supabase.rpc("review_verification", {
        request_id: id,
        decision,
        reason,
      });

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      setRejectId(null);
      setRejectReason("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The review could not be saved.");
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f5f0] px-5 py-8 text-black">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a6a00]">LoadLink admin</p>
            <h1 className="mt-2 text-3xl font-black">Verification reviews</h1>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void load()}
              className="border border-black px-4 py-2 text-sm font-black"
            >
              Refresh
            </button>
            <Link href="/" className="bg-black px-4 py-2 text-sm font-black text-white">
              Home
            </Link>
          </div>
        </header>

        <p className="mt-4 text-sm leading-6 text-black/60">
          Supabase admin policies protect this queue. Unauthorised accounts cannot read or approve requests.
        </p>

        {message ? (
          <section className="mt-5 border border-red-300 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-900">{message}</p>
            {message.startsWith("Sign in") ? (
              <Link
                href="/login?next=%2Fadmin%2Fverifications"
                className="mt-3 inline-block bg-black px-4 py-2 text-sm font-black text-white"
              >
                Sign in
              </Link>
            ) : null}
          </section>
        ) : null}

        {loading ? (
          <div className="mt-8 border border-black/10 bg-white p-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-black/15 border-t-[#f6b800]" />
            <p className="mt-4 text-sm font-bold text-black/60">Loading verification requests…</p>
          </div>
        ) : null}

        {!loading && !message && items.length === 0 ? (
          <div className="mt-8 border border-black/10 bg-white p-8 text-center">
            <h2 className="text-xl font-black">No verification requests</h2>
            <p className="mt-2 text-sm text-black/55">New submissions will appear here.</p>
          </div>
        ) : null}

        <div className="mt-7 grid gap-5">
          {items.map((item) => {
            const idType = (item.id_type || "identity document").replaceAll("_", " ");
            const submitted = item.submitted_at ? new Date(item.submitted_at) : null;
            const submittedLabel = submitted && !Number.isNaN(submitted.getTime())
              ? submitted.toLocaleString("en-ZA")
              : "Submission time unavailable";
            const status = item.status || "pending";

            return (
              <article key={item.id} className="border border-black/10 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black">{item.full_name || "Unnamed applicant"}</h2>
                    <p className="mt-1 text-sm text-black/60">
                      {item.phone || "No phone number"} · {idType}
                      {item.id_number_last4 ? ` ending ${item.id_number_last4}` : ""}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[#9a6a00]">
                      {status}
                    </p>
                  </div>
                  <p className="text-xs text-black/50">{submittedLabel}</p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void openDocument(item.id_document_path)}
                    className="border border-black px-4 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!item.id_document_path}
                  >
                    View ID
                  </button>
                  <button
                    type="button"
                    onClick={() => void openDocument(item.selfie_path)}
                    className="border border-black px-4 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!item.selfie_path}
                  >
                    View selfie
                  </button>
                  {item.company_document_path ? (
                    <button
                      type="button"
                      onClick={() => void openDocument(item.company_document_path)}
                      className="border border-black px-4 py-2 text-sm font-black"
                    >
                      View company document
                    </button>
                  ) : null}
                </div>

                {status === "pending" ? (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void review(item.id, "verified")}
                      className="bg-[#f6b800] px-5 py-3 font-black"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRejectId(item.id); setRejectReason(""); }}
                      className="bg-black px-5 py-3 font-black text-white"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
      <AccessibleDialog open={Boolean(rejectId)} onClose={() => setRejectId(null)} title="Reject verification request" description="Explain exactly what could not be verified so the user knows what to correct." darkMode={false}>
        <textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} className="min-h-36 w-full rounded-xl border border-black/15 bg-white p-4 outline-none focus:border-[#f6b800]" placeholder="Example: The identity document is unreadable and the name does not match the profile." />
        <button type="button" onClick={() => rejectId && void review(rejectId, "rejected", rejectReason)} className="mt-4 h-12 w-full rounded-xl bg-black font-black text-white">Save rejection reason</button>
      </AccessibleDialog>
    </main>
  );
}
