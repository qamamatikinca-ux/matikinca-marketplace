"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
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
  const [showCustom, setShowCustom] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const recommendation = useMemo(() => recommendationFor(answers), [answers]);
  const estimate = useMemo(() => estimateCustom(answers), [answers]);
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/55" : "text-black/55";

  const planName = recommendation === "manual" ? "Manual listing" : recommendation === "pro" ? "Pro" : recommendation === "dealer" ? "Dealer" : "Tailored package";
  const reason = recommendation === "manual"
    ? "Best when you only list occasionally and do not need analytics or a team workspace."
    : recommendation === "pro"
      ? "Best for regular operators who need more listings, more photos or performance tools."
      : recommendation === "dealer"
        ? "Best when you need a public dealership showroom, larger inventory and staff access."
        : "Your needs sit between the standard packages, so a tailored request may fit better.";

  async function requestTailored() {
    if (submitting) return;
    setMessage("");
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
      if (result.error.code === "23505") setMessage("You already have a tailored package request under review.");
      else setMessage(/relation|schema cache|does not exist/i.test(result.error.message) ? "Run the V2.6.9 Supabase SQL once, then submit the tailored request again." : "The tailored-package request could not be submitted. Try again.");
      return;
    }
    setMessage(`Request sent. LoadLink will review the R${estimate.toLocaleString("en-ZA")}/month estimate before anything is activated or charged.`);
  }

  return (
    <section id="plan-guide" className={`rounded-[30px] border p-5 md:p-7 ${surface}`}>
      <div className="grid gap-6 lg:grid-cols-[1fr_.8fr]">
        <div>
          <h2 className="text-3xl font-black tracking-[-.045em] md:text-4xl">Find the right package</h2>
          <p className={`mt-3 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>Answer a few practical questions. The LoadLink Plan Guide will recommend a package or prepare a tailored request for Control Centre review.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <GuideField label="Active vehicle listings">
              <select value={answers.listings} onChange={(e) => setAnswers((current) => ({ ...current, listings: Number(e.target.value) }))} className={inputClass(darkMode)}>
                {[1,2,3,5,10,15,20].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </GuideField>
            <GuideField label="Photos per listing">
              <select value={answers.photos} onChange={(e) => setAnswers((current) => ({ ...current, photos: Number(e.target.value) as 5 | 10 | 15 }))} className={inputClass(darkMode)}>
                <option value={5}>Up to 5</option><option value={10}>Up to 10</option><option value={15}>Up to 15</option>
              </select>
            </GuideField>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Choice checked={answers.analytics} onChange={(value) => setAnswers((current) => ({ ...current, analytics: value }))} label="Listing analytics" />
            <Choice checked={answers.priority} onChange={(value) => setAnswers((current) => ({ ...current, priority: value }))} label="Higher-priority placement" />
            <Choice checked={answers.showroom} onChange={(value) => setAnswers((current) => ({ ...current, showroom: value }))} label="Public dealership showroom" />
            <GuideField label="People managing the account">
              <select value={answers.teamSeats} onChange={(e) => setAnswers((current) => ({ ...current, teamSeats: Number(e.target.value) as 1 | 3 | 5 }))} className={inputClass(darkMode)}>
                <option value={1}>Just me</option><option value={3}>Up to 3</option><option value={5}>Up to 5</option>
              </select>
            </GuideField>
          </div>
        </div>

        <aside className={`rounded-[24px] border p-5 ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-[#faf8f2]"}`}>
          <p className={`text-xs font-black ${muted}`}>Recommended</p>
          <h3 className="mt-2 text-4xl font-black tracking-[-.05em]">{planName}</h3>
          <p className={`mt-3 text-sm font-semibold leading-6 ${muted}`}>{reason}</p>
          <div className="mt-5 grid gap-2">
            {recommendation === "dealer" ? <Link href="/packages#dealer-package" className="flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black">View Dealer package</Link> : recommendation === "manual" ? <Link href="/list-your-vehicle?plan=manual" className="flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black">Use Manual listing</Link> : recommendation === "pro" ? <Link href="/list-your-vehicle?plan=pro" className="flex h-12 items-center justify-center rounded-xl bg-[#f6b800] px-5 text-sm font-black text-black">Choose Pro</Link> : null}
            <button type="button" onClick={() => setShowCustom((value) => !value)} className={`h-12 rounded-xl border px-5 text-sm font-black ${darkMode ? "border-white/15" : "border-black/12"}`}>{showCustom ? "Hide tailored option" : "Build a tailored package"}</button>
          </div>
          {showCustom ? <div className={`mt-5 border-t pt-5 ${darkMode ? "border-white/10" : "border-black/10"}`}><p className="text-sm font-black">Estimated individual package</p><p className="mt-1 text-3xl font-black">R{estimate.toLocaleString("en-ZA")}<span className={`ml-1 text-xs ${muted}`}>/ month</span></p><p className={`mt-2 text-xs leading-5 ${muted}`}>This is an estimate, not a charge. Control Centre reviews the features and final price before the package can be approved.</p><button type="button" onClick={() => void requestTailored()} disabled={submitting} className="mt-4 h-12 w-full rounded-xl bg-black px-5 text-sm font-black text-[#f6b800] disabled:opacity-45">{submitting ? "Sending request…" : "Send for approval"}</button></div> : null}
          {message ? <p className={`mt-4 rounded-xl border p-3 text-xs font-semibold leading-5 ${darkMode ? "border-white/10 bg-white/[.03]" : "border-black/10 bg-white"}`}>{message}</p> : null}
        </aside>
      </div>
    </section>
  );
}

function GuideField({ label, children }: { label: string; children: ReactNode }) { return <label className="grid gap-2"><span className="text-xs font-black">{label}</span>{children}</label>; }
function Choice({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) { return <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-current/10 px-4 text-sm font-bold"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#f6b800]" />{label}</label>; }
function inputClass(darkMode: boolean) { return `h-12 w-full rounded-xl border px-3 text-sm font-bold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-black text-white" : "border-black/10 bg-white text-black"}`; }
