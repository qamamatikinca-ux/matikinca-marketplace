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
}: SubmissionSuccessProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setRating(0);
    setComment("");
    setSending(false);
    setSent(false);
    setFeedbackMessage("");
    try {
      if ("vibrate" in navigator) navigator.vibrate([80, 45, 120]);
    } catch {
      // Vibration is optional and not supported by every mobile browser.
    }
  }, [open]);

  const ratingLabel = useMemo(() => {
    if (rating === 5) return "Excellent";
    if (rating === 4) return "Good";
    if (rating === 3) return "Okay";
    if (rating === 2) return "Difficult";
    if (rating === 1) return "Poor";
    return "Tap a star";
  }, [rating]);

  async function submitFeedback() {
    if (!rating || sent || sending) return;
    setSending(true);
    setFeedbackMessage("");

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
      setSent(true);
      setFeedbackMessage("Thanks — this was sent to LoadLink Customer Experience.");
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "Feedback could not be sent right now.");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10050] overflow-y-auto bg-black/80 px-4 py-5 backdrop-blur-md" role="dialog" aria-modal="true" aria-live="polite">
      <section className="mx-auto flex min-h-full w-full max-w-md items-center">
        <div className="w-full rounded-[28px] border border-[#f6b800]/45 bg-[#080808] p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,.55)] sm:p-6">
          <div className="flex items-center gap-4">
            <div className="loadlink-success-ring flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f6b800] text-black">
              <svg className="loadlink-success-check" width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <path d="M12 25.5 20.5 34 37 15" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-black tracking-[-0.035em]">{title}</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-white/60">{message}</p>
            </div>
          </div>

          {enableFeedback ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black">How was posting on LoadLink?</p>
                <p className="mt-1 text-xs leading-5 text-white/45">Your rating goes to Customer Experience and the LoadLink Control Centre.</p>
              </div>
              <span className="shrink-0 rounded-full bg-[#f6b800]/12 px-3 py-1 text-[10px] font-black uppercase tracking-[.12em] text-[#f6b800]">{ratingLabel}</span>
            </div>

            <div className="mt-4 flex items-center justify-between gap-1" aria-label="Posting experience rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => !sent && setRating(star)}
                  disabled={sent}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border text-2xl transition ${star <= rating ? "border-[#f6b800] bg-[#f6b800] text-black" : "border-white/15 text-white/45"}`}
                  aria-label={`${star} star${star === 1 ? "" : "s"}`}
                >
                  ★
                </button>
              ))}
            </div>

            {rating > 0 && !sent ? (
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value.slice(0, 500))}
                placeholder="Optional: what worked well or what should LoadLink improve?"
                className="mt-4 min-h-24 w-full resize-none rounded-xl border border-white/10 bg-black px-3 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-[#f6b800]/70"
              />
            ) : null}

            {feedbackMessage ? <p className={`mt-3 text-xs font-bold ${sent ? "text-[#f6b800]" : "text-red-300"}`}>{feedbackMessage}</p> : null}

            {rating > 0 && !sent ? (
              <button type="button" disabled={sending} onClick={() => void submitFeedback()} className="mt-4 h-11 w-full rounded-xl bg-[#f6b800] text-xs font-black uppercase tracking-[.1em] text-black disabled:opacity-50">
                {sending ? "Sending feedback…" : "Send feedback"}
              </button>
            ) : null}
          </div>

          ) : null}

          {onContinue ? <button type="button" onClick={onContinue} className="mt-4 h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] text-sm font-black text-white">
            {continueLabel}
          </button> : null}
        </div>
      </section>
    </div>
  );
}
