"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { routeForScope, type SearchScope } from "@/lib/loadlinkSearch";

type Preset = { title: string; subtitle: string; value: string };

type HomeScope = Exclude<SearchScope, "page">;

const PRESETS: Record<HomeScope, Preset[]> = {
  all: [
    { title: "Transport jobs", subtitle: "Current logistics work for trucks and mobile units", value: "transport jobs" },
    { title: "Transport contracts", subtitle: "Recurring and longer-term logistics opportunities", value: "transport contracts" },
    { title: "Vehicles and mobile units", subtitle: "Commercial trucks, trailers and specialist units", value: "vehicles mobile units" },
    { title: "Approved drivers", subtitle: "Professional LoadLink driver profiles", value: "drivers" },
    { title: "Dealerships", subtitle: "Approved commercial vehicle dealerships", value: "dealerships" },
  ],
  job: [
    { title: "Refrigerated transport", subtitle: "Cold-chain, reefer and mobile-fridge work", value: "refrigerated transport" },
    { title: "Side tipper", subtitle: "Mining, aggregate and bulk haulage jobs", value: "side tipper" },
    { title: "Tautliner", subtitle: "Curtainside and general freight work", value: "tautliner" },
    { title: "Flatbed", subtitle: "Machinery, open-deck and abnormal-load work", value: "flatbed" },
    { title: "Tanker", subtitle: "Liquid, fuel and specialist tanker work", value: "tanker" },
    { title: "Local delivery", subtitle: "Metro and short-distance transport work", value: "local delivery" },
    { title: "Long haul", subtitle: "Intercity and cross-province transport work", value: "long haul" },
  ],
  contract: [
    { title: "Cold-chain contracts", subtitle: "Recurring temperature-controlled work", value: "cold chain refrigerated" },
    { title: "Bulk haulage contracts", subtitle: "Mining, aggregate and side-tipper contracts", value: "bulk haulage side tipper" },
    { title: "General freight contracts", subtitle: "Tautliner, palletised and box-body freight", value: "general freight" },
    { title: "Dedicated fleet", subtitle: "Ongoing work for committed vehicles or units", value: "dedicated fleet" },
    { title: "Last mile", subtitle: "Recurring local distribution and delivery work", value: "last mile delivery" },
  ],
  asset: [
    { title: "Refrigerated units", subtitle: "Mobile fridges and temperature-controlled equipment", value: "refrigerated mobile unit" },
    { title: "Side tippers", subtitle: "Commercial side-tipper trucks and trailers", value: "side tipper" },
    { title: "Tautliners", subtitle: "Curtainside trucks and trailers", value: "tautliner" },
    { title: "Flatbeds", subtitle: "Open-deck trucks and trailers", value: "flatbed" },
    { title: "Tankers", subtitle: "Liquid and specialist transport equipment", value: "tanker" },
  ],
  driver: [
    { title: "Long-haul drivers", subtitle: "Experienced intercity and cross-province drivers", value: "long haul" },
    { title: "Cold-chain drivers", subtitle: "Reefer and temperature-controlled experience", value: "refrigerated cold chain" },
    { title: "Dangerous goods", subtitle: "Drivers with dangerous-goods experience", value: "dangerous goods" },
    { title: "Local distribution", subtitle: "Metro and regional delivery experience", value: "local delivery" },
  ],
  dealer: [
    { title: "Truck dealerships", subtitle: "Approved commercial truck dealerships", value: "truck dealership" },
    { title: "Trailer dealerships", subtitle: "Commercial trailer stock and specialists", value: "trailer dealership" },
    { title: "Mobile-unit suppliers", subtitle: "Mobile fridge, kitchen, office and specialist units", value: "mobile unit" },
  ],
};

const SCOPES: Array<{ value: HomeScope; label: string }> = [
  { value: "all", label: "All" },
  { value: "job", label: "Jobs" },
  { value: "contract", label: "Contracts" },
  { value: "asset", label: "Vehicles" },
  { value: "driver", label: "Drivers" },
  { value: "dealer", label: "Dealerships" },
];

function scopeLabel(scope: HomeScope) {
  return SCOPES.find((item) => item.value === scope)?.label || "LoadLink";
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

export default function LoadLinkHomepageSearchChooser20260822() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<HomeScope>("all");
  const [selected, setSelected] = useState("");
  const [filter, setFilter] = useState("");
  const allowNativeFocus = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const options = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return PRESETS[scope];
    return PRESETS[scope].filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(query));
  }, [filter, scope]);

  useEffect(() => {
    if (pathname !== "/") {
      setOpen(false);
      return;
    }

    const onFocus = (event: FocusEvent) => {
      const target = event.target as HTMLInputElement | null;
      if (!target?.matches('[data-loadlink-home-search-input="true"], [data-loadlink-home-search-input]')) return;
      inputRef.current = target;
      if (allowNativeFocus.current) {
        allowNativeFocus.current = false;
        return;
      }
      setSelected(target.value || "");
      setFilter("");
      setScope("all");
      setOpen(true);
    };

    document.addEventListener("focus", onFocus, true);
    return () => document.removeEventListener("focus", onFocus, true);
  }, [pathname]);

  function typeMyOwn() {
    setOpen(false);
    allowNativeFocus.current = true;
    window.setTimeout(() => {
      const input = inputRef.current || document.querySelector<HTMLInputElement>('[data-loadlink-home-search-input]');
      input?.focus({ preventScroll: true });
      if (input) input.setSelectionRange(input.value.length, input.value.length);
    }, 45);
  }

  function search() {
    const input = inputRef.current || document.querySelector<HTMLInputElement>('[data-loadlink-home-search-input]');
    if (input) setNativeInputValue(input, selected.trim());
    const location = document.querySelector<HTMLInputElement>("#loadlink-marketplace-location")?.value || "";
    setOpen(false);
    router.push(routeForScope(scope, selected.trim(), location.trim()));
  }

  if (!open || pathname !== "/") return null;

  return (
    <div className="ll-recovery-search-sheet ll-home-search-chooser" role="dialog" aria-modal="true" aria-label="Search LoadLink">
      <button type="button" className="ll-recovery-search-backdrop" aria-label="Close search" onClick={() => setOpen(false)} />
      <section className="ll-recovery-search-panel">
        <header className="ll-recovery-search-header">
          <button type="button" aria-label="Close" onClick={() => setOpen(false)}>‹</button>
          <div><strong>Find what you need</strong><span>Search the right part of LoadLink without sorting through the wrong listings.</span></div>
        </header>

        <div className="ll-home-search-scopes" role="tablist" aria-label="Search category">
          {SCOPES.map((item) => (
            <button key={item.value} type="button" role="tab" aria-selected={scope === item.value} onClick={() => { setScope(item.value); setSelected(""); setFilter(""); }}>{item.label}</button>
          ))}
        </div>

        <label className="ll-recovery-search-filter">
          <span aria-hidden="true" />
          <input autoFocus value={filter} onChange={(event) => setFilter(event.target.value)} placeholder={`Search ${scopeLabel(scope).toLowerCase()} options`} inputMode="search" />
        </label>

        <div className="ll-recovery-search-options">
          <button type="button" className={selected === "" ? "is-selected" : ""} onClick={() => setSelected("")}>
            <i /><span><strong>Browse all {scopeLabel(scope).toLowerCase()}</strong><small>Show the full category without an extra keyword</small></span><b>›</b>
          </button>
          {options.map((item) => (
            <button key={item.value} type="button" className={selected === item.value ? "is-selected" : ""} onClick={() => setSelected(item.value)}>
              <i /><span><strong>{item.title}</strong><small>{item.subtitle}</small></span><b>›</b>
            </button>
          ))}
          {!options.length ? <p>No preset matches that search. Type your own search instead.</p> : null}
        </div>

        <footer className="ll-recovery-search-footer">
          <button type="button" onClick={typeMyOwn}>Type my own</button>
          <button type="button" className="is-primary" onClick={search}>Search</button>
        </footer>
      </section>
    </div>
  );
}
