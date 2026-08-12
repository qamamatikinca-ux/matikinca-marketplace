"use client";

import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type SubmissionSuccessProps = {
  open: boolean;
  title?: string;
  message?: string;
  listingId?: string | null;
  listingTitle?: string;
  surface?: "job" | "contract" | "asset" | "vehicle";
  continueLabel?: string;
  onContinue?: () => void;
  enableFeedback?: boolean;
  reference?: string | null;
  category?: string | null;
  entityName?: string | null;
  submittedAt?: string | Date | null;
  controlCentre?: boolean;
};

export default function SubmissionSuccess({
  open,
  title = "Submission sent",
  message = "Your submission has been received. Our team will review it and update you within a few minutes.",
  listingId = null,
  listingTitle = "",
  surface = "job",
  continueLabel = "Continue",
  onContinue,
  enableFeedback = false,
  reference = null,
  category = null,
  entityName = null,
  submittedAt = null,
  controlCentre = false,
}: SubmissionSuccessProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setRating(0); setComment(""); setSending(false); setSent(false); setFeedbackMessage("");
    try { if ("vibrate" in navigator) navigator.vibrate([70, 35, 100]); } catch { /* optional */ }
  }, [open]);

  const ratingLabel = useMemo(() => rating === 5 ? "Excellent" : rating === 4 ? "Good" : rating === 3 ? "Okay" : rating === 2 ? "Difficult" : rating === 1 ? "Poor" : "Tap a star", [rating]);
  const stamp = useMemo(() => {
    const date = submittedAt ? new Date(submittedAt) : new Date();
    return Number.isNaN(date.getTime()) ? "Just now" : date.toLocaleString("en-ZA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }, [submittedAt, open]);

  async function submitFeedback() {
    if (!rating || sent || sending) return;
    setSending(true); setFeedbackMessage("");
    try {
      if (!isSupabaseConfigured) throw new Error("Feedback is temporarily unavailable.");
      const { error } = await supabase.rpc("submit_posting_experience_feedback", {
        p_listing_id: listingId,
        p_listing_title: listingTitle || null,
        p_surface: surface,
        p_rating: rating,
        p_comment: comment.trim() || null,
      });
      if (error) throw error;
      setSent(true); setFeedbackMessage("Thanks — this was sent to LoadLink Customer Experience.");
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "Feedback could not be sent right now.");
    } finally { setSending(false); }
  }

  if (!open) return null;
  const receiptTitle = controlCentre ? "Sent to Control Centre" : title;
  const receiptMessage = controlCentre ? (message || "LoadLink received your request and will review it shortly.") : message;
  const showReceipt = Boolean(reference || category || entityName || controlCentre);

  return (
    <div className="fixed inset-0 z-[10050] overflow-y-auto bg-black/82 px-4 py-5 backdrop-blur-lg" role="dialog" aria-modal="true" aria-live="polite">
      <section className="mx-auto flex min-h-full w-full max-w-lg items-center">
        <div className="w-full overflow-hidden rounded-[32px] border border-[#f6b800]/35 bg-[radial-gradient(circle_at_90%_0%,rgba(246,184,0,.12),transparent_32%),#080808] text-white shadow-[0_30px_100px_rgba(0,0,0,.6)]">
          <div className="p-5 sm:p-7">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#f6b800]/30 bg-[#f6b800]/10 shadow-[0_0_38px_rgba(246,184,0,.18)]">
              <div className="loadlink-success-ring flex h-14 w-14 items-center justify-center rounded-full bg-[#f6b800] text-black">
                <svg className="loadlink-success-check" width="29" height="29" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M12 25.5 20.5 34 37 15" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </div>

            <div className="mt-5 text-center">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#f6b800]">LoadLink confirmation</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] sm:text-3xl">{receiptTitle}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-white/55">{receiptMessage}</p>
            </div>

            {showReceipt ? (
              <div className="mt-6 overflow-hidden rounded-[22px] border border-white/10 bg-white/[.035]">
                {reference ? <ReceiptRow label="Reference" value={reference} /> : null}
                <ReceiptRow label="Submitted" value={stamp} />
                {category ? <ReceiptRow label="Category" value={category} /> : null}
                {entityName ? <ReceiptRow label="Account" value={entityName} /> : null}
                {listingTitle ? <ReceiptRow label="Related item" value={listingTitle} /> : null}
                {controlCentre ? <ReceiptRow label="Status" value="Awaiting review" accent /> : null}
              </div>
            ) : null}

            {enableFeedback ? (
              <div className="mt-5 rounded-[22px] border border-white/10 bg-white/[.03] p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black">How was this on LoadLink?</p><p className="mt-1 text-xs leading-5 text-white/42">Your feedback goes to Customer Experience and Control Centre.</p></div><span className="shrink-0 rounded-full bg-white/[.06] px-3 py-1 text-[10px] font-black text-white/65">{ratingLabel}</span></div>
                <div className="mt-4 flex items-center justify-between gap-1" aria-label="Posting experience rating">{[1,2,3,4,5].map((star)=><button key={star} type="button" onClick={()=>!sent&&setRating(star)} disabled={sent} className={`flex h-10 w-10 items-center justify-center rounded-full border text-xl transition ${star<=rating?"border-[#f6b800] bg-[#f6b800] text-black":"border-white/15 text-white/40"}`} aria-label={`${star} star${star===1?"":"s"}`}>★</button>)}</div>
                {rating>0&&!sent?<textarea value={comment} onChange={(event)=>setComment(event.target.value.slice(0,500))} placeholder="Optional: what worked well or what should LoadLink improve?" className="mt-4 min-h-24 w-full resize-none rounded-xl border border-white/10 bg-black px-3 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-[#f6b800]/70"/>:null}
                {feedbackMessage?<p className={`mt-3 text-xs font-bold ${sent?"text-[#f6b800]":"text-red-300"}`}>{feedbackMessage}</p>:null}
                {rating>0&&!sent?<button type="button" disabled={sending} onClick={()=>void submitFeedback()} className="mt-4 h-11 w-full rounded-xl bg-[#f6b800] text-xs font-black uppercase tracking-[.1em] text-black disabled:opacity-50">{sending?"Sending feedback…":"Send feedback"}</button>:null}
              </div>
            ) : null}

            {onContinue ? <button type="button" onClick={onContinue} className="mt-5 h-12 w-full rounded-[16px] bg-[#f6b800] text-sm font-black text-black shadow-[0_12px_30px_rgba(246,184,0,.16)]">{continueLabel}</button> : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function ReceiptRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-4 border-b border-white/8 px-4 py-3.5 last:border-b-0"><span className="text-[10px] font-black uppercase tracking-[.08em] text-white/35">{label}</span><strong className={`min-w-0 break-words text-right text-xs ${accent ? "text-[#f6b800]" : "text-white/85"}`}>{value}</strong></div>;
}
