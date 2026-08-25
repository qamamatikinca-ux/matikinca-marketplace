"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type GuideChoice = "occasional" | "regular" | "dealership" | "";
type TailoredResult = { message?: string };

type Recommendation = {
  plan: "manual" | "pro" | "dealer";
  title: string;
  eyebrow: string;
  copy: string;
  reasons: string[];
};

const recommendations: Record<Exclude<GuideChoice, "">, Recommendation> = {
  occasional: {
    plan: "manual",
    title: "Manual",
    eyebrow: "Best fit for occasional use",
    copy: "Buy listing access when you need it instead of carrying a monthly vehicle-advertising plan.",
    reasons: ["No ongoing advertising commitment", "Good for a small number of listings", "Upgrade later if your usage grows"],
  },
  regular: {
    plan: "pro",
    title: "Pro",
    eyebrow: "Best fit for regular operators",
    copy: "Built for owner-operators and logistics businesses that use LoadLink throughout the month.",
    reasons: ["More room for listing photos", "Marketplace analytics where available", "Higher everyday usage limits"],
  },
  dealership: {
    plan: "dealer",
    title: "Dealer",
    eyebrow: "Best fit for dealerships",
    copy: "The dealership workspace adds showroom, stock, team and dealer-management tools around the marketplace.",
    reasons: ["Public dealership showroom", "Stock and lead workspace", "Dealer team and analytics tools"],
  },
};

export default function PackageGuideAndTailored({ darkMode }: { darkMode: boolean }) {
  const [choice, setChoice] = useState<GuideChoice>("");
  const [customOpen, setCustomOpen] = useState(false);
  const [listings, setListings] = useState(4);
  const [photos, setPhotos] = useState(10);
  const [analytics, setAnalytics] = useState(true);
  const [priority, setPriority] = useState(false);
  const [showroom, setShowroom] = useState(false);
  const [teamSeats, setTeamSeats] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const muted = darkMode ? "text-white/55" : "text-black/55";
  const surface = darkMode ? "border-white/10 bg-[#080808]" : "border-black/10 bg-white";
  const row = darkMode ? "border-white/10" : "border-black/10";
  const input = `h-12 w-full rounded-xl border px-3 text-base font-bold outline-none focus:ring-2 focus:ring-[#f6b800]/45 ${darkMode ? "border-white/12 bg-white/[.045] text-white" : "border-black/10 bg-[#faf8f2] text-black"}`;
  const selected = choice ? recommendations[choice] : null;
  const dealerIntent = showroom || teamSeats > 1 || listings >= 10;
  const requestDirection = dealerIntent ? "Dealer-style setup" : "Pro-style setup";

  async function submitTailored() {
    if (busy || submitted) return;
    setBusy(true);
    setMessage("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        window.location.assign(`/login?returnTo=${encodeURIComponent("/packages/guide")}`);
        return;
      }

      const result = await supabase.rpc("loadlink_submit_tailored_package_request", {
        p_listings: Math.max(1, Math.min(500, listings)),
        p_photos: Math.max(5, Math.min(15, photos)),
        p_analytics: analytics,
        p_priority: priority,
        p_showroom: showroom,
        p_team_seats: Math.max(1, Math.min(100, teamSeats)),
      });
      if (result.error) throw result.error;

      const payload = (result.data || {}) as TailoredResult;
      setSubmitted(true);
      setMessage(payload.message || "Your tailored package request is now under review.");
      window.dispatchEvent(
        new CustomEvent("loadlink:toast", {
          detail: {
            kind: "success",
            title: "Sent to Control Centre",
            message: "Your tailored package request is under review.",
            duration: 5200,
          },
        }),
      );
      window.dispatchEvent(new Event("loadlink-account-state-changed"));
    } catch (error) {
      const raw = error instanceof Error ? error.message : String((error as { message?: unknown })?.message || "");
      setMessage(
        /postgres|supabase|pgrst|row level security/i.test(raw)
          ? "LoadLink could not send the tailored request right now. Try again shortly."
          : raw || "LoadLink could not send the tailored request right now.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6" aria-label="Plan Guide" data-loadlink-plan-guide="source-v8">
      <article className={`overflow-hidden rounded-[26px] border ${surface}`}>
        <header className="px-5 pb-5 pt-6 sm:px-7 sm:pt-7">
          <p className={`text-[9px] font-black uppercase tracking-[.16em] ${muted}`}>Plan Guide</p>
          <h2 className="mt-2 max-w-xl text-[30px] font-black leading-[1.02] tracking-[-.05em] sm:text-[38px]">Tell us how you use LoadLink.</h2>
          <p className={`mt-3 max-w-xl text-sm font-semibold leading-6 ${muted}`}>One question. One recommendation. You can still compare every package before buying.</p>
        </header>

        <div className={`border-y ${row}`} role="radiogroup" aria-label="How you use LoadLink">
          <UsageRow
            checked={choice === "occasional"}
            onSelect={() => setChoice("occasional")}
            title="I list only when needed"
            detail="A truck, trailer or unit from time to time"
            darkMode={darkMode}
          />
          <UsageRow
            checked={choice === "regular"}
            onSelect={() => setChoice("regular")}
            title="I use LoadLink regularly"
            detail="Ongoing owner-operator or business use"
            darkMode={darkMode}
          />
          <UsageRow
            checked={choice === "dealership"}
            onSelect={() => setChoice("dealership")}
            title="I run a dealership"
            detail="Stock, showroom, leads or a sales team"
            darkMode={darkMode}
            last
          />
        </div>

        <div className="px-5 py-5 sm:px-7 sm:py-6">
          {selected ? (
            <div aria-live="polite">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[.14em] text-[#b78300] dark:text-[#f6b800]">{selected.eyebrow}</p>
                  <h3 className="mt-1 text-3xl font-black tracking-[-.045em]">{selected.title}</h3>
                  <p className={`mt-2 max-w-xl text-sm font-semibold leading-6 ${muted}`}>{selected.copy}</p>
                </div>
                <a
                  href={`/packages#${selected.plan}-package`}
                  className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-[#f6b800] px-6 text-xs font-black text-black"
                >
                  View {selected.title}
                </a>
              </div>
              <ul className={`mt-5 divide-y border-y ${row}`}>
                {selected.reasons.map((reason) => (
                  <li key={reason} className="flex min-h-11 items-center gap-3 py-2 text-xs font-bold">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#f6b800] text-[10px] text-black">✓</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className={`rounded-2xl border border-dashed p-5 text-sm font-semibold leading-6 ${darkMode ? "border-white/12 text-white/50" : "border-black/12 text-black/50"}`}>
              Choose the description that matches you. LoadLink will show only the most relevant starting point.
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-current/10 pt-5">
            <div>
              <p className="text-xs font-black">None of those fit?</p>
              <p className={`mt-0.5 text-[11px] font-semibold ${muted}`}>Send your operating requirements to Control Centre.</p>
            </div>
            <button
              type="button"
              aria-expanded={customOpen}
              onClick={() => setCustomOpen((value) => !value)}
              className="h-10 rounded-full border border-current/15 px-4 text-[11px] font-black"
            >
              {customOpen ? "Close custom request" : "Custom setup"}
            </button>
          </div>

          {customOpen ? (
            <div className="mt-5 border-t border-current/10 pt-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black">Your operating requirements</h3>
                  <p className={`mt-1 max-w-lg text-xs font-semibold leading-5 ${muted}`}>This is a request, not an automatic quote. Control Centre reviews the final setup and pricing.</p>
                </div>
                <span className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[.1em] ${row}`}>{requestDirection}</span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <Field label="Active listings">
                  <input type="number" inputMode="numeric" min={1} max={500} value={listings} onChange={(event) => setListings(Number(event.target.value) || 1)} className={input} />
                </Field>
                <Field label="Photos per vehicle">
                  <input type="number" inputMode="numeric" min={5} max={15} value={photos} onChange={(event) => setPhotos(Number(event.target.value) || 5)} className={input} />
                </Field>
                <Field label="Team seats">
                  <input type="number" inputMode="numeric" min={1} max={100} value={teamSeats} onChange={(event) => setTeamSeats(Number(event.target.value) || 1)} className={input} />
                </Field>
              </div>

              <div className={`mt-5 divide-y border-y ${row}`}>
                <Requirement checked={analytics} onChange={setAnalytics} label="Analytics" detail="Performance reporting where supported" />
                <Requirement checked={priority} onChange={setPriority} label="Higher visibility" detail="Ask Control Centre about additional marketplace visibility" />
                <Requirement checked={showroom} onChange={setShowroom} label="Public showroom" detail="Dealer-facing public stock presence" />
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className={`max-w-lg text-[11px] font-semibold leading-5 ${muted}`}>No price is invented here. Your request is stored and reviewed against the packages and controls configured for your account.</p>
                {submitted ? (
                  <div className="flex h-11 items-center gap-2 text-xs font-black">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f6b800] text-black">✓</span>
                    Sent for review
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void submitTailored()}
                    disabled={busy}
                    className="h-12 shrink-0 rounded-full bg-[#f6b800] px-6 text-xs font-black text-black disabled:opacity-45"
                  >
                    {busy ? "Sending…" : "Send to Control Centre"}
                  </button>
                )}
              </div>
              {message ? <p role="status" className={`mt-3 text-xs font-bold ${submitted ? muted : "text-red-500"}`}>{message}</p> : null}
            </div>
          ) : null}
        </div>
      </article>
    </section>
  );
}

function UsageRow({ checked, onSelect, title, detail, darkMode, last = false }: { checked: boolean; onSelect: () => void; title: string; detail: string; darkMode: boolean; last?: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={`flex w-full items-center gap-4 px-5 py-4 text-left transition sm:px-7 ${last ? "" : "border-b border-current/10"} ${checked ? darkMode ? "bg-white/[.07]" : "bg-black/[.035]" : darkMode ? "hover:bg-white/[.035]" : "hover:bg-black/[.02]"}`}
    >
      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${checked ? "border-[#f6b800] bg-[#f6b800]" : "border-current/25"}`}>
        {checked ? <span className="h-2 w-2 rounded-full bg-black" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black">{title}</span>
        <span className="mt-0.5 block text-[11px] font-semibold opacity-50">{detail}</span>
      </span>
      <span className="text-lg opacity-35">›</span>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-[10px] font-black uppercase tracking-[.08em]">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Requirement({ checked, onChange, label, detail }: { checked: boolean; onChange: (value: boolean) => void; label: string; detail: string }) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center gap-3 py-2.5">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[#f6b800]" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-black">{label}</span>
        <span className="mt-0.5 block text-[10px] font-semibold opacity-45">{detail}</span>
      </span>
    </label>
  );
}
