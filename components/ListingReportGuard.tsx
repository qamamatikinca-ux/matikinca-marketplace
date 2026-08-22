"use client";

import { useEffect, useRef, useState } from "react";
import { isAuthenticatedUser } from "@/lib/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

const LISTING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function caseNumberFrom(data: unknown) {
  const value = Array.isArray(data) ? data[0] : data;
  if (!value || typeof value !== "object") return "";
  return String((value as { case_number?: unknown }).case_number || "").trim();
}

export default function ListingReportGuard() {
  const { darkMode } = useLoadLinkTheme();
  const pending = useRef(new Set<string>());
  const [listingId, setListingId] = useState("");
  const [listingTitle, setListingTitle] = useState("listing");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [reference, setReference] = useState("");

  function close() {
    if (submitting) return;
    setListingId("");
    setListingTitle("listing");
    setReason("");
    setNotice("");
    setReference("");
  }

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("button");
      if (!button || button.textContent?.trim().toLowerCase() !== "report") return;
      const article = button.closest('article[id^="job-"]');
      if (!article) return;
      const id = article.id.slice(4);
      if (!LISTING_ID.test(id)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const heading = article.querySelector<HTMLElement>("h1,h2,h3,[data-loadlink-listing-title]");
      setListingTitle((heading?.textContent || "listing").trim() || "listing");
      setListingId(id);
      setReason("");
      setNotice("");
      setReference("");
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!listingId) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [listingId, submitting]);

  async function submit() {
    const cleanReason = reason.trim();
    if (!listingId || submitting) return;
    if (cleanReason.length < 8) {
      setNotice("Add a little more detail so LoadLink can review the report properly.");
      return;
    }
    if (!isSupabaseConfigured) {
      setNotice("Reporting is temporarily unavailable. Please try again shortly.");
      return;
    }
    if (pending.current.has(listingId)) return;

    setSubmitting(true);
    setNotice("");
    pending.current.add(listingId);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !isAuthenticatedUser(authData.user)) {
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
        setNotice(error.message || "The report could not be submitted. Please try again.");
        return;
      }

      setReference(caseNumberFrom(data));
      setNotice("Report submitted to LoadLink.");
      setReason("");
    } finally {
      pending.current.delete(listingId);
      setSubmitting(false);
    }
  }

  if (!listingId) return null;

  return (
    <div data-loadlink-report-sheet="true" className="fixed inset-0 z-[2147483400] flex items-end justify-center bg-black/60 p-3 backdrop-blur-[10px] sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="loadlink-report-title" className={`w-full max-w-[440px] overflow-hidden rounded-[24px] border shadow-[0_28px_90px_rgba(0,0,0,.36)] ${darkMode ? "border-white/12 bg-[#0b0b0b] text-white" : "border-black/10 bg-white text-black"}`}>
        <div className="flex items-start justify-between gap-4 border-b border-current/10 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[.12em] text-[#a87900]">Safety & moderation</p>
            <h2 id="loadlink-report-title" className="mt-1 text-xl font-black tracking-[-.03em]">Report listing</h2>
            <p className={`mt-1 truncate text-xs font-semibold ${darkMode ? "text-white/45" : "text-black/45"}`}>{listingTitle}</p>
          </div>
          <button type="button" onClick={close} disabled={submitting} aria-label="Close report" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-current/10 text-xl leading-none opacity-60 disabled:opacity-30">×</button>
        </div>

        <div className="px-5 py-5">
          {reference ? (
            <div className={`rounded-[16px] border p-4 ${darkMode ? "border-[#f6b800]/25 bg-[#f6b800]/[.07]" : "border-[#c49300]/20 bg-[#fff8dc]"}`}>
              <p className="text-sm font-black">Report received</p>
              <p className={`mt-1 text-xs font-semibold leading-5 ${darkMode ? "text-white/55" : "text-black/55"}`}>LoadLink can now review this listing and the account activity behind it.</p>
              <p className="mt-3 text-[11px] font-black text-[#a87900]">Reference {reference}</p>
              <button type="button" onClick={close} className="mt-4 h-11 w-full rounded-[12px] bg-[#f6b800] text-sm font-black text-black">Done</button>
            </div>
          ) : (
            <>
              <label className="block text-xs font-black">What is wrong with this listing?</label>
              <textarea
                autoFocus
                value={reason}
                onChange={(event) => { setReason(event.target.value.slice(0, 600)); setNotice(""); }}
                placeholder="Tell LoadLink what you noticed…"
                className={`mt-2 min-h-[126px] w-full resize-none rounded-[16px] border p-3.5 text-base font-medium outline-none transition focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.045] text-white placeholder:text-white/35" : "border-black/10 bg-[#fafafa] text-black placeholder:text-black/35"}`}
              />
              <div className={`mt-2 flex items-center justify-between text-[10px] font-semibold ${darkMode ? "text-white/35" : "text-black/35"}`}><span>Minimum 8 characters</span><span>{reason.length}/600</span></div>
              {notice ? <p className="mt-3 rounded-[12px] border border-red-400/20 bg-red-400/[.06] px-3 py-2 text-xs font-bold text-red-600 dark:text-red-200">{notice}</p> : null}
              <div className="mt-5 grid grid-cols-[.8fr_1.2fr] gap-2">
                <button type="button" onClick={close} disabled={submitting} className="h-12 rounded-[13px] border border-current/12 text-sm font-black disabled:opacity-40">Cancel</button>
                <button type="button" onClick={() => void submit()} disabled={submitting || reason.trim().length < 8} className="h-12 rounded-[13px] bg-[#f6b800] text-sm font-black text-black disabled:opacity-40">{submitting ? "Submitting…" : "Submit report"}</button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
