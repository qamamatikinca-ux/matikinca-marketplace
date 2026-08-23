"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import { verifyReturnedLoadLinkPayment, loadLinkHumanError } from "@/lib/loadlinkIntelligence";
import { supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type PaymentState = {
  id?: string;
  reference: string;
  status: string;
  amount_cents: number;
  currency: string;
  payment_type: string;
  package_type: string;
  provider: string;
  paid_at?: string | null;
  created_at?: string | null;
  reconciliation_status?: string | null;
  review_state?: string | null;
  review_reason?: string | null;
};

function money(cents = 0, currency = "ZAR") {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: currency || "ZAR", minimumFractionDigits: 2 }).format(Number(cents || 0) / 100);
}

function planName(state: PaymentState | null) {
  if (!state) return "LoadLink payment";
  if (state.payment_type === "manual_listing_credit") return "Manual listing credit";
  if (state.package_type === "dealer") return "Dealer plan";
  if (state.package_type === "pro") return "Pro plan";
  return "LoadLink payment";
}

function stage(state: PaymentState | null) {
  if (!state) return "checking";
  if (state.status === "paid" || state.review_state === "approved") return "approved";
  if (state.status === "review_rejected" || state.review_state === "rejected") return "attention";
  if (state.status === "received_pending_review" || state.review_state === "pending") return "review";
  return "checking";
}

export default function PaymentStatusPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [reference, setReference] = useState("");
  const [payment, setPayment] = useState<PaymentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const readState = useCallback(async (ref: string) => {
    const result = await supabase.rpc("loadlink_my_payment_status", { p_reference: ref });
    if (result.error) throw result.error;
    const next = result.data as PaymentState;
    setPayment(next);
    return next;
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference") || params.get("trxref") || "";
    setReference(ref);
    if (!ref) {
      setMessage("LoadLink returned from checkout without a payment reference. No payment status can be confirmed from this page.");
      setLoading(false);
      return;
    }

    let active = true;
    void (async () => {
      setLoading(true);
      setMessage("");
      try {
        await verifyReturnedLoadLinkPayment(ref);
        if (!active) return;
        await readState(ref);
      } catch (error) {
        if (!active) return;
        try {
          await readState(ref);
        } catch {
          setMessage(loadLinkHumanError(error, "LoadLink is still confirming this payment. You can safely refresh this page."));
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [readState]);

  useEffect(() => {
    if (!reference || !payment || ["paid", "review_rejected"].includes(payment.status)) return;
    const timer = window.setInterval(() => { void readState(reference).catch(() => undefined); }, 6000);
    return () => window.clearInterval(timer);
  }, [payment, readState, reference]);

  const currentStage = stage(payment);
  const steps = useMemo(() => [
    { label: "Details verified", done: Boolean(payment) },
    { label: "Payment received", done: Boolean(payment?.paid_at) || ["received_pending_review", "paid", "review_rejected"].includes(String(payment?.status)) },
    { label: "Control Centre review", done: currentStage === "approved" || currentStage === "attention", active: currentStage === "review" },
    { label: "Access activated", done: currentStage === "approved" },
  ], [currentStage, payment]);

  const shell = darkMode ? "bg-black text-white" : "bg-[#f5f4ef] text-black";
  const card = darkMode ? "border-white/10 bg-[#0c0c0c]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/50" : "text-black/50";

  return (
    <main className={`min-h-screen ${shell}`}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid overflow-hidden rounded-[30px] border border-current/10 lg:grid-cols-[1.22fr_.78fr]">
          <section className={`p-6 sm:p-9 ${card}`}>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#a87900]">LoadLink secure payment</p>
            {loading ? (
              <div className="py-14">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-current/15 border-t-[#f6b800]" />
                <h1 className="mt-5 text-3xl font-black tracking-[-.04em]">Confirming payment</h1>
                <p className={`mt-2 max-w-lg text-sm font-semibold leading-6 ${muted}`}>LoadLink is matching the Paystack result to the exact order created on your account.</p>
              </div>
            ) : message && !payment ? (
              <div className="py-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/12 text-2xl font-black text-amber-600">!</div>
                <h1 className="mt-5 text-3xl font-black tracking-[-.04em]">Payment status unavailable</h1>
                <p className={`mt-3 max-w-xl text-sm font-semibold leading-6 ${muted}`}>{message}</p>
                <Link href="/packages" className="mt-7 inline-flex rounded-xl bg-black px-5 py-3 text-xs font-black text-white dark:bg-white dark:text-black">Back to packages</Link>
              </div>
            ) : (
              <>
                <div className="mt-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#f6b800] text-black">
                  {currentStage === "attention" ? <span className="text-2xl font-black">!</span> : <svg viewBox="0 0 24 24" width="30" height="30" fill="none" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
                <h1 className="mt-5 text-4xl font-black tracking-[-.05em]">
                  {currentStage === "approved" ? "Payment approved" : currentStage === "attention" ? "Payment needs attention" : "Payment received"}
                </h1>
                <p className={`mt-3 max-w-xl text-sm font-semibold leading-6 ${muted}`}>
                  {currentStage === "approved"
                    ? "The Control Centre review is complete and the purchased LoadLink access has been activated."
                    : currentStage === "attention"
                      ? "The payment was received, but the Control Centre could not approve it yet. No additional charge is required while this is investigated."
                      : "Your payment details matched the LoadLink order. It has now been sent to the Control Centre for the final decision before access is released."}
                </p>

                {currentStage === "attention" && payment?.review_reason ? <div className="mt-5 rounded-[18px] border border-red-500/20 bg-red-500/[.06] p-4 text-sm font-semibold leading-6 text-red-500"><strong className="block font-black">Control Centre note</strong>{payment.review_reason}</div> : null}

                <div className="mt-8 grid gap-2">
                  {steps.map((step, index) => <div key={step.label} className={`flex items-center gap-3 rounded-[18px] border px-4 py-3 ${step.active ? "border-[#f6b800]/55 bg-[#f6b800]/[.08]" : "border-current/10"}`}>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${step.done ? "bg-[#f6b800] text-black" : step.active ? "border border-[#f6b800] text-[#a87900]" : "bg-current/[.06] opacity-45"}`}>{step.done ? "✓" : index + 1}</span>
                    <div className="min-w-0"><strong className="block text-sm font-black">{step.label}</strong>{step.active ? <span className={`mt-0.5 block text-[10px] font-semibold ${muted}`}>Waiting for a protected Control Centre decision</span> : null}</div>
                  </div>)}
                </div>

                <div className="mt-8 flex flex-wrap gap-2">
                  <Link href="/packages" className="rounded-xl bg-black px-5 py-3 text-xs font-black text-white dark:bg-white dark:text-black">Packages</Link>
                  <Link href="/" className="rounded-xl border border-current/12 px-5 py-3 text-xs font-black">Return to LoadLink</Link>
                </div>
              </>
            )}
          </section>

          <aside className="bg-[#e97d3d] p-6 text-white sm:p-9">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-white/65">Payment summary</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-.045em]">{planName(payment)}</h2>
            {payment ? <>
              <p className="mt-6 text-5xl font-black tracking-[-.055em]">{money(payment.amount_cents, payment.currency)}</p>
              <div className="mt-8 grid gap-4 border-t border-white/20 pt-6 text-sm">
                <div><span className="block text-[9px] font-black uppercase tracking-[.12em] text-white/55">Reference</span><strong className="mt-1 block break-all text-xs">{payment.reference}</strong></div>
                <div><span className="block text-[9px] font-black uppercase tracking-[.12em] text-white/55">Provider</span><strong className="mt-1 block text-xs">Paystack</strong></div>
                <div><span className="block text-[9px] font-black uppercase tracking-[.12em] text-white/55">Review state</span><strong className="mt-1 block text-xs">{currentStage === "approved" ? "Approved" : currentStage === "attention" ? "Needs attention" : "Final review"}</strong></div>
              </div>
            </> : <p className="mt-5 text-sm font-semibold leading-6 text-white/65">Your verified payment summary will appear here.</p>}
            <p className="mt-10 text-xs font-semibold leading-5 text-white/60">Card details are handled by Paystack. LoadLink stores the payment reference and verified transaction state, not your card number or CVV.</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
