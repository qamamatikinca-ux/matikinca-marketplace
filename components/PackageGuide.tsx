"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
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

const DEFAULTS: Answers = { listings: 2, photos: 5, analytics: false, priority: false, teamSeats: 1, showroom: false };

function estimateCustom(answers: Answers) {
  let monthly = 349;
  monthly += Math.max(0, answers.listings - 2) * 85;
  if (answers.photos === 10) monthly += 120;
  if (answers.photos === 15) monthly += 220;
  if (answers.analytics) monthly += 250;
  if (answers.priority) monthly += 220;
  if (answers.teamSeats === 3) monthly += 180;
  if (answers.teamSeats === 5) monthly += 360;
  if (answers.showroom) monthly += 1150;
  monthly = Math.max(349, Math.min(monthly, 2999));
  return Math.round(monthly / 50) * 50;
}

function recommendationFor(answers: Answers): Recommendation {
  if (answers.showroom || answers.teamSeats >= 5 || answers.listings >= 15) return "dealer";
  if (answers.listings <= 2 && answers.photos === 5 && !answers.analytics && !answers.priority && answers.teamSeats === 1) return "manual";
  if (answers.listings >= 4 || answers.analytics || answers.photos === 15 || answers.priority) return "pro";
  return "custom";
}

export default function PackageGuide({ darkMode = false }: { darkMode?: boolean }) {
  const [answers, setAnswers] = useState<Answers>(DEFAULTS);
  const [showTailored, setShowTailored] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const recommendation = useMemo(() => recommendationFor(answers), [answers]);
  const estimate = useMemo(() => estimateCustom(answers), [answers]);
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/55" : "text-black/55";

  const planName = recommendation === "manual" ? "Manual listing" : recommendation === "pro" ? "Pro" : recommendation === "dealer" ? "Dealer" : "Tailored package";
  const reason = recommendation === "manual"
    ? "You list occasionally and do not need analytics or a team workspace."
    : recommendation === "pro"
      ? "You list regularly or need more photos, analytics or stronger visibility."
      : recommendation === "dealer"
        ? "You need a public showroom, larger inventory or staff access."
        : "Your needs sit between the standard plans, so a tailored request may suit you better.";
  const planHref = recommendation === "manual" ? "#manual-package" : recommendation === "pro" ? "#pro-package" : recommendation === "dealer" ? "#dealer-package" : "#plan-guide";

  const summary = useMemo(() => {
    const items = [`${answers.listings <= 2 ? "1–2" : answers.listings <= 5 ? "3–5" : answers.listings < 15 ? "6–14" : "15+"} active vehicle listings`, `${answers.photos} photos per listing`];
    if (answers.analytics) items.push("Listing analytics");
    if (answers.priority) items.push("Stronger marketplace visibility");
    if (answers.showroom) items.push("Public dealership showroom");
    if (answers.teamSeats > 1) items.push(answers.teamSeats === 3 ? "Small team access" : "5+ staff access");
    return items.slice(0, 5);
  }, [answers]);

  async function requestTailored() {
    if (submitting || requestState !== "idle") return;
    setErrorMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAuthenticatedUser(user)) {
      window.location.assign(loginHref("/packages#plan-guide"));
      return;
    }
    setSubmitting(true);
    const result = await supabase.from("custom_package_requests").insert({
      user_id: user.id,
      requested_features: answers,
      estimated_amount_cents: estimate * 100,
      recommended_plan: recommendation,
      status: "pending_review",
    });
    setSubmitting(false);
    if (result.error) {
      if (result.error.code === "23505") {
        setRequestState("pending");
        return;
      }
      setErrorMessage(/relation|schema cache|does not exist/i.test(result.error.message)
        ? "Tailored requests are not ready yet. Run the V2.6.11 Supabase update once, then try again."
        : "The request could not be sent. Please try again.");
      return;
    }
    setRequestState("sent");
    setSuccess(true);
  }

  return (
    <>
      <SubmissionSuccess open={success} title="Package request sent" message="Control Centre will review your tailored package and final price." />
      <section id="plan-guide" className={`rounded-[30px] border p-5 md:p-7 ${surface}`}>
        <div className="max-w-3xl">
          <p className={`text-xs font-black uppercase tracking-[.16em] ${muted}`}>Plan guide</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-.045em] md:text-4xl">Find the package that fits</h2>
          <p className={`mt-3 text-sm font-semibold leading-6 ${muted}`}>Choose what you actually need. LoadLink will point you to a standard plan or let you send one clear tailored request.</p>
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <div className="grid gap-5">
            <Question title="How many vehicles do you normally advertise?">
              <OptionRow
                options={[
                  [2, "1–2"],
                  [5, "3–5"],
                  [10, "6–14"],
                  [15, "15+"],
                ]}
                value={answers.listings}
                onChange={(value) => setAnswers((current) => ({ ...current, listings: Number(value) }))}
                darkMode={darkMode}
              />
            </Question>

            <Question title="How many photos do you need per listing?">
              <OptionRow
                options={[[5, "5"], [10, "10"], [15, "15"]]}
                value={answers.photos}
                onChange={(value) => setAnswers((current) => ({ ...current, photos: Number(value) as 5 | 10 | 15 }))}
                darkMode={darkMode}
              />
            </Question>

            <Question title="Which extra tools matter to you?">
              <div className="grid gap-2 sm:grid-cols-2">
                <ToggleChoice checked={answers.analytics} onChange={(value) => setAnswers((current) => ({ ...current, analytics: value }))} label="Listing analytics" darkMode={darkMode} />
                <ToggleChoice checked={answers.priority} onChange={(value) => setAnswers((current) => ({ ...current, priority: value }))} label="Stronger visibility" darkMode={darkMode} />
                <ToggleChoice checked={answers.showroom} onChange={(value) => setAnswers((current) => ({ ...current, showroom: value }))} label="Dealership showroom" darkMode={darkMode} />
              </div>
            </Question>

            <Question title="Who manages the account?">
              <OptionRow
                options={[[1, "Just me"], [3, "Small team"], [5, "5+ staff"]]}
                value={answers.teamSeats}
                onChange={(value) => setAnswers((current) => ({ ...current, teamSeats: Number(value) as 1 | 3 | 5 }))}
                darkMode={darkMode}
              />
            </Question>
          </div>

          <aside className={`self-start rounded-[24px] border p-5 ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-[#faf8f2]"}`}>
            {!showTailored ? (
              <>
                <p className={`text-xs font-black uppercase tracking-[.14em] ${muted}`}>Recommended for you</p>
                <h3 className="mt-2 text-4xl font-black tracking-[-.05em]">{planName}</h3>
                <p className={`mt-3 text-sm font-semibold leading-6 ${muted}`}>{reason}</p>
                {recommendation !== "custom" ? (
                  <Link href={planHref} className="mt-5 flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black">View {planName}</Link>
                ) : (
                  <button type="button" onClick={() => setShowTailored(true)} className="mt-5 h-12 w-full rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black">Review tailored option</button>
                )}
                {recommendation !== "custom" ? <button type="button" onClick={() => setShowTailored(true)} className={`mt-4 w-full text-center text-xs font-black underline underline-offset-4 ${muted}`}>Need a different mix? Request a tailored package</button> : null}
              </>
            ) : requestState === "sent" || requestState === "pending" ? (
              <div className="py-3 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f6b800] text-black">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 12 4 4 8-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <h3 className="mt-4 text-2xl font-black">{requestState === "sent" ? "Request sent" : "Already with Control Centre"}</h3>
                <p className={`mt-2 text-sm font-semibold leading-6 ${muted}`}>{requestState === "sent" ? "Your tailored package is in review. Nothing is charged or activated until the final price is approved." : "Your tailored request is already being reviewed. You do not need to send it again."}</p>
              </div>
            ) : (
              <>
                <button type="button" onClick={() => setShowTailored(false)} className={`text-xs font-black underline underline-offset-4 ${muted}`}>Back to recommendation</button>
                <p className={`mt-5 text-xs font-black uppercase tracking-[.14em] ${muted}`}>Tailored request</p>
                <div className="mt-2 flex items-end gap-2"><span className="text-4xl font-black tracking-[-.05em]">R{estimate.toLocaleString("en-ZA")}</span><span className={`pb-1 text-xs font-bold ${muted}`}>estimated / month</span></div>
                <ul className={`mt-4 space-y-2 text-sm font-semibold ${muted}`}>{summary.map((item) => <li key={item} className="flex gap-2"><span className="text-[#c18b00]">•</span>{item}</li>)}</ul>
                <p className={`mt-4 text-xs font-semibold leading-5 ${muted}`}>Estimate only. Control Centre confirms the final package and price before anything can activate.</p>
                <button type="button" onClick={() => void requestTailored()} disabled={submitting} className="mt-5 h-12 w-full rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black disabled:opacity-45">{submitting ? "Sending…" : "Send to Control Centre"}</button>
              </>
            )}
            {errorMessage ? <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold leading-5 text-red-600">{errorMessage}</p> : null}
          </aside>
        </div>
      </section>
    </>
  );
}

function Question({ title, children }: { title: string; children: ReactNode }) {
  return <div><p className="mb-2 text-sm font-black">{title}</p>{children}</div>;
}

function OptionRow({ options, value, onChange, darkMode }: { options: Array<[number, string]>; value: number; onChange: (value: number) => void; darkMode: boolean }) {
  return <div className="flex flex-wrap gap-2">{options.map(([optionValue, label]) => {
    const selected = value === optionValue;
    return <button key={optionValue} type="button" onClick={() => onChange(optionValue)} className={`min-h-11 rounded-xl border px-4 text-sm font-black ${selected ? "border-[#f6b800] bg-[#f6b800] text-black" : darkMode ? "border-white/15 bg-black text-white/70" : "border-black/10 bg-white text-black/65"}`}>{label}</button>;
  })}</div>;
}

function ToggleChoice({ checked, onChange, label, darkMode }: { checked: boolean; onChange: (value: boolean) => void; label: string; darkMode: boolean }) {
  return <button type="button" aria-pressed={checked} onClick={() => onChange(!checked)} className={`flex min-h-12 items-center justify-between rounded-xl border px-4 text-left text-sm font-bold ${checked ? "border-[#f6b800] bg-[#fff3c4] text-black" : darkMode ? "border-white/15 bg-black text-white/70" : "border-black/10 bg-white text-black/65"}`}><span>{label}</span><span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] ${checked ? "border-[#f6b800] bg-[#f6b800] text-black" : "border-current/30"}`}>{checked ? "✓" : ""}</span></button>;
}
