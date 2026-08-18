"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loginHref } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

const reasons = [
  ["suspected_scam", "Suspected scam"],
  ["incorrect_information", "Incorrect information"],
  ["no_longer_available", "No longer available"],
  ["duplicate", "Duplicate listing"],
  ["misleading_price", "Misleading price"],
  ["inappropriate", "Inappropriate content"],
  ["other", "Other"],
] as const;

export default function ListingReportAction() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return;
    let active = true;
    fetch(`/api/listings/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((response) => { if (active) setAvailable(response.ok); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [id]);

  async function submit() {
    setError("");
    if (!category) {
      setError("Choose a report reason.");
      return;
    }
    if (category === "other" && details.trim().length < 8) {
      setError("Add a short explanation.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token || "";
      if (!token) {
        window.location.assign(loginHref(`/listing/${id}`));
        return;
      }

      const response = await fetch("/api/reports/listings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ listingId: id, category, details: details.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(payload?.error || "This report could not be submitted."));
      setReference(String(payload?.reference || ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "This report could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    setOpen(false);
    setCategory("");
    setDetails("");
    setError("");
    setReference("");
  }

  if (!available) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[max(18px,env(safe-area-inset-bottom))] right-4 z-[80] min-h-11 rounded-full border border-red-500/30 bg-black/90 px-4 text-[10px] font-black text-red-400 shadow-xl backdrop-blur md:bottom-6 md:right-6"
      >
        Report listing
      </button>

      {open ? (
        <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/65 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label="Report listing">
          <button type="button" aria-label="Close report form" className="absolute inset-0" onClick={close} />
          <section className="relative z-10 w-full max-w-lg rounded-[28px] border border-white/10 bg-[#0b0b0b] p-5 text-white shadow-2xl sm:p-6">
            {reference ? (
              <div className="py-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f6b800] text-xl font-black text-black">✓</div>
                <h2 className="mt-5 text-2xl font-black tracking-[-.04em]">Report received</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/55">LoadLink has recorded your report for review. You do not need to submit the same concern again.</p>
                <div className="mt-5 rounded-[18px] border border-white/10 bg-white/[.035] p-4">
                  <div className="text-[9px] font-black uppercase tracking-[.12em] text-white/40">Reference</div>
                  <div className="mt-1 text-sm font-black text-[#f6b800]">{reference}</div>
                </div>
                <button type="button" onClick={close} className="mt-5 min-h-12 w-full rounded-full bg-[#f6b800] px-5 text-[11px] font-black text-black">Done</button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[.14em] text-red-400">Marketplace safety</p>
                    <h2 className="mt-2 text-2xl font-black tracking-[-.04em]">Report this listing</h2>
                    <p className="mt-2 text-[11px] font-semibold leading-5 text-white/50">Choose the reason that best describes the concern. Reports are sent to LoadLink for review.</p>
                  </div>
                  <button type="button" onClick={close} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-xl font-black">×</button>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {reasons.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCategory(value)}
                      className={`min-h-11 rounded-xl border px-3 text-left text-[10px] font-black ${category === value ? "border-[#f6b800] bg-[#f6b800]/10 text-[#f6b800]" : "border-white/10 bg-white/[.025] text-white/72"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <label className="mt-5 block">
                  <span className="mb-2 block text-[9px] font-black uppercase tracking-[.12em] text-white/40">Additional details</span>
                  <textarea
                    value={details}
                    onChange={(event) => setDetails(event.target.value.slice(0, 1500))}
                    placeholder="Add useful context for LoadLink review. Do not include passwords or banking PINs."
                    className="min-h-28 w-full rounded-[16px] border border-white/10 bg-black px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/25 focus:border-[#f6b800]/55"
                  />
                  <span className="mt-1 block text-right text-[9px] font-semibold text-white/30">{details.length}/1500</span>
                </label>

                {error ? <p role="alert" className="mt-3 text-[10px] font-semibold text-red-400">{error}</p> : null}

                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={close} className="min-h-12 rounded-full border border-white/15 px-5 text-[11px] font-black">Cancel</button>
                  <button type="button" disabled={submitting} onClick={() => void submit()} className="min-h-12 rounded-full bg-[#f6b800] px-5 text-[11px] font-black text-black disabled:opacity-50">{submitting ? "Submitting…" : "Submit report"}</button>
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
