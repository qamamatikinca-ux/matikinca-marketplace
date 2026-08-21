"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SearchScope = "all" | "job" | "contract" | "asset" | "driver" | "dealer";
type Preset = { title: string; subtitle: string; value: string };

const PRESETS: Record<SearchScope, Preset[]> = {
  all: [
    { title: "Transport jobs", subtitle: "Current loads and logistics work", value: "transport jobs" },
    { title: "Transport contracts", subtitle: "Longer-term and recurring logistics work", value: "transport contracts" },
    { title: "Vehicles and mobile units", subtitle: "Trucks, trailers, mobile fridges and specialist units", value: "vehicles mobile units" },
    { title: "Drivers", subtitle: "Approved LoadLink driver profiles", value: "drivers" },
  ],
  job: [
    { title: "Refrigerated transport work", subtitle: "Jobs suited to mobile fridges, reefers and cold-chain units", value: "refrigerated transport" },
    { title: "Side tipper work", subtitle: "Bulk haulage, mining and aggregate loads", value: "side tipper" },
    { title: "Tautliner work", subtitle: "Curtainside and general freight jobs", value: "tautliner" },
    { title: "Flatbed work", subtitle: "Open-deck, machinery and abnormal-load opportunities", value: "flatbed" },
    { title: "Tanker work", subtitle: "Liquid, fuel and specialist tanker work", value: "tanker" },
    { title: "Local delivery work", subtitle: "Metro and short-distance transport opportunities", value: "local delivery" },
    { title: "Long-haul work", subtitle: "Intercity and cross-province transport jobs", value: "long haul" },
  ],
  contract: [
    { title: "Cold-chain contracts", subtitle: "Recurring refrigerated and temperature-controlled work", value: "cold chain refrigerated" },
    { title: "Bulk haulage contracts", subtitle: "Mining, aggregate and side-tipper contracts", value: "bulk haulage side tipper" },
    { title: "General freight contracts", subtitle: "Tautliner, box-body and palletised freight", value: "general freight" },
    { title: "Dedicated fleet contracts", subtitle: "Ongoing work for committed vehicles or units", value: "dedicated fleet" },
    { title: "Last-mile contracts", subtitle: "Local distribution and recurring delivery work", value: "last mile delivery" },
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

function normaliseScope(value: string | null): SearchScope {
  return (["job", "contract", "asset", "driver", "dealer"] as SearchScope[]).includes(value as SearchScope)
    ? (value as SearchScope)
    : "all";
}

function currentPath() {
  return window.location.pathname.replace(/\/$/, "") || "/";
}

function scopeForPage(): SearchScope | null {
  const path = currentPath();
  const params = new URLSearchParams(window.location.search);
  if (path === "/contracts") return "contract";
  if (path === "/jobs") return params.get("portal") === "contract" ? "contract" : params.get("portal") === "asset" ? "asset" : "job";
  if (path === "/search") return normaliseScope(params.get("category"));
  return null;
}

function primarySearchInput(): HTMLInputElement | null {
  const path = currentPath();
  if (path === "/search") {
    const form = document.querySelector<HTMLFormElement>('main[data-loadlink-search-page="true"] form');
    return form?.querySelector<HTMLInputElement>('input:not([aria-label*="location" i])') || null;
  }
  if (path === "/jobs" || path === "/contracts") {
    const shell = document.querySelector<HTMLElement>("[data-loadlink-jobs-search-shell]");
    const inputs = Array.from(shell?.querySelectorAll<HTMLInputElement>("input") || []);
    return inputs.find((input) => !/location|city|town|province/i.test(`${input.placeholder} ${input.getAttribute("aria-label") || ""}`)) || null;
  }
  return null;
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function liveTheme() {
  const root = document.documentElement;
  return root.classList.contains("dark") || root.dataset.loadlinkTheme === "dark" ? "dark" : "light";
}

function nearestCompactSurface(node: Element) {
  return node.closest<HTMLElement>('[role="alert"],article,section,div[class*="rounded"],div[class*="border"]');
}

function listingIdFromHref(href: string) {
  const match = href.match(/\/listing\/([0-9a-f-]{36})/i);
  return match?.[1] || "";
}

function ensureVehicleReviewHosts() {
  document.querySelectorAll<HTMLAnchorElement>('#vehicle-marketplace a[href*="/listing/"]').forEach((card) => {
    const id = listingIdFromHref(card.getAttribute("href") || "");
    if (!id) return;
    let host = Array.from(card.children).find((child) => (child as HTMLElement).dataset?.llAccountReviewHost === "true") as HTMLElement | undefined;
    if (!host) {
      host = document.createElement("div");
      host.dataset.llAccountReviewHost = "true";
      card.appendChild(host);
    }
    host.dataset.llAccountKind = "listing";
    host.dataset.llAccountId = id;
    host.dataset.llAccountCompact = "false";
  });
}

function ensurePageLimitNote() {
  const path = currentPath();
  let host: HTMLElement | null = null;
  let text = "";

  if (path === "/search") {
    host = document.querySelector<HTMLElement>('[data-loadlink-search-results="true"]');
    text = "7 results per page";
  } else if (path === "/jobs" || path === "/contracts") {
    const headings = Array.from(document.querySelectorAll<HTMLElement>("h2,h3"));
    const heading = headings.find((node) => /available (jobs|contracts|vehicles|listings)|results/i.test((node.textContent || "").trim()));
    host = heading?.parentElement || null;
    text = "7 posts per page";
  } else if (path === "/list-your-vehicle" || path === "/list-your-truck") {
    const heading = document.querySelector<HTMLElement>("#vehicle-marketplace h2");
    host = heading?.parentElement || null;
    text = "7 posts per page";
  }

  if (!host || !text) return;
  let note = host.querySelector<HTMLElement>(':scope > [data-ll-page-limit-note="true"]');
  if (!note) {
    note = document.createElement("span");
    note.dataset.llPageLimitNote = "true";
    note.className = "ll-release-page-limit";
    host.appendChild(note);
  }
  note.textContent = text;
}

function markLiveSurfaces() {
  const theme = liveTheme();
  document.documentElement.dataset.llFinalTheme = theme;
  document.body.dataset.llFinalTheme = theme;

  ensurePageLimitNote();
  ensureVehicleReviewHosts();

  document.querySelectorAll<HTMLElement>('[data-loadlink-analytics-modal="true"]').forEach((node) => {
    node.dataset.llFinalAnalytics = "true";
  });
  document.querySelectorAll<HTMLElement>("h1,h2,h3").forEach((heading) => {
    if ((heading.textContent || "").trim().toLowerCase() !== "listing analytics") return;
    const surface = heading.closest<HTMLElement>('[role="dialog"],section,div[class*="fixed"] > section');
    if (surface) surface.dataset.llFinalAnalytics = "true";
  });

  document.querySelectorAll<HTMLElement>('[data-loadlink-chat-quote="true"],.loadlink-chat-thread blockquote').forEach((node) => {
    node.dataset.llFinalQuote = "true";
  });

  document.querySelectorAll<HTMLElement>("h1,h2,h3,p,strong,span").forEach((node) => {
    const value = (node.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (!value || value.length > 180) return;
    if (!/(listing|post)/.test(value)) return;
    if (!/(inactive|not active|pending approval|awaiting approval|under review|rejected|deleted)/.test(value)) return;
    const surface = nearestCompactSurface(node);
    if (surface) surface.dataset.llFinalInactive = "true";
  });

  document.querySelectorAll<HTMLElement>('article[id^="job-"],article[data-listing-card],.loadlink-search-result-card,[data-post-card],#vehicle-marketplace a[href*="/listing/"]').forEach((card) => {
    card.dataset.llFinalPostCard = "true";
  });

  document.querySelectorAll<HTMLElement>('div[class*="z-[2147483300]"][class*="fixed"][class*="inset-0"]').forEach((node) => {
    node.dataset.llCallSurface = "true";
  });

  document.querySelectorAll<HTMLElement>('[data-loadlink-toast-center="true"] > section').forEach((node) => {
    node.dataset.llToastCard = "true";
  });
}

export default function LoadLinkReleaseRecovery20260821() {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<SearchScope>("all");
  const [selected, setSelected] = useState("");
  const [filter, setFilter] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const allowNativeFocusRef = useRef(false);

  const options = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return PRESETS[scope];
    return PRESETS[scope].filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(query));
  }, [filter, scope]);

  useEffect(() => {
    let frame = 0;
    const scan = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(markLiveSurfaces);
    };
    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-loadlink-theme"] });
    const timer = window.setInterval(scan, 1000);
    window.addEventListener("loadlink-theme-changed", scan as EventListener);
    window.addEventListener("loadlink-theme-change", scan as EventListener);
    window.addEventListener("popstate", scan);
    window.addEventListener("hashchange", scan);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
      observer.disconnect();
      window.removeEventListener("loadlink-theme-changed", scan as EventListener);
      window.removeEventListener("loadlink-theme-change", scan as EventListener);
      window.removeEventListener("popstate", scan);
      window.removeEventListener("hashchange", scan);
    };
  }, []);

  useEffect(() => {
    const onFocusCapture = (event: FocusEvent) => {
      const target = event.target as HTMLInputElement | null;
      if (!target) return;
      const searchInput = primarySearchInput();
      if (!searchInput || target !== searchInput) return;

      inputRef.current = searchInput;
      const pageScope = scopeForPage();
      if (!pageScope) return;

      if (allowNativeFocusRef.current) {
        allowNativeFocusRef.current = false;
        return;
      }

      setScope(pageScope);
      setSelected(searchInput.value || "");
      setFilter("");
      setOpen(true);
    };

    document.addEventListener("focus", onFocusCapture, true);
    return () => document.removeEventListener("focus", onFocusCapture, true);
  }, []);

  function typeMyOwn() {
    const input = inputRef.current || primarySearchInput();
    setOpen(false);
    allowNativeFocusRef.current = true;
    window.setTimeout(() => {
      input?.focus({ preventScroll: true });
      if (input) input.setSelectionRange(input.value.length, input.value.length);
    }, 45);
  }

  function apply() {
    const input = inputRef.current || primarySearchInput();
    if (!input) {
      setOpen(false);
      return;
    }
    setNativeInputValue(input, selected.trim());
    setOpen(false);

    window.setTimeout(() => {
      const form = input.closest("form");
      if (form) {
        form.requestSubmit();
        return;
      }
      const shell = input.closest<HTMLElement>("[data-loadlink-jobs-search-shell]");
      const button = Array.from(shell?.querySelectorAll<HTMLButtonElement>("button") || []).find((candidate) => /search/i.test(candidate.textContent || ""));
      button?.click();
    }, 55);
  }

  const scopeLabel = scope === "job" ? "Jobs" : scope === "contract" ? "Contracts" : scope === "asset" ? "Vehicles & units" : scope === "driver" ? "Drivers" : scope === "dealer" ? "Dealerships" : "LoadLink";

  if (!open) return null;

  return (
    <div className="ll-recovery-search-sheet" role="dialog" aria-modal="true" aria-label={`Search ${scopeLabel}`}>
      <button type="button" className="ll-recovery-search-backdrop" aria-label="Close search options" onClick={() => setOpen(false)} />
      <section className="ll-recovery-search-panel">
        <header className="ll-recovery-search-header">
          <button type="button" aria-label="Close" onClick={() => setOpen(false)}>‹</button>
          <div><strong>What do you need?</strong><span>{scopeLabel} · choose a useful starting point or type your own</span></div>
        </header>

        <label className="ll-recovery-search-filter">
          <span>⌕</span>
          <input autoFocus value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter these options" />
        </label>

        <div className="ll-recovery-search-options">
          <button type="button" className={selected === "" ? "is-selected" : ""} onClick={() => setSelected("")}>
            <i /><span><strong>Any {scopeLabel.toLowerCase()}</strong><small>Show everything in this section</small></span><b>›</b>
          </button>
          {options.map((item) => (
            <button key={item.value} type="button" className={selected === item.value ? "is-selected" : ""} onClick={() => setSelected(item.value)}>
              <i /><span><strong>{item.title}</strong><small>{item.subtitle}</small></span><b>›</b>
            </button>
          ))}
          {!options.length ? <p>No preset matches that filter. Use “Type my own” below.</p> : null}
        </div>

        <footer className="ll-recovery-search-footer">
          <button type="button" onClick={() => { setSelected(""); setFilter(""); }}>Reset</button>
          <button type="button" onClick={typeMyOwn}>Type my own</button>
          <button type="button" className="is-primary" onClick={apply}>Apply</button>
        </footer>
      </section>
    </div>
  );
}
