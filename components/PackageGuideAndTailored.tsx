"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type GuideChoice = "occasional" | "regular" | "dealership" | "";
type TailoredResult = { message?: string };

const recommendation = {
  occasional: { plan: "manual", title: "Manual", copy: "Best when you advertise only when you need to. Pay for individual vehicle listing credits instead of a monthly plan." },
  regular: { plan: "pro", title: "Pro", copy: "Best for an owner-operator or business that advertises vehicles regularly and needs analytics, more photos and unlimited messaging." },
  dealership: { plan: "dealer", title: "Dealer", copy: "Best for a dealership that needs a public showroom, dealer statuses, stock tools, team access and dealer analytics." },
} as const;

export default function PackageGuideAndTailored({ darkMode }: { darkMode: boolean }) {
  const [choice, setChoice] = useState<GuideChoice>("");
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

  const surface = darkMode ? "border-white/10 bg-white/[.045]" : "border-black/10 bg-white/[.64]";
  const soft = darkMode ? "border-white/10 bg-white/[.025]" : "border-black/8 bg-black/[.025]";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const input = `mt-2 h-11 w-full rounded-xl border px-3 text-sm font-bold outline-none ${darkMode ? "border-white/12 bg-white/[.04] text-white" : "border-black/10 bg-white/70 text-black"}`;
  const selected = choice ? recommendation[choice] : null;
  const dealerIntent = showroom || teamSeats > 1 || listings >= 10;
  const tailoredPlan = dealerIntent ? "Dealer" : "Pro";
  const estimate = dealerIntent ? 2999 : 399;
  const effectivePhotos = dealerIntent ? Math.max(10, photos) : photos;
  const estimateText = useMemo(() => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(estimate), [estimate]);

  async function submitTailored() {
    if (busy || submitted) return;
    setBusy(true); setMessage("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        window.location.assign(`/login?returnTo=${encodeURIComponent("/packages/guide")}`);
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
      window.dispatchEvent(new CustomEvent("loadlink:toast", { detail: { kind: "success", title: "Sent to Control Centre", message: "Your tailored package request is under review.", duration: 5200 } }));
      window.dispatchEvent(new Event("loadlink-account-state-changed"));
    } catch (error) {
      const raw = error instanceof Error ? error.message : String((error as { message?: unknown })?.message || "");
      setMessage(/postgres|supabase|pgrst|row level security/i.test(raw) ? "LoadLink could not send the tailored request right now. Try again shortly." : raw || "LoadLink could not send the tailored request right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6" aria-label="Plan Guide">
      <article className={`rounded-[28px] border p-5 backdrop-blur-2xl sm:p-7 ${surface}`}>
        <p className={`text-[10px] font-black uppercase tracking-[.12em] ${muted}`}>Plan Guide</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-.04em] sm:text-3xl">How do you use LoadLink?</h2>
        <p className={`mt-2 max-w-xl text-sm font-semibold leading-6 ${muted}`}>Choose one. LoadLink gives you one recommendation.</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <Choice active={choice === "occasional"} onClick={() => setChoice("occasional")} darkMode={darkMode} title="Occasionally" detail="A few listings when needed" />
          <Choice active={choice === "regular"} onClick={() => setChoice("regular")} darkMode={darkMode} title="Regularly" detail="Ongoing owner/operator use" />
          <Choice active={choice === "dealership"} onClick={() => setChoice("dealership")} darkMode={darkMode} title="Dealership" detail="Showroom and sales workspace" />
        </div>

        {selected ? (
          <div className={`mt-4 rounded-[22px] border p-5 ${soft}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div><p className={`text-[9px] font-black uppercase tracking-[.12em] ${muted}`}>Recommended</p><h3 className="mt-1 text-2xl font-black">{selected.title}</h3><p className={`mt-2 max-w-xl text-xs font-semibold leading-5 ${muted}`}>{selected.copy}</p></div>
              <a href={`/packages#${selected.plan}-package`} className={darkMode ? "inline-flex h-11 shrink-0 items-center rounded-full bg-white px-5 text-xs font-black text-black" : "inline-flex h-11 shrink-0 items-center rounded-full bg-black px-5 text-xs font-black text-white"}>View {selected.title}</a>
            </div>
          </div>
        ) : null}

        <div className="mt-5 border-t border-current/10 pt-5">
          <button type="button" onClick={() => setTailoredOpen((value) => !value)} className={`text-xs font-black underline underline-offset-4 ${muted}`}>{tailoredOpen ? "Close tailored setup" : "Need a tailored setup?"}</button>
        </div>

        {tailoredOpen ? (
          <div className={`mt-4 rounded-[22px] border p-5 ${soft}`}>
            <div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-black">Tailored request</h3><p className={`mt-1 text-xs font-semibold leading-5 ${muted}`}>Only use this if Manual, Pro or Dealer does not fit your operating setup.</p></div><div className="text-right"><p className={`text-[9px] font-black uppercase tracking-[.1em] ${muted}`}>Guide</p><p className="text-sm font-black">{tailoredPlan}</p></div></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="text-[10px] font-black uppercase tracking-[.08em]">Active listings<input type="number" inputMode="numeric" pattern="[0-9]*" min={1} max={500} value={listings} onChange={(event) => setListings(Number(event.target.value) || 1)} className={input} /></label>
              <label className="text-[10px] font-black uppercase tracking-[.08em]">Photos / vehicle<input type="number" inputMode="numeric" pattern="[0-9]*" min={dealerIntent ? 10 : 5} max={15} value={effectivePhotos} onChange={(event) => setPhotos(Number(event.target.value) || 5)} className={input} /></label>
              <label className="text-[10px] font-black uppercase tracking-[.08em]">Team seats<input type="number" inputMode="numeric" pattern="[0-9]*" min={1} max={100} value={teamSeats} onChange={(event) => setTeamSeats(Number(event.target.value) || 1)} className={input} /></label>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3"><Toggle checked={analytics} onChange={setAnalytics} label="Analytics" darkMode={darkMode} /><Toggle checked={priority} onChange={setPriority} label="Higher visibility" darkMode={darkMode} /><Toggle checked={showroom} onChange={setShowroom} label="Public showroom" darkMode={darkMode} /></div>
            <div className="mt-4 flex flex-col gap-3 border-t border-current/10 pt-4 sm:flex-row sm:items-center sm:justify-between"><div><p className={`text-[9px] font-black uppercase tracking-[.1em] ${muted}`}>Base estimate</p><p className="mt-1 text-xl font-black">{estimateText} / month</p><p className={`mt-1 text-[10px] font-semibold ${muted}`}>Estimate only. Control Centre confirms final pricing.</p></div>{submitted ? <div className="flex items-center gap-2 text-sm font-black"><span className={darkMode ? "grid h-8 w-8 place-items-center rounded-full bg-white text-black" : "grid h-8 w-8 place-items-center rounded-full bg-black text-white"}>✓</span>Sent for review</div> : <button type="button" onClick={() => void submitTailored()} disabled={busy} className={darkMode ? "h-11 rounded-full bg-white px-5 text-xs font-black text-black disabled:opacity-45" : "h-11 rounded-full bg-black px-5 text-xs font-black text-white disabled:opacity-45"}>{busy ? "Sending…" : "Send for review"}</button>}</div>
            {message ? <p role="status" className={`mt-3 text-xs font-bold ${submitted ? muted : "text-red-500"}`}>{message}</p> : null}
          </div>
        ) : null}
      </article>
    </section>
  );
}

function Choice({ active, onClick, darkMode, title, detail }: { active: boolean; onClick: () => void; darkMode: boolean; title: string; detail: string }) {
  return <button type="button" onClick={onClick} className={`rounded-[20px] border p-4 text-left transition ${active ? darkMode ? "border-white bg-white text-black" : "border-black bg-black text-white" : darkMode ? "border-white/12 bg-white/[.025]" : "border-black/10 bg-white/45"}`}><span className="block text-sm font-black">{title}</span><span className="mt-1 block text-[10px] font-semibold opacity-55">{detail}</span></button>;
}
function Toggle({ checked, onChange, label, darkMode }: { checked: boolean; onChange: (value: boolean) => void; label: string; darkMode: boolean }) {
  return <button type="button" aria-pressed={checked} onClick={() => onChange(!checked)} className={`flex min-h-11 items-center justify-between rounded-xl border px-3 text-xs font-black ${checked ? darkMode ? "border-white/40" : "border-black/35" : darkMode ? "border-white/10" : "border-black/8"}`}><span>{label}</span><span className={`ml-3 h-2.5 w-2.5 rounded-full ${checked ? darkMode ? "bg-white" : "bg-black" : darkMode ? "bg-white/20" : "bg-black/15"}`} /></button>;
}
