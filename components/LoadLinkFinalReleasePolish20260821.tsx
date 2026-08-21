"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const SEARCH_PRESETS: Record<string, { title: string; subtitle: string; value: string }[]> = {
  job: [
    { title: "Refrigerated transport", subtitle: "Jobs for mobile fridges and temperature-controlled units", value: "refrigerated transport" },
    { title: "Side tipper work", subtitle: "Loads suited to side tippers and bulk haulage", value: "side tipper" },
    { title: "Tautliner work", subtitle: "Curtainside and general freight jobs", value: "tautliner" },
    { title: "Flatbed work", subtitle: "Open-deck and abnormal-load opportunities", value: "flatbed" },
    { title: "Tanker work", subtitle: "Liquid, fuel and specialist tanker jobs", value: "tanker" },
    { title: "Local delivery", subtitle: "Short-distance and metro transport work", value: "local delivery" },
    { title: "Long-haul work", subtitle: "Intercity and cross-province transport jobs", value: "long haul" },
  ],
  contract: [
    { title: "Cold-chain contracts", subtitle: "Temperature-controlled and refrigerated transport", value: "cold chain refrigerated" },
    { title: "Bulk haulage contracts", subtitle: "Mining, aggregate and side-tipper work", value: "bulk haulage side tipper" },
    { title: "General freight contracts", subtitle: "Tautliner, box body and palletised freight", value: "general freight" },
    { title: "Dedicated fleet contracts", subtitle: "Ongoing work for committed vehicles or units", value: "dedicated fleet" },
    { title: "Last-mile contracts", subtitle: "Local distribution and delivery opportunities", value: "last mile delivery" },
  ],
  asset: [
    { title: "Refrigerated units", subtitle: "Mobile fridges and temperature-controlled equipment", value: "refrigerated mobile unit" },
    { title: "Side tippers", subtitle: "Commercial side-tipper trucks and trailers", value: "side tipper" },
    { title: "Tautliners", subtitle: "Curtainside trucks and trailers", value: "tautliner" },
    { title: "Flatbeds", subtitle: "Open-deck trucks and trailers", value: "flatbed" },
    { title: "Tankers", subtitle: "Liquid and specialist transport equipment", value: "tanker" },
  ],
  driver: [
    { title: "Long-haul drivers", subtitle: "Drivers experienced in intercity routes", value: "long haul" },
    { title: "Refrigerated transport", subtitle: "Cold-chain and reefer experience", value: "refrigerated cold chain" },
    { title: "Dangerous goods", subtitle: "Drivers with dangerous-goods experience", value: "dangerous goods" },
    { title: "Local distribution", subtitle: "Metro and regional delivery experience", value: "local delivery" },
  ],
  dealer: [
    { title: "Truck dealerships", subtitle: "Approved commercial-vehicle dealerships", value: "truck dealership" },
    { title: "Trailer dealerships", subtitle: "Commercial trailer stock and specialists", value: "trailer dealership" },
    { title: "Mobile-unit suppliers", subtitle: "Mobile fridge, kitchen, office and specialist units", value: "mobile unit" },
  ],
};

const DEFAULT_PRESETS = [
  { title: "Transport jobs", subtitle: "Browse available logistics work", value: "transport jobs" },
  { title: "Transport contracts", subtitle: "Find longer-term logistics opportunities", value: "transport contracts" },
  { title: "Vehicles and units", subtitle: "Find trucks, trailers and mobile units", value: "vehicles mobile units" },
  { title: "Drivers", subtitle: "Find approved driver profiles", value: "drivers" },
];

function isDark() {
  const root = document.documentElement;
  return root.classList.contains("dark") || root.dataset.loadlinkTheme === "dark" || document.body?.dataset.llResolvedTheme === "dark";
}

function markPostCards() {
  const candidates = document.querySelectorAll<HTMLElement>("article, [data-listing-card], [data-post-card], .listing-card, .job-card");
  candidates.forEach((card) => {
    const text = (card.textContent || "").toLowerCase();
    if (text.length < 35) return;
    if (!/(job|contract|vehicle|truck|trailer|mobile unit|listing|posted|available)/.test(text)) return;
    card.dataset.llFinalPostCard = "true";
  });
}

function repairThemeMarkers() {
  const theme = isDark() ? "dark" : "light";
  document.documentElement.dataset.llFinalTheme = theme;
  document.body.dataset.llFinalTheme = theme;
  document.querySelectorAll<HTMLElement>("[data-ll-repair-analytics]").forEach((node) => node.dataset.llFinalAnalytics = "true");
  document.querySelectorAll<HTMLElement>("[data-ll-repair-quote]").forEach((node) => node.dataset.llFinalQuote = "true");
  document.querySelectorAll<HTMLElement>("[data-ll-repair-inactive]").forEach((node) => node.dataset.llFinalInactive = "true");
  markPostCards();
}

export default function LoadLinkFinalReleasePolish20260821() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [scope, setScope] = useState("all");
  const [selected, setSelected] = useState("");
  const [filter, setFilter] = useState("");
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardTotal, setWizardTotal] = useState(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const wizardSectionsRef = useRef<HTMLElement[]>([]);

  const options = useMemo(() => {
    const list = SEARCH_PRESETS[scope] || DEFAULT_PRESETS;
    const query = filter.trim().toLowerCase();
    if (!query) return list;
    return list.filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(query));
  }, [filter, scope]);

  useEffect(() => {
    let cancelled = false;

    const scan = () => {
      if (cancelled) return;
      repairThemeMarkers();

      const path = location.pathname;
      if (path.startsWith("/search")) {
        const params = new URLSearchParams(location.search);
        const nextScope = params.get("category") || "all";
        setScope(nextScope);
        const form = document.querySelector<HTMLFormElement>('main[data-loadlink-search-page="true"] form');
        const input = form?.querySelector<HTMLInputElement>('input:not([aria-label*="location" i])');
        if (input) {
          searchInputRef.current = input;
          input.dataset.llFinalSearchInput = "true";
          if (!input.dataset.llFinalSearchBound) {
            input.dataset.llFinalSearchBound = "true";
            input.addEventListener("focus", () => {
              setSelected(input.value || "");
              setFilter("");
              setSearchOpen(true);
            });
          }
        }
      }

      if (path === "/list-your-vehicle" || path === "/list-your-truck") {
        const form = document.querySelector<HTMLFormElement>("form#vehicle-listing-form");
        if (form) {
          form.dataset.llFinalWizard = "true";
          const sections = Array.from(form.querySelectorAll<HTMLElement>(":scope > section")).filter((section) => {
            const heading = section.querySelector("h2");
            return Boolean(heading && /identity|vehicle details|photos and verification|contact and confirmation/i.test(heading.textContent || ""));
          });
          if (sections.length) {
            wizardSectionsRef.current = sections;
            setWizardTotal(sections.length);
            setWizardStep((current) => Math.min(current, Math.max(0, sections.length - 1)));
            sections.forEach((section, index) => {
              section.dataset.llWizardSection = String(index);
              section.dataset.llWizardActive = index === wizardStep ? "true" : "false";
            });
          }
        }
      }
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-loadlink-theme"] });
    const onTheme = () => scan();
    window.addEventListener("loadlink-theme-changed", onTheme as EventListener);
    window.addEventListener("popstate", scan);
    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener("loadlink-theme-changed", onTheme as EventListener);
      window.removeEventListener("popstate", scan);
    };
  }, [wizardStep]);

  function applySearch() {
    const input = searchInputRef.current;
    if (!input) return setSearchOpen(false);
    const value = selected.trim();
    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    nativeSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    setSearchOpen(false);
    window.setTimeout(() => input.closest("form")?.requestSubmit(), 40);
  }

  function typeCustom() {
    setSearchOpen(false);
    window.setTimeout(() => searchInputRef.current?.focus({ preventScroll: true }), 50);
  }

  function goWizard(next: number) {
    const sections = wizardSectionsRef.current;
    if (!sections.length) return;
    const current = sections[wizardStep];
    if (next > wizardStep && current) {
      const invalid = Array.from(current.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input,select,textarea")).find((field) => !field.disabled && !field.checkValidity());
      if (invalid) {
        invalid.reportValidity();
        invalid.focus({ preventScroll: false });
        return;
      }
    }
    const target = Math.max(0, Math.min(next, sections.length - 1));
    setWizardStep(target);
    window.setTimeout(() => sections[target]?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  }

  const wizardTitle = wizardSectionsRef.current[wizardStep]?.querySelector("h2")?.textContent || "Listing details";

  return (
    <>
      {searchOpen ? (
        <div className="ll-final-search-sheet" role="dialog" aria-modal="true" aria-label="Choose what to search for">
          <button className="ll-final-search-backdrop" aria-label="Close search options" onClick={() => setSearchOpen(false)} />
          <section className="ll-final-search-panel">
            <header className="ll-final-search-header">
              <button type="button" className="ll-final-search-back" onClick={() => setSearchOpen(false)} aria-label="Go back">‹</button>
              <div><strong>Choose what you need</strong><span>{scope === "job" ? "Jobs" : scope === "contract" ? "Contracts" : scope === "asset" ? "Vehicles & units" : scope === "driver" ? "Drivers" : scope === "dealer" ? "Dealerships" : "LoadLink search"}</span></div>
            </header>
            <div className="ll-final-search-filter"><span>⌕</span><input autoFocus value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search options" /></div>
            <div className="ll-final-search-list">
              <button type="button" className={`ll-final-search-row ${selected === "" ? "is-selected" : ""}`} onClick={() => setSelected("")}><span className="ll-final-check" /> <span><strong>Any</strong><small>Show all matching LoadLink results</small></span></button>
              {options.map((item) => <button key={item.value} type="button" className={`ll-final-search-row ${selected === item.value ? "is-selected" : ""}`} onClick={() => setSelected(item.value)}><span className="ll-final-check" /><span><strong>{item.title}</strong><small>{item.subtitle}</small></span><b>›</b></button>)}
              {!options.length ? <p className="ll-final-search-empty">No preset matches that search. You can type your own search instead.</p> : null}
            </div>
            <footer className="ll-final-search-footer"><button type="button" onClick={() => { setSelected(""); setFilter(""); }}>Reset</button><button type="button" className="ll-final-type" onClick={typeCustom}>Type my own</button><button type="button" className="ll-final-apply" onClick={applySearch}>Apply</button></footer>
          </section>
        </div>
      ) : null}

      {wizardTotal > 1 && (location.pathname === "/list-your-vehicle" || location.pathname === "/list-your-truck") ? (
        <aside className="ll-final-wizard-dock" aria-label="Listing progress">
          <div className="ll-final-wizard-copy"><span>Step {wizardStep + 1} of {wizardTotal}</span><strong>{wizardTitle}</strong><small>Complete one section at a time. Your information stays in the form.</small></div>
          <div className="ll-final-wizard-progress">{Array.from({ length: wizardTotal }, (_, index) => <i key={index} className={index <= wizardStep ? "is-done" : ""} />)}</div>
          <div className="ll-final-wizard-actions"><button type="button" disabled={wizardStep === 0} onClick={() => goWizard(wizardStep - 1)}>Previous</button>{wizardStep < wizardTotal - 1 ? <button type="button" className="is-primary" onClick={() => goWizard(wizardStep + 1)}>Continue</button> : <button type="button" className="is-primary" onClick={() => document.querySelector<HTMLButtonElement>('form#vehicle-listing-form button[type="submit"]')?.click()}>Review & submit</button>}</div>
        </aside>
      ) : null}
    </>
  );
}
