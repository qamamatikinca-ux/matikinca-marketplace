"use client";

import { useState } from "react";

export type PackageRecommendation = "manual" | "pro" | "dealer";

type Identity = "individual" | "operator" | "dealer";
type Frequency = "occasional" | "regular";

export default function PackageGuide({
  darkMode = false,
  onComplete,
}: {
  darkMode?: boolean;
  onComplete: (plan: PackageRecommendation) => void;
}) {
  const [step, setStep] = useState(0);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [frequency, setFrequency] = useState<Frequency | null>(null);
  const muted = darkMode ? "text-white/52" : "text-black/52";
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const progress = ((step + 1) / 3) * 100;

  function finish(needsBusinessTools: boolean) {
    const recommendation: PackageRecommendation =
      identity === "dealer" || needsBusinessTools
        ? "dealer"
        : frequency === "regular"
          ? "pro"
          : "manual";
    onComplete(recommendation);
  }

  return (
    <section className={`overflow-hidden rounded-[26px] border ${surface}`} data-loadlink-package-questions="v275">
      <div className="h-1 bg-current/5">
        <div className="h-full bg-[#f6b800] transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
      <div className="p-5 sm:p-7">
        <p className={`text-[10px] font-black uppercase tracking-[.12em] ${muted}`}>Find the right LoadLink option</p>

        {step === 0 ? (
          <>
            <h1 className="mt-3 text-[30px] font-black tracking-[-.05em] sm:text-[38px]">Which best describes how you use vehicles?</h1>
            <p className={`mt-2 max-w-xl text-sm font-semibold leading-6 ${muted}`}>This only changes the recommendation. You can still compare every LoadLink option afterwards.</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              <Choice label="Individual owner" detail="I advertise my own vehicle when needed" onClick={() => { setIdentity("individual"); setStep(1); }} />
              <Choice label="Transport operator" detail="I advertise vehicles as part of my business" onClick={() => { setIdentity("operator"); setStep(1); }} />
              <Choice label="Dealership" detail="I sell or manage vehicle stock" onClick={() => { setIdentity("dealer"); setStep(1); }} />
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <h2 className="text-[28px] font-black tracking-[-.045em]">How often do you expect to advertise vehicles?</h2>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Choice label="Only when I need it" detail="Occasional or one-off advertising" onClick={() => { setFrequency("occasional"); setStep(2); }} />
              <Choice label="Regularly" detail="Ongoing vehicle advertising" onClick={() => { setFrequency("regular"); setStep(2); }} />
            </div>
            <Back onClick={() => setStep(0)} />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2 className="text-[28px] font-black tracking-[-.045em]">Do you need dealership-style business tools?</h2>
            <p className={`mt-2 max-w-xl text-sm font-semibold leading-6 ${muted}`}>This includes a public showroom, staff access, lead management and dealership sales tools.</p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <Choice label="Yes" onClick={() => finish(true)} />
              <Choice label="No" onClick={() => finish(false)} />
            </div>
            <Back onClick={() => setStep(1)} />
          </>
        ) : null}
      </div>
    </section>
  );
}

function Choice({ label, detail, onClick }: { label: string; detail?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="min-h-[82px] rounded-[18px] border border-current/10 px-4 py-4 text-left transition active:scale-[.99] hover:border-[#f6b800]/70">
      <span className="block text-sm font-black">{label}</span>
      {detail ? <span className="mt-1.5 block text-[10px] font-semibold leading-4 opacity-50">{detail}</span> : null}
    </button>
  );
}

function Back({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="mt-5 text-[11px] font-black opacity-50">Back</button>;
}
