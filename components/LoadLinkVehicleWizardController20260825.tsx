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
    const sync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => applyStep());
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
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
    const timer = window.setTimeout(() => section.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
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

  function cancelListing() {
    const confirmed = window.confirm("Cancel this listing? Your saved vehicle draft will be cleared.");
    if (!confirmed) return;
    try {
      localStorage.removeItem("loadlink-vehicle-draft-v1");
      localStorage.removeItem("loadlink-vehicle-submission-id");
    } catch {}
    window.location.assign("/list-your-vehicle");
  }

  return (
    <>
      <section
        className={`sticky top-20 z-30 border-y px-4 py-3 backdrop-blur-xl ${darkMode ? "border-white/10 bg-black/92" : "border-black/10 bg-[#f5f1e8]/96"}`}
        aria-label="Vehicle listing progress"
        data-loadlink-source-wizard="jobs-style-step-guide"
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.12em] opacity-45">Step {activeStep + 1} of {STEP_LABELS.length}</p>
              <p className="mt-1 text-sm font-bold">{STEP_LABELS[activeStep]}</p>
            </div>
            <span className="text-[11px] font-semibold opacity-45">{progress}</span>
          </div>
          <div className={`mt-3 h-1 overflow-hidden rounded-full ${darkMode ? "bg-white/10" : "bg-black/10"}`}>
            <div className="h-full rounded-full bg-[#f6b800] transition-[width] duration-300" style={{ width: progress }} />
          </div>
        </div>
      </section>

      {formReady ? (
        <nav
          className={`fixed inset-x-0 bottom-0 z-40 border-t px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl ${darkMode ? "border-white/10 bg-black/94" : "border-black/10 bg-[#f5f1e8]/97"}`}
          aria-label="Vehicle listing step controls"
        >
          <div className="mx-auto flex max-w-5xl items-center gap-2">
            <button type="button" onClick={cancelListing} className={`h-12 rounded-[16px] border px-4 text-xs font-bold ${darkMode ? "border-white/14 text-white/70" : "border-black/12 text-black/65"}`}>
              Cancel listing
            </button>
            {activeStep > 0 ? (
              <button type="button" onClick={goBack} className={`h-12 rounded-[16px] border px-5 text-xs font-bold ${darkMode ? "border-white/14" : "border-black/12"}`}>
                Back
              </button>
            ) : null}
            <div className="flex-1" />
            {activeStep < lastStep ? (
              <button type="button" onClick={goNext} className="h-12 min-w-[118px] rounded-[16px] bg-[#f6b800] px-5 text-sm font-bold text-black transition active:scale-[.99]">
                Continue
              </button>
            ) : (
              <span className="px-2 text-right text-[11px] font-semibold opacity-55">Review your details, then submit below.</span>
            )}
          </div>
        </nav>
      ) : null}
    </>
  );
}
