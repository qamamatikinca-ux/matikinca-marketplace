"use client";

import { useState } from "react";
import AccessibleDialog from "@/components/platform/AccessibleDialog";
import { authenticatedFetch } from "@/lib/client/authenticatedFetch";

export default function ReportDialog({
  open,
  listingId,
  listingTitle,
  entityType = "listing",
  entityId,
  entityTitle,
  darkMode,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  listingId?: string;
  listingTitle?: string;
  entityType?: "listing" | "driver" | "dealership" | "message" | "user";
  entityId?: string;
  entityTitle?: string;
  darkMode: boolean;
  onClose: () => void;
  onSubmitted?: (message: string) => void;
}) {
  const [reasonCode, setReasonCode] = useState("fraud");
  const [explanation, setExplanation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const targetId = entityId || listingId || "";
  const targetTitle = entityTitle || listingTitle || entityType;

  async function submit() {
    setError("");
    if (explanation.trim().length < 10) { setError("Add at least 10 characters explaining what happened."); return; }
    setBusy(true);
    try {
      const response = await authenticatedFetch("/api/listings/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId: targetId, reasonCode, explanation }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The report could not be submitted.");
      setExplanation("");
      onClose();
      onSubmitted?.("Report submitted to the LoadLink moderation queue.");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "The report could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccessibleDialog open={open} onClose={onClose} title={`Report ${targetTitle}`} description="Reports are reviewed by LoadLink staff and linked to the exact item and reporter account." darkMode={darkMode}>
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-black">Reason
          <select value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} className={`h-12 rounded-xl border px-3 ${darkMode ? "border-white/15 bg-[#171717]" : "border-black/10 bg-white"}`}>
            <option value="fraud">Possible fraud or scam</option>
            <option value="duplicate">Duplicate information</option>
            <option value="incorrect">Incorrect information</option>
            <option value="unsafe">Unsafe or prohibited content</option>
            <option value="sold">Already unavailable</option>
            <option value="spam">Spam</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-black">What happened?
          <textarea value={explanation} onChange={(event) => setExplanation(event.target.value)} maxLength={1200} className={`min-h-32 rounded-xl border p-3 font-semibold ${darkMode ? "border-white/15 bg-[#171717]" : "border-black/10 bg-white"}`} placeholder="Include the exact concern. Do not include passwords, PINs or identity numbers." />
        </label>
        {error ? <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm font-bold text-red-600">{error}</p> : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={onClose} className="h-12 rounded-xl border border-current/15 text-xs font-black uppercase">Cancel</button>
          <button type="button" onClick={() => void submit()} disabled={busy} className="h-12 rounded-xl bg-[#f6b800] text-xs font-black uppercase text-black disabled:opacity-50">{busy ? "Submitting…" : "Submit report"}</button>
        </div>
      </div>
    </AccessibleDialog>
  );
}
