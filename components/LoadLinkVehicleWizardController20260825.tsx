"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const STEP_LABELS = ["Type", "Vehicle details", "Photos & documents", "Review"] as const;
const FORM_ID = "vehicle-listing-form";
type ListingKind = "vehicle" | "mobile-unit";

function getWizardSections() {
  const form = document.getElementById(FORM_ID) as HTMLFormElement | null;
  if (!form) return { form: null, sections: [] as HTMLElement[] };
  const sections = Array.from(form.querySelectorAll<HTMLElement>(":scope > section")).slice(0, STEP_LABELS.length);
  return { form, sections };
}

function revealStep(step: number) {
  const { form, sections } = getWizardSections();
  if (!form || !sections.length) return false;
  const safeStep = Math.max(0, Math.min(step, sections.length - 1));

  sections.forEach((section, index) => {
    const active = index === safeStep;
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

function confirmationButton(section: HTMLElement) {
  return Array.from(section.querySelectorAll<HTMLButtonElement>("button")).find((button) => /confirm (truck model|vehicle details)/i.test(button.textContent || "")) || null;
}

export default function LoadLinkVehicleWizardController20260825({ darkMode, listingKind = "vehicle" }: { darkMode: boolean; listingKind?: ListingKind }) {
  const [activeStep, setActiveStep] = useState(0);
  const [formReady, setFormReady] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const lastStep = STEP_LABELS.length - 1;
  const listingLabel = listingKind === "mobile-unit" ? "mobile unit" : "vehicle";

  const applyStep = useCallback(() => {
    const { sections } = getWizardSections();
    if (sections.length && activeStep >= sections.length) {
      setActiveStep(Math.max(0, sections.length - 1));
      return true;
    }
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

    if (activeStep === 0 && sections.length < 2) {
      const confirm = confirmationButton(section);
      if (confirm) {
        confirm.click();
        window.setTimeout(() => {
          const nextSections = getWizardSections().sections;
          if (nextSections.length > 1) setActiveStep(1);
          else confirm.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 120);
      }
      return;
    }

    if (activeStep + 1 >= sections.length) return;
    setActiveStep((step) => Math.min(lastStep, step + 1));
  }

  function goBack() {
    setActiveStep((step) => Math.max(0, step - 1));
  }

  function confirmCancelListing() {
    try {
      localStorage.removeItem("loadlink-vehicle-draft-v1");
      localStorage.removeItem("loadlink-vehicle-submission-id");
    } catch {}
    window.location.assign("/list-your-vehicle");
  }

  return (
    <>
      <section
        className={`sticky top-20 z-30 border-y px-4 py-3 backdrop-blur-xl ${darkMode ? "border-white/10 bg-black/88" : "border-black/10 bg-[#f5f1e8]/90"}`}
        aria-label={`${listingLabel} listing progress`}
        data-loadlink-source-wizard="jobs-style-working-v3"
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
          className={`fixed inset-x-0 bottom-0 z-40 border-t px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl ${darkMode ? "border-white/10 bg-black/88" : "border-black/10 bg-[#f5f1e8]/90"}`}
          aria-label={`${listingLabel} listing step controls`}
        >
          <div className="mx-auto flex max-w-5xl items-center gap-2">
            <button type="button" onClick={() => setCancelOpen(true)} className={`h-12 rounded-[16px] border px-4 text-xs font-bold ${darkMode ? "border-white/14 bg-white/[.025] text-white/70" : "border-black/12 bg-white/30 text-black/65"}`}>Cancel {listingLabel} listing</button>
            {activeStep > 0 ? <button type="button" onClick={goBack} className={`h-12 rounded-[16px] border px-5 text-xs font-bold ${darkMode ? "border-white/14" : "border-black/12"}`}>Back</button> : null}
            <div className="flex-1" />
            {activeStep < lastStep ? <button type="button" onClick={goNext} className="h-12 min-w-[118px] rounded-[16px] bg-[#f6b800] px-5 text-sm font-bold text-black transition active:scale-[.99]">Continue</button> : <span className="px-2 text-right text-[11px] font-semibold opacity-55">Review your details, then submit below.</span>}
          </div>
        </nav>
      ) : null}

      {cancelOpen ? (
        <div className="fixed inset-0 z-[2147483500] grid place-items-end bg-black/58 p-3 backdrop-blur-[6px] sm:place-items-center" role="dialog" aria-modal="true" aria-label={`Cancel ${listingLabel} listing`}>
          <section className={`w-full max-w-md rounded-[26px] border p-5 shadow-2xl backdrop-blur-2xl ${darkMode ? "border-white/12 bg-[#0b0b0b]/92 text-white" : "border-white/70 bg-white/88 text-black"}`}>
            <p className="text-[10px] font-black uppercase tracking-[.12em] opacity-45">Listing draft</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-.035em]">Cancel {listingLabel} listing?</h2>
            <p className="mt-2 text-sm font-semibold leading-6 opacity-58">Your saved {listingLabel} draft will be cleared from this device. Nothing will be published.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setCancelOpen(false)} className={`min-h-12 rounded-[15px] border px-4 text-sm font-bold ${darkMode ? "border-white/14 bg-white/[.035]" : "border-black/10 bg-black/[.025]"}`}>Keep editing</button>
              <button type="button" onClick={confirmCancelListing} className="min-h-12 rounded-[15px] bg-[#f6b800] px-4 text-sm font-black text-black">Cancel listing</button>
            </div>
          </section>
        </div>
      ) : null}

      <style jsx global>{`
        [data-loadlink-vehicle-listing-shell] #vehicle-listing-form [class*="text-[#b88900]"],
        [data-loadlink-vehicle-listing-shell] #vehicle-listing-form [class*="text-[#f6b800]"] {
          color: inherit !important;
          opacity: .52;
        }
      `}</style>
    </>
  );
}
