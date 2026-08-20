"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type GuideChoice = "occasional" | "regular" | "dealership" | "";
type TailoredResult = { recommended_plan?: string; estimated_amount_cents?: number; message?: string; duplicate?: boolean };

function planName(value: string) {
  if (value === "dealer") return "Dealer";
  if (value === "pro") return "Pro";
  return "Manual";
}

export default function PackageGuideAndTailored({ darkMode }: { darkMode: boolean }) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideChoice, setGuideChoice] = useState<GuideChoice>("");
  const [tailoredOpen, setTailoredOpen] = useState(false);
  const [listings, setListings] = useState(4);
  const [photos, setPhotos] = useState(10);
  const [analytics, setAnalytics] = useState(true);
  const [priority, setPriority] = useState(false);
  const [showroom, setShowroom] = useState(false);
  const [teamSeats, setTeamSeats] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const surface = darkMode ? "border-white/10 bg-[#0a0a0a]" : "border-black/10 bg-white";
  const soft = darkMode ? "border-white/10 bg-white/[.035]" : "border-black/10 bg-black/[.025]";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const input = `h-11 w-full rounded-xl border px-3 text-sm font-bold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/15 bg-black text-white" : "border-black/10 bg-white text-black"}`;

  const guidePlan = guideChoice === "dealership" ? "dealer" : guideChoice === "regular" ? "pro" : guideChoice === "occasional" ? "manual" : "";
  const dealerIntent = showroom || teamSeats > 1 || listings >= 10;
  const tailoredPlan = dealerIntent ? "dealer" : "pro";
  const estimate = tailoredPlan === "dealer" ? 2999 : 399;
  const effectivePhotos = dealerIntent ? Math.max(10, photos) : photos;

  useEffect(() => {
    if (dealerIntent && photos < 10) setPhotos(10);
  }, [dealerIntent, photos]);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!active || !data.user) return;
      const result = await supabase.from("custom_package_requests").select("status").eq("user_id", data.user.id).eq("status", "pending_review").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (active && !result.error && result.data) setSubmitted(true);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function submitTailored() {
    if (busy || submitted) return;
    setBusy(true);
    setMessage("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        window.location.assign(`/login?returnTo=${encodeURIComponent("/packages")}`);
        return;
      }
      const result = await supabase.rpc("loadlink_submit_tailored_package_request", {
        p_listings: Math.max(1, Math.min(500, listings)),
        p_photos: Math.max(5, Math.min(15, effectivePhotos)),
        p_analytics: analytics,
        p_priority: priority,
        p_showroom: showroom,
        p_team_seats: Math.max(1, Math.min(100, teamSeats)),
      });
      if (result.error) throw result.error;
      const payload = (result.data || {}) as TailoredResult;
      setSubmitted(true);
      setMessage(payload.message || "Your tailored package request is now under review.");
      window.dispatchEvent(new Event("loadlink-account-state-changed"));
      window.dispatchEvent(new CustomEvent("loadlink:toast", { detail: { kind: "success", title: "Sent to Control Centre", message: "Your tailored package request is now under review.", duration: 5200 } }));
    } catch (error) {
      const raw = error instanceof Error ? error.message : String((error as { message?: unknown })?.message || "");
      setMessage(/postgres|supabase|pgrst|row level security/i.test(raw) ? "LoadLink could not send the tailored request right now. Try again shortly." : raw || "LoadLink could not send the tailored request right now.");
    } finally {
      setBusy(false);
    }
  }

  const guideCopy = useMemo(() => {
    if (guidePlan === "manual") return { title: "Manual", copy: "Best when you only advertise occasionally and want to pay for the vehicle-listing days you actually need." };
    if (guidePlan === "pro") return { title: "Pro", copy: "Best for an owner-operator or business advertising vehicles regularly and needing analytics, more photos and higher marketplace visibility." };
    if (guidePlan === "dealer") return { title: "Dealer", copy: "Best when you operate a dealership and need a public showroom, stock tools, staff access and dealer analytics." };
    return null;
  }, [guidePlan]);

  return (
    <section className="mt-6 grid gap-4 lg:grid-cols-2" aria-label="Plan Guide and tailored packages">
      <article className={`rounded-[24px] border p-5 sm:p-6 ${surface}`}>
        <p className={`text-[10px] font-black uppercase tracking-[.14em] ${muted}`}>Plan Guide</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-.04em]">One recommendation, not another pricing maze.</h2>
        <p className={`mt-2 text-xs font-semibold leading-5 ${muted}`}>Tell LoadLink how you use the marketplace and the guide will point to one package.</p>

        {!guideOpen ? <button type="button" onClick={() => setGuideOpen(true)} className="mt-5 h-11 rounded-xl bg-[#f6b800] px-5 text-xs font-black text-black">Find my package</button> : (
          <div className="mt-5">
            <p className="text-xs font-black">How do you advertise vehicles?</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {([
                ["occasional", "A few days"],
                ["regular", "Regularly"],
                ["dealership", "Dealership"],
              ] as [GuideChoice, string][]).map(([value, label]) => <button key={value} type="button" onClick={() => setGuideChoice(value)} className={`min-h-11 rounded-xl border px-3 text-xs font-black ${guideChoice === value ? "border-[#f6b800] bg-[#f6b800] text-black" : darkMode ? "border-white/12" : "border-black/10"}`}>{label}</button>)}
            </div>
            {guideCopy ? <div className={`mt-4 rounded-2xl border p-4 ${soft}`}><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#a47700]">Recommended</p><h3 className="mt-1 text-xl font-black">{guideCopy.title}</h3><p className={`mt-2 text-xs font-semibold leading-5 ${muted}`}>{guideCopy.copy}</p><a href={`#${guidePlan}-package`} className="mt-3 inline-flex text-xs font-black underline decoration-[#f6b800] decoration-2 underline-offset-4">View {guideCopy.title}</a></div> : null}
          </div>
        )}
      </article>

      <article className={`rounded-[24px] border p-5 sm:p-6 ${surface}`}>
        <p className={`text-[10px] font-black uppercase tracking-[.14em] ${muted}`}>Tailored package</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-.04em]">Need a different operating setup?</h2>
        <p className={`mt-2 text-xs font-semibold leading-5 ${muted}`}>Build one concise request. LoadLink recommends the entitlement, shows the base estimate and sends it to Control Centre for final pricing.</p>

        {!tailoredOpen ? <button type="button" onClick={() => setTailoredOpen(true)} className={`mt-5 h-11 rounded-xl border px-5 text-xs font-black ${darkMode ? "border-white/15" : "border-black/15"}`}>Build tailored request</button> : (
          <div className="mt-5 grid gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-[10px] font-black uppercase tracking-[.08em]">Active listings<input type="number" min={1} max={500} value={listings} onChange={(event) => setListings(Number(event.target.value) || 1)} className={`mt-2 ${input}`} /></label>
              <label className="text-[10px] font-black uppercase tracking-[.08em]">Photos / vehicle<input type="number" min={dealerIntent ? 10 : 5} max={15} value={effectivePhotos} onChange={(event) => setPhotos(Number(event.target.value) || 5)} className={`mt-2 ${input}`} /></label>
              <label className="text-[10px] font-black uppercase tracking-[.08em]">Team seats<input type="number" min={1} max={100} value={teamSeats} onChange={(event) => setTeamSeats(Number(event.target.value) || 1)} className={`mt-2 ${input}`} /></label>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Toggle checked={analytics} onChange={setAnalytics} label="Analytics" darkMode={darkMode} />
              <Toggle checked={priority} onChange={setPriority} label="Higher visibility" darkMode={darkMode} />
              <Toggle checked={showroom} onChange={setShowroom} label="Public showroom" darkMode={darkMode} />
            </div>
            <div className={`rounded-2xl border p-4 ${soft}`}>
              <div className="flex flex-wrap items-end justify-between gap-3"><div><p className={`text-[9px] font-black uppercase tracking-[.12em] ${muted}`}>Guide estimate</p><p className="mt-1 text-2xl font-black">R{estimate.toLocaleString("en-ZA")}<span className={`ml-1 text-[10px] ${muted}`}>/ month</span></p></div><div className="text-right"><p className={`text-[9px] font-black uppercase tracking-[.12em] ${muted}`}>Recommended entitlement</p><p className="mt-1 text-sm font-black">{planName(tailoredPlan)}</p></div></div>
              <p className={`mt-2 text-[10px] font-semibold leading-5 ${muted}`}>This is a base estimate, not a charge. Control Centre confirms the final monthly amount before payment is available.</p>
            </div>
            {submitted ? <div className={`rounded-2xl border p-4 ${soft}`}><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f6b800] text-lg font-black text-black">✓</span><div><p className="text-sm font-black">Sent to Control Centre</p><p className={`mt-1 text-xs font-semibold leading-5 ${muted}`}>{message || "Your tailored package request is under review. You do not need to send it again."}</p></div></div></div> : <button type="button" onClick={() => void submitTailored()} disabled={busy} className="h-12 rounded-xl bg-[#f6b800] text-sm font-black text-black disabled:opacity-45">{busy ? "Sending…" : "Send for review"}</button>}
            {!submitted ? <button type="button" onClick={() => setTailoredOpen(false)} className={`text-xs font-black ${muted}`}>Close tailored builder</button> : null}
            {message && !submitted ? <p role="status" className="text-xs font-bold text-red-500">{message}</p> : null}
          </div>
        )}
      </article>
    </section>
  );
}

function Toggle({ checked, onChange, label, darkMode }: { checked: boolean; onChange: (value: boolean) => void; label: string; darkMode: boolean }) {
  return <button type="button" aria-pressed={checked} onClick={() => onChange(!checked)} className={`flex min-h-11 items-center justify-between rounded-xl border px-3 text-xs font-black ${checked ? "border-[#f6b800]" : darkMode ? "border-white/12" : "border-black/10"}`}><span>{label}</span><span className={`ml-3 h-2.5 w-2.5 rounded-full ${checked ? "bg-[#f6b800]" : darkMode ? "bg-white/20" : "bg-black/15"}`} /></button>;
}
