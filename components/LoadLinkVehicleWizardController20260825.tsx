"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const STEP_LABELS = ["Type", "Vehicle details", "Photos & documents", "Review"] as const;
const FORM_ID = "vehicle-listing-form";

function getWizardSections() {
  const form = document.getElementById(FORM_ID) as HTMLFormElement | null;
  if (!form) return { form: null, sections: [] as HTMLElement[] };
  const sections = Array.from(form.querySelectorAll<HTMLElement>(":scope > section")).slice(0, STEP_LABELS.length);
  return { form, sections };
}

function revealStep(step: number) {
  const { form, sections } = getWizardSections();
  if (!form || !sections.length) return false;

  sections.forEach((section, index) => {
    const active = index === step;
    section.hidden = !active;
    section.setAttribute("aria-hidden", active ? "false" : "true");
    section.dataset.loadlinkWizardStep = String(index + 1);
    section.dataset.loadlinkWizardActive = active ? "true" : "false";
  });

  form.dataset.loadlinkWizardReady = "true";
  return true;
}

function firstInvalidControl(section: HTMLElement) {
  const controls = Array.from(section.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"));
  return controls.find((control) => !control.disabled && !control.checkValidity()) ?? null;
}

export default function LoadLinkVehicleWizardController20260825({ darkMode }: { darkMode: boolean }) {
  const [activeStep, setActiveStep] = useState(0);
  const [formReady, setFormReady] = useState(false);
  const lastStep = STEP_LABELS.length - 1;

  const applyStep = useCallback(() => {
    const ready = revealStep(activeStep);
    setFormReady(ready);
    return ready;
  }, [activeStep]);

  useEffect(() => {
    let frame = 0;
    let observer: MutationObserver | null = null;

    const sync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        applyStep();
      });
    };

    sync();
    observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      const { form, sections } = getWizardSections();
      sections.forEach((section) => {
        section.hidden = false;
        section.removeAttribute("aria-hidden");
        delete section.dataset.loadlinkWizardStep;
        delete section.dataset.loadlinkWizardActive;
      });
      if (form) delete form.dataset.loadlinkWizardReady;
    };
  }, [applyStep]);

  useEffect(() => {
    if (!formReady) return;
    revealStep(activeStep);
    const { sections } = getWizardSections();
    const section = sections[activeStep];
    if (!section) return;
    const target = section.querySelector<HTMLElement>("input:not([type='hidden']), select, textarea, button") ?? section;
    const timer = window.setTimeout(() => {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      if (activeStep > 0 && target instanceof HTMLElement) {
        try { target.focus({ preventScroll: true }); } catch {}
      }
    }, 70);
    return () => window.clearTimeout(timer);
  }, [activeStep, formReady]);

  const progress = useMemo(() => `${Math.round(((activeStep + 1) / STEP_LABELS.length) * 100)}%`, [activeStep]);

  function goNext() {
    const { sections } = getWizardSections();
    const section = sections[activeStep];
    if (!section) return;

    const invalid = firstInvalidControl(section);
    if (invalid) {
      invalid.reportValidity();
      invalid.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setActiveStep((step) => Math.min(lastStep, step + 1));
  }

  function goBack() {
    setActiveStep((step) => Math.max(0, step - 1));
  }

  return (
    <>
      <section
        className={`sticky top-20 z-30 border-y px-4 py-3 backdrop-blur-xl ${darkMode ? "border-white/10 bg-black/90" : "border-black/10 bg-[#f5f1e8]/94"}`}
        aria-label="Vehicle listing progress"
        data-loadlink-source-wizard="20260825"
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.14em] opacity-45">Step {activeStep + 1} of {STEP_LABELS.length}</p>
              <p className="mt-0.5 text-sm font-black tracking-[-.02em]">{STEP_LABELS[activeStep]}</p>
            </div>
            <p className="text-[10px] font-black opacity-45">{progress}</p>
          </div>
          <div className={`mt-2 h-1 overflow-hidden rounded-full ${darkMode ? "bg-white/10" : "bg-black/10"}`}>
            <div className="h-full rounded-full bg-[#f6b800] transition-[width] duration-300" style={{ width: progress }} />
          </div>
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5" aria-label="Listing steps">
            {STEP_LABELS.map((label, index) => {
              const current = index === activeStep;
              const complete = index < activeStep;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => index <= activeStep && setActiveStep(index)}
                  aria-current={current ? "step" : undefined}
                  disabled={index > activeStep}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[9px] font-black transition ${current ? "border-[#f6b800] bg-[#f6b800] text-black" : complete ? darkMode ? "border-white/18 bg-white/8 text-white" : "border-black/15 bg-black/[.04] text-black" : "border-current/10 opacity-35"}`}
                >
                  <span>{complete ? "✓" : index + 1}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {formReady ? (
        <nav
          className={`fixed inset-x-0 bottom-0 z-40 border-t px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl ${darkMode ? "border-white/10 bg-black/92" : "border-black/10 bg-[#f5f1e8]/95"}`}
          aria-label="Vehicle listing step controls"
        >
          <div className="mx-auto flex max-w-5xl items-center gap-2">
            {activeStep > 0 ? (
              <button type="button" onClick={goBack} className="h-12 min-w-[96px] rounded-full border border-current/15 px-5 text-xs font-black">Back</button>
            ) : null}
            <div className="min-w-0 flex-1 px-1">
              <p className="truncate text-[10px] font-black uppercase tracking-[.08em] opacity-45">{STEP_LABELS[activeStep]}</p>
              <p className="truncate text-[11px] font-semibold opacity-60">{activeStep === lastStep ? "Check your details, then publish below." : "Complete this step to continue."}</p>
            </div>
            {activeStep < lastStep ? (
              <button type="button" onClick={goNext} className="h-12 min-w-[112px] rounded-full bg-[#f6b800] px-5 text-xs font-black text-black">Continue</button>
            ) : null}
          </div>
        </nav>
      ) : null}
    </>
  );
}
