"use client";

import { useEffect, useRef } from "react";

import { isAuthenticatedUser } from "@/lib/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

const LISTING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function caseNumberFrom(data: unknown) {
  const value = Array.isArray(data) ? data[0] : data;
  if (!value || typeof value !== "object") return "";
  return String((value as { case_number?: unknown }).case_number || "").trim();
}

export default function ListingReportGuard() {
  const pending = useRef(new Set<string>());

  useEffect(() => {
    async function submit(listingId: string) {
      if (pending.current.has(listingId)) return;

      const reason = window.prompt("Briefly explain why you are reporting this listing.");
      const cleanReason = reason?.trim() || "";
      if (!cleanReason) return;
      if (cleanReason.length < 8) {
        window.alert("Please add a little more detail so LoadLink can review the report properly.");
        return;
      }
      if (!isSupabaseConfigured) {
        window.alert("Reporting is temporarily unavailable. Please try again shortly.");
        return;
      }

      pending.current.add(listingId);
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !isAuthenticatedUser(authData.user)) {
          window.alert("Sign in to submit a report to LoadLink.");
          const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
          window.location.href = `/login?next=${encodeURIComponent(next)}`;
          return;
        }

        const { data, error } = await supabase.rpc("loadlink_create_moderation_case", {
          p_entity_type: "listing",
          p_entity_id: listingId,
          p_reason: cleanReason,
          p_case_type: "report",
          p_evidence: [],
        });

        if (error) {
          window.alert(error.message || "The report could not be submitted. Please try again.");
          return;
        }

        const reference = caseNumberFrom(data);
        window.alert(reference
          ? `Report submitted to LoadLink. Reference ${reference}.`
          : "Report submitted to LoadLink.");
      } finally {
        pending.current.delete(listingId);
      }
    }

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("button");
      if (!button || button.textContent?.trim().toLowerCase() !== "report") return;
      const article = button.closest('article[id^="job-"]');
      if (!article) return;
      const listingId = article.id.slice(4);
      if (!LISTING_ID.test(listingId)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      void submit(listingId);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
