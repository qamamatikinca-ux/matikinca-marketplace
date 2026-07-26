"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import HomeLogoLink from "@/components/HomeLogoLink";
import { isAuthenticatedUser, loginHref } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

type Status =
  | "not_started"
  | "phone_verified"
  | "pending"
  | "under_review"
  | "more_information_required"
  | "verified"
  | "rejected";

type VerificationRow = {
  status: Status;
  rejection_reason?: string | null;
  reviewer_notes?: string | null;
};

export default function VerificationStatusPage() {
  const [status, setStatus] = useState<Status>("not_started");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let userId = "";

    function applyRow(row: VerificationRow | null) {
      if (!active) return;
      setStatus(row?.status || "not_started");
      setReason(row?.rejection_reason || row?.reviewer_notes || "");
      setLoading(false);
    }

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isAuthenticatedUser(user)) {
        window.location.assign(loginHref("/verification-status"));
        return;
      }
      userId = user.id;
      const result = await supabase
        .from("verification_requests")
        .select("status,rejection_reason,reviewer_notes")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;
      if (result.error) {
        setError(result.error.message);
        setLoading(false);
        return;
      }
      applyRow((result.data || null) as VerificationRow | null);
    }

    void load();
    const timer = window.setInterval(() => void load(), 15_000);

    const channel = supabase
      .channel("loadlink-verification-status")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "verification_requests" },
        (payload) => {
          const row = payload.new as VerificationRow & { user_id?: string };
          if (row.user_id && row.user_id === userId) applyRow(row);
        },
      )
      .subscribe();

    return () => {
      active = false;
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, []);

  const copy = useMemo(() => {
    const values: Record<Status, [string, string]> = {
      not_started: ["Not started", "Submit your phone number and identity documents to begin."],
      phone_verified: ["Phone verified", "Complete the document step to finish your application."],
      pending: ["Pending review", "Your documents were received and are waiting for an authorised reviewer."],
      under_review: ["Under review", "A LoadLink reviewer is currently checking your identity documents."],
      more_information_required: ["More information required", reason || "Update the requested document or information and submit again."],
      verified: ["Verified", "Your identity has been approved. Your profile can display the gold Verified badge."],
      rejected: ["Needs attention", reason || "Your submission could not be approved. Review your information and submit again."],
    };
    return values[status];
  }, [reason, status]);

  const mayUpdate = ["not_started", "phone_verified", "more_information_required", "rejected"].includes(status);

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-8 text-white">
      <div className="mx-auto max-w-xl">
        <HomeLogoLink />
        <section className="mt-8 border border-white/10 bg-[#0b0b0b] p-7">
          <p className="text-xs font-black uppercase tracking-[.25em] text-[#f6b800]">Verification status</p>
          <h1 className="mt-4 text-4xl font-black">{loading ? "Checking status" : copy[0]}</h1>
          <p className="mt-4 leading-7 text-white/60">
            {loading ? "Securely loading your latest verification result." : copy[1]}
          </p>

          {error ? <p className="mt-5 border border-red-500/40 bg-red-500/10 p-4 text-sm font-bold text-red-300">{error}</p> : null}

          {status === "verified" ? (
            <span className="mt-7 inline-flex border border-[#f6b800] px-4 py-2 text-xs font-black uppercase tracking-[.16em] text-[#f6b800]">
              Verified
            </span>
          ) : null}

          {!loading && mayUpdate ? (
            <Link href="/verify" className="mt-7 flex h-12 items-center justify-center bg-[#f6b800] font-black text-black">
              {status === "not_started" || status === "phone_verified" ? "Start verification" : "Update verification"}
            </Link>
          ) : null}

          {!loading && ["pending", "under_review"].includes(status) ? (
            <div className="mt-7 border border-[#f6b800]/30 bg-[#f6b800]/10 p-4 text-sm font-semibold leading-6 text-white/75">
              You can leave this page. Notifications and this status update automatically after a decision.
            </div>
          ) : null}

          <Link href="/" className="mt-4 flex h-12 items-center justify-center border border-white/15 font-black">
            Return home
          </Link>
        </section>
      </div>
    </main>
  );
}
