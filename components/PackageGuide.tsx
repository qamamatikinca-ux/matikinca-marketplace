"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import SubmissionSuccess from "@/components/SubmissionSuccess";
import { isAuthenticatedUser, loginHref } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

type Recommendation = "manual" | "pro" | "dealer" | "custom";
type Answers = {
  listings: number;
  photos: 5 | 10 | 15;
  analytics: boolean;
  priority: boolean;
  teamSeats: 1 | 3 | 5;
  showroom: boolean;
};
type RequestState = "idle" | "sent" | "pending";

const DEFAULTS: Answers = {
  listings: 2,
  photos: 5,
  analytics: false,
  priority: false,
  teamSeats: 1,
  showroom: false,
};

// Dealer requests are intentionally kept in a realistic commercial band.
// Standard Dealer is R2,999/month. A tailored Dealer-style request can never
// estimate below R2,500/month and can never use fewer than 10 listing photos.
const DEALER_TAILORED_MIN = 2500;
const DEALER_STANDARD_PRICE = 2999;

function dealerIntent(answers: Answers) {
  return answers.showroom || answers.teamSeats >= 5 || answers.listings >= 15;
}

function normalizedAnswers(answers: Answers): Answers {
  return dealerIntent(answers) && answers.photos < 10 ? { ...answers, photos: 10 } : answers;
}

function estimateCustom(rawAnswers: Answers) {
  const answers = normalizedAnswers(rawAnswers);

  if (dealerIntent(answers)) {
    let monthly = DEALER_TAILORED_MIN;
    if (answers.photos === 15) monthly += 150;
    if (answers.analytics) monthly += 100;
    if (answers.priority) monthly += 100;
    if (answers.listings >= 15) monthly += 100;
    return Math.min(DEALER_STANDARD_PRICE, Math.round(monthly / 50) * 50);
  }

  let monthly = 499;
  monthly += Math.max(0, answers.listings - 2) * 100;
  if (answers.photos === 10) monthly += 180;
  if (answers.photos === 15) monthly += 320;
  if (answers.analytics) monthly += 250;
  if (answers.priority) monthly += 200;
  if (answers.teamSeats === 3) monthly += 300;
  monthly = Math.max(499, Math.min(monthly, 1999));
  return Math.round(monthly / 50) * 50;
}

function recommendationFor(rawAnswers: Answers): Recommendation {
  const answers = normalizedAnswers(rawAnswers);
  if (dealerIntent(answers)) return "dealer";
  if (
    answers.listings <= 2 &&
    answers.photos === 5 &&
    !answers.analytics &&
    !answers.priority &&
    answers.teamSeats === 1
  ) return "manual";
  if (answers.listings >= 4 || answers.analytics || answers.photos >= 10 || answers.priority) return "pro";
  return "custom";
}

function listingBand(listings: number) {
  if (listings <= 2) return "1–2";
  if (listings <= 5) return "3–5";
  if (listings < 15) return "6–14";
  return "15+";
}

export default function PackageGuide({ darkMode = false }: { darkMode?: boolean }) {
  const [answers, setAnswers] = useState<Answers>(DEFAULTS);
  const [showTailored, setShowTailored] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const effectiveAnswers = useMemo(() => normalizedAnswers(answers), [answers]);
  const dealerMode = dealerIntent(effectiveAnswers);
  const recommendation = useMemo(() => recommendationFor(effectiveAnswers), [effectiveAnswers]);
  const estimate = useMemo(() => estimateCustom(effectiveAnswers), [effectiveAnswers]);
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const softSurface = darkMode ? "border-white/10 bg-white/[.035]" : "border-black/8 bg-[#f8f5ed]";
  const muted = darkMode ? "text-white/56" : "text-black/56";

  const planName = recommendation === "manual"
    ? "Manual listing"
    : recommendation === "pro"
      ? "Pro"
      : recommendation === "dealer"
        ? "Dealer"
        : "Tailored package";

  const standardPrice = recommendation === "manual"
    ? "R15 / vehicle / day"
    : recommendation === "pro"
      ? "R399 / month"
      : recommendation === "dealer"
        ? "R2 999 / month"
        : `R${estimate.toLocaleString("en-ZA")} est. / month`;

  const reason = recommendation === "manual"
    ? "Best for the occasional one-vehicle advert."
    : recommendation === "pro"
      ? "Built for regular operators who need more photos, analytics or visibility."
      : recommendation === "dealer"
        ? "You selected dealership-scale inventory, a showroom or a larger staff team."
        : "Your setup sits between the standard packages, so Sales can confirm a tailored option.";

  const planHref = recommendation === "manual"
    ? "#manual-package"
    : recommendation === "pro"
      ? "#pro-package"
      : recommendation === "dealer"
        ? "#dealer-package"
        : "#plan-guide";

  const summary = useMemo(() => {
    const a = normalizedAnswers(effectiveAnswers);
    const items = [
      `${listingBand(a.listings)} active vehicle listings`,
      `${a.photos} photos per listing`,
    ];
    if (a.analytics) items.push("Listing analytics");
    if (a.priority) items.push("Stronger marketplace visibility");
    if (a.showroom) items.push("Public dealership showroom");
    if (a.teamSeats > 1) items.push(a.teamSeats === 3 ? "Small team access" : "5+ staff access");
    return items.slice(0, 5);
  }, [effectiveAnswers]);

  function updateAnswers(patch: Partial<Answers>) {
    setAnswers((current) => normalizedAnswers({ ...current, ...patch }));
    setRequestState("idle");
    setErrorMessage("");
  }

  async function requestTailored() {
    if (submitting || requestState !== "idle") return;
    setErrorMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAuthenticatedUser(user)) {
      window.location.assign(loginHref("/packages#plan-guide"));
      return;
    }

    setSubmitting(true);
    const safeAnswers = normalizedAnswers(effectiveAnswers);
    const result = await supabase.from("custom_package_requests").insert({
      user_id: user.id,
      requested_features: safeAnswers,
      estimated_amount_cents: estimateCustom(safeAnswers) * 100,
      recommended_plan: recommendationFor(safeAnswers),
      status: "pending_review",
    });
    setSubmitting(false);

    if (result.error) {
      if (result.error.code === "23505") {
        setRequestState("pending");
        return;
      }
      setErrorMessage(
        /relation|schema cache|does not exist/i.test(result.error.message)
          ? "Tailored requests are not ready yet. Run the V2.6.11 Supabase update once, then try again."
          : "The request could not be sent. Please try again.",
      );
      return;
    }

    setRequestState("sent");
    setSuccess(true);
  }

  return (
    <>
      <SubmissionSuccess
        open={success}
        title="Package request sent"
        message="LoadLink Sales will review your tailored package and confirm the final price."
      />

      <section
        id="plan-guide"
        data-loadlink-package-guide="v2619"
        className={`overflow-hidden rounded-[28px] border ${surface}`}
      >
        <div className={`border-b p-5 md:p-7 ${darkMode ? "border-white/10" : "border-black/8"}`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#f6b800]" />
                <p className={`text-[10px] font-black uppercase tracking-[.19em] ${muted}`}>LoadLink plan guide</p>
              </div>
              <h1 className="mt-3 text-[2.35rem] font-black leading-[.96] tracking-[-.055em] md:text-5xl">
                Get one clear package recommendation.
              </h1>
              <p className={`mt-3 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>
                Job posting stays free. Vehicle advertising packages are priced separately and Dealer-scale access follows commercial Dealer rules.
              </p>
            </div>
            <div className={`rounded-2xl border px-4 py-3 ${softSurface}`}>
              <p className={`text-[9px] font-black uppercase tracking-[.14em] ${muted}`}>Dealer rule</p>
              <p className="mt-1 text-sm font-black">10+ photos · R2 500+ tailored</p>
              <p className={`mt-1 text-[11px] font-semibold ${muted}`}>Standard Dealer: R2 999/month with 15 photos.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.08fr_.92fr]">
          <div className={`p-5 md:p-7 lg:border-r ${darkMode ? "lg:border-white/10" : "lg:border-black/8"}`}>
            <div className="grid gap-6">
              <Question number="01" title="How many vehicles do you normally advertise?">
                <OptionRow
                  options={[[2, "1–2"], [5, "3–5"], [10, "6–14"], [15, "15+"]]}
                  value={effectiveAnswers.listings}
                  onChange={(value) => updateAnswers({ listings: Number(value) })}
                  darkMode={darkMode}
                />
              </Question>

              <Question number="02" title="How many photos do you need per vehicle?">
                <OptionRow
                  options={[[5, "5"], [10, "10"], [15, "15"]]}
                  value={effectiveAnswers.photos}
                  onChange={(value) => updateAnswers({ photos: Number(value) as 5 | 10 | 15 })}
                  darkMode={darkMode}
                  disabledValues={dealerMode ? [5] : []}
                />
                {dealerMode ? <p className="mt-2 text-[11px] font-bold text-[#b88900]">Dealer-scale setups start at 10 photos per vehicle.</p> : null}
              </Question>

              <Question number="03" title="Which tools do you actually need?">
                <div className="grid gap-2 sm:grid-cols-2">
                  <ToggleChoice checked={effectiveAnswers.analytics} onChange={(value) => updateAnswers({ analytics: value })} label="Listing analytics" darkMode={darkMode} />
                  <ToggleChoice checked={effectiveAnswers.priority} onChange={(value) => updateAnswers({ priority: value })} label="Stronger visibility" darkMode={darkMode} />
                  <ToggleChoice checked={effectiveAnswers.showroom} onChange={(value) => updateAnswers({ showroom: value, photos: value && effectiveAnswers.photos < 10 ? 10 : effectiveAnswers.photos })} label="Dealership showroom" darkMode={darkMode} />
                </div>
              </Question>

              <Question number="04" title="Who manages the account?">
                <OptionRow
                  options={[[1, "Just me"], [3, "Small team"], [5, "5+ staff"]]}
                  value={effectiveAnswers.teamSeats}
                  onChange={(value) => {
                    const teamSeats = Number(value) as 1 | 3 | 5;
                    updateAnswers({ teamSeats, photos: teamSeats >= 5 && effectiveAnswers.photos < 10 ? 10 : effectiveAnswers.photos });
                  }}
                  darkMode={darkMode}
                />
              </Question>
            </div>
          </div>

          <aside className={`p-5 md:p-7 ${darkMode ? "bg-black" : "bg-[#faf8f2]"}`}>
            {!showTailored ? (
              <div className="sticky top-24">
                <p className={`text-[10px] font-black uppercase tracking-[.18em] ${muted}`}>Recommended package</p>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-4xl font-black tracking-[-.055em]">{planName}</h2>
                    <p className="mt-2 text-lg font-black text-[#c89200]">{standardPrice}</p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f6b800] text-black">
                    <CheckIcon />
                  </span>
                </div>
                <p className={`mt-4 text-sm font-semibold leading-6 ${muted}`}>{reason}</p>

                <div className={`mt-5 rounded-2xl border p-4 ${softSurface}`}>
                  <p className={`text-[9px] font-black uppercase tracking-[.14em] ${muted}`}>Your setup</p>
                  <ul className="mt-3 space-y-2">
                    {summary.map((item) => <li key={item} className="flex items-start gap-2 text-sm font-bold"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f6b800]" />{item}</li>)}
                  </ul>
                </div>

                {recommendation !== "custom" ? (
                  <Link href={planHref} className="mt-5 flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black">
                    View {planName}
                  </Link>
                ) : (
                  <button type="button" onClick={() => setShowTailored(true)} className="mt-5 h-12 w-full rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black">
                    Review tailored option
                  </button>
                )}

                {recommendation !== "manual" ? (
                  <button type="button" onClick={() => setShowTailored(true)} className={`mt-4 w-full text-center text-xs font-black underline decoration-[#f6b800] decoration-2 underline-offset-4 ${muted}`}>
                    Need a different mix? Ask Sales
                  </button>
                ) : null}
              </div>
            ) : requestState === "sent" || requestState === "pending" ? (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f6b800] text-black"><CheckIcon large /></div>
                <h3 className="mt-4 text-2xl font-black">{requestState === "sent" ? "Request sent" : "Already with Sales"}</h3>
                <p className={`mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 ${muted}`}>
                  {requestState === "sent"
                    ? "Sales is reviewing your tailored request. Nothing is charged or activated until the final package is confirmed."
                    : "Sales already has this tailored request. You do not need to send it again."}
                </p>
              </div>
            ) : (
              <div className="sticky top-24">
                <button type="button" onClick={() => setShowTailored(false)} className={`text-xs font-black underline decoration-[#f6b800] decoration-2 underline-offset-4 ${muted}`}>
                  Back to recommendation
                </button>
                <p className={`mt-6 text-[10px] font-black uppercase tracking-[.18em] ${muted}`}>Tailored request</p>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <span className="text-4xl font-black tracking-[-.055em]">R{estimate.toLocaleString("en-ZA")}</span>
                  <span className={`pb-1 text-xs font-bold ${muted}`}>estimated / month</span>
                </div>
                {dealerMode ? <p className="mt-2 text-[11px] font-bold text-[#b88900]">Dealer-style tailored pricing cannot estimate below R2 500/month.</p> : null}

                <div className={`mt-5 rounded-2xl border p-4 ${softSurface}`}>
                  <ul className="space-y-2">{summary.map((item) => <li key={item} className="flex gap-2 text-sm font-bold"><span className="text-[#c18b00]">•</span>{item}</li>)}</ul>
                </div>
                <p className={`mt-4 text-xs font-semibold leading-5 ${muted}`}>Estimate only. LoadLink Sales confirms the final package and price before anything can activate.</p>
                <button type="button" onClick={() => void requestTailored()} disabled={submitting} className="mt-5 h-12 w-full rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black disabled:opacity-45">
                  {submitting ? "Sending…" : "Send to Sales"}
                </button>
              </div>
            )}
            {errorMessage ? <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold leading-5 text-red-500">{errorMessage}</p> : null}
          </aside>
        </div>
      </section>
    </>
  );
}

function Question({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[9px] font-black tracking-[.12em] text-[#b88900]">{number}</span>
        <p className="text-sm font-black">{title}</p>
      </div>
      {children}
    </div>
  );
}

function OptionRow({
  options,
  value,
  onChange,
  darkMode,
  disabledValues = [],
}: {
  options: Array<[number, string]>;
  value: number;
  onChange: (value: number) => void;
  darkMode: boolean;
  disabledValues?: number[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([optionValue, label]) => {
        const selected = value === optionValue;
        const disabled = disabledValues.includes(optionValue);
        return (
          <button
            key={optionValue}
            type="button"
            disabled={disabled}
            onClick={() => onChange(optionValue)}
            className={`min-h-11 rounded-xl border px-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-25 ${
              selected
                ? "border-[#f6b800] bg-[#f6b800] text-black"
                : darkMode
                  ? "border-white/14 bg-white/[.025] text-white/72 hover:border-[#f6b800]/55"
                  : "border-black/10 bg-white text-black/68 hover:border-[#f6b800]"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ToggleChoice({ checked, onChange, label, darkMode }: { checked: boolean; onChange: (value: boolean) => void; label: string; darkMode: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`flex min-h-12 items-center justify-between rounded-xl border px-4 text-left text-sm font-bold transition ${
        checked
          ? "border-[#f6b800] bg-[#f6b800] text-black"
          : darkMode
            ? "border-white/14 bg-white/[.025] text-white/72 hover:border-[#f6b800]/55"
            : "border-black/10 bg-white text-black/68 hover:border-[#f6b800]"
      }`}
    >
      <span>{label}</span>
      <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] ${checked ? "border-black/20 bg-black text-[#f6b800]" : "border-current/30"}`}>
        {checked ? "✓" : ""}
      </span>
    </button>
  );
}

function CheckIcon({ large = false }: { large?: boolean }) {
  return <svg width={large ? 30 : 22} height={large ? 30 : 22} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 12 4 4 8-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
