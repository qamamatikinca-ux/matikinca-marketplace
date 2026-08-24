"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PRECISE_LOCATION_KEYS = [
  "loadlink-distance-enabled-v1",
  "loadlink-distance-prompt-dismissed-v1",
  "loadlink-user-coordinates",
];

function labelText(input: HTMLInputElement) {
  const label = input.closest("label");
  return `${label?.textContent || ""} ${input.name || ""} ${input.id || ""} ${input.placeholder || ""} ${input.getAttribute("aria-label") || ""}`.toLowerCase();
}

function correctInputMode(input: HTMLInputElement) {
  if (["date", "datetime-local", "time", "month", "week", "file", "checkbox", "radio", "range"].includes(input.type)) return;
  const text = labelText(input);
  if (input.type === "email" || /\bemail\b/.test(text)) {
    input.inputMode = "email";
    return;
  }
  if (input.type === "tel" || /phone|telephone|whatsapp|contact number|cell number/.test(text)) {
    input.inputMode = "tel";
    if (input.type === "number") input.type = "tel";
    return;
  }
  if (/price|rate|amount|year|mileage|kilomet|quantity|seats|photos|weight|tonnage|capacity/.test(text)) {
    input.inputMode = /price|rate|amount|weight|tonnage|capacity/.test(text) ? "decimal" : "numeric";
    return;
  }
  if (input.type === "number") return;
  input.inputMode = "text";
}

function quickLinkFallback(href: string) {
  const value = href.toLowerCase();
  if (value.includes("contract")) return "/images/find-contracts.jpg";
  if (value.includes("job")) return "/images/find-jobs.jpg";
  if (value.includes("driver")) return "/images/driver-profile-hero.jpg";
  if (value.includes("vehicle") || value.includes("truck") || value.includes("unit")) return "/images/jobs/jobs-hero-fleet.jpg";
  return "/images/jobs-1.jpg";
}

function repairImages() {
  document.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    if (image.dataset.loadlinkFallbackBound === "true") return;
    const link = image.closest<HTMLAnchorElement>("a[href]");
    if (!link) return;
    const href = link.getAttribute("href") || "";
    if (!/job|contract|vehicle|truck|unit|driver|quick/i.test(href + " " + (image.alt || ""))) return;
    image.dataset.loadlinkFallbackBound = "true";
    image.addEventListener("error", () => {
      const fallback = quickLinkFallback(href);
      if (image.getAttribute("src") !== fallback) image.src = fallback;
    });
  });
}

function removePreciseLocationUi() {
  try {
    PRECISE_LOCATION_KEYS.forEach((key) => localStorage.removeItem(key));
    sessionStorage.removeItem("loadlink-distance-user-point-v1");
  } catch {}
  document.querySelectorAll<HTMLElement>(
    '[data-loadlink-distance-control="true"],[data-loadlink-distance-badge="true"],[data-loadlink-location-upgrade="20260823"],[data-loadlink-location-completion-host="true"]',
  ).forEach((node) => node.remove());
}

function repairVehicleListingCopy(pathname: string) {
  if (!pathname.startsWith("/list-your-vehicle")) return;
  const inListing = new URL(window.location.href).searchParams.has("entry");
  if (!inListing) return;
  document.querySelectorAll<HTMLElement>("h1,h2,h3,p,span,label,button,a").forEach((node) => {
    const ownText = Array.from(node.childNodes).filter((child) => child.nodeType === Node.TEXT_NODE).map((child) => child.textContent || "").join(" ").replace(/\s+/g, " ").trim();
    if (/^available vehicles(?:\s*&\s*units)?$/i.test(ownText) || /^units$/i.test(ownText)) node.style.display = "none";
  });
}

function repairMobileControls() {
  document.querySelectorAll<HTMLInputElement>("input").forEach(correctInputMode);
  document.querySelectorAll<HTMLInputElement>('input[type="date"],input[type="datetime-local"],input[type="time"]').forEach((input) => {
    input.style.minHeight = "48px";
    input.style.scrollMarginBottom = "180px";
    if (input.dataset.loadlinkDateFocusBound === "true") return;
    input.dataset.loadlinkDateFocusBound = "true";
    input.addEventListener("focus", () => window.setTimeout(() => input.scrollIntoView({ block: "center", behavior: "smooth" }), 120));
  });
}

function repairAll(pathname: string) {
  removePreciseLocationUi();
  repairMobileControls();
  repairImages();
  repairVehicleListingCopy(pathname);
}

const FINAL_CSS = `
/* Call screen: compact, modern, mobile-first. These rules intentionally override older release CSS. */
body [data-loadlink-call-active="true"] {
  background: radial-gradient(circle at 50% 16%, rgba(246,184,0,.055), transparent 25%), #050505 !important;
  overflow: hidden !important;
}
body [data-loadlink-call-active="true"] > section {
  width: min(100%, 430px) !important;
  max-width: 430px !important;
  min-height: 100dvh !important;
  gap: 0 !important;
  padding: max(14px, env(safe-area-inset-top)) 20px max(18px, env(safe-area-inset-bottom)) !important;
}
body [data-loadlink-call-active="true"] > section > div:first-child {
  min-height: 42px !important;
  align-items: center !important;
}
body [data-loadlink-call-active="true"] > section > div:first-child > p {
  font-size: 9px !important;
  letter-spacing: .14em !important;
  opacity: .42 !important;
}
body [data-loadlink-call-active="true"] > section > div:first-child > button {
  width: 42px !important;
  height: 42px !important;
  min-height: 42px !important;
  padding: 0 !important;
  border-radius: 999px !important;
  font-size: 0 !important;
  border: 1px solid rgba(255,255,255,.1) !important;
  background: rgba(255,255,255,.045) !important;
  color: white !important;
}
body [data-loadlink-call-active="true"] > section > div:first-child > button::before {
  content: "‹";
  display: block;
  font-size: 30px;
  line-height: 36px;
  font-weight: 400;
  transform: translateY(-1px);
}
body [data-loadlink-call-active="true"] section > div[class*="flex-1"] {
  min-height: 0 !important;
  margin: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: clamp(22px, 5vh, 42px) 0 18px !important;
  justify-content: center !important;
}
body [data-loadlink-call-active="true"] [data-loadlink-call-avatar="true"] {
  width: clamp(92px, 25vw, 108px) !important;
  height: clamp(92px, 25vw, 108px) !important;
  border-radius: 999px !important;
  border-width: 1px !important;
  border-color: rgba(246,184,0,.34) !important;
  box-shadow: 0 18px 54px rgba(0,0,0,.32), 0 0 0 5px rgba(246,184,0,.035) !important;
}
body [data-loadlink-call-active="true"] h2 {
  margin-top: 20px !important;
  font-size: clamp(27px, 8vw, 32px) !important;
  line-height: 1.05 !important;
  letter-spacing: -.045em !important;
}
body [data-loadlink-call-active="true"] section > div[class*="flex-1"] > p:nth-of-type(1) {
  margin-top: 8px !important;
  font-size: 12px !important;
}
body [data-loadlink-call-active="true"] section > div[class*="flex-1"] > p:nth-of-type(2) {
  margin-top: 14px !important;
  font-size: 27px !important;
  line-height: 1 !important;
  letter-spacing: -.035em !important;
}
body [data-loadlink-call-active="true"] section > div[class*="flex-1"] > p:nth-of-type(3) {
  margin-top: 7px !important;
  font-size: 9px !important;
  opacity: .34 !important;
}
body [data-loadlink-call-active="true"] .grid.grid-cols-3 {
  width: 100% !important;
  max-width: 300px !important;
  margin: 0 auto !important;
  gap: 20px !important;
  padding: 0 !important;
}
body [data-loadlink-call-active="true"] .grid.grid-cols-3 > button {
  width: 72px !important;
  height: 72px !important;
  min-height: 72px !important;
  justify-self: center !important;
  gap: 5px !important;
  border-radius: 999px !important;
  padding: 0 !important;
  font-size: 9px !important;
  border: 1px solid rgba(255,255,255,.11) !important;
  background: rgba(255,255,255,.055) !important;
  box-shadow: none !important;
  backdrop-filter: blur(16px) !important;
}
body [data-loadlink-call-active="true"] .grid.grid-cols-3 > button[class*="f6b800"] {
  border-color: rgba(246,184,0,.46) !important;
  background: rgba(246,184,0,.1) !important;
  color: #f6b800 !important;
}
body [data-loadlink-call-active="true"] > section > button:last-child {
  width: 62px !important;
  height: 62px !important;
  min-height: 62px !important;
  margin: 18px auto 0 !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 999px !important;
  background: #e64646 !important;
  box-shadow: 0 12px 32px rgba(230,70,70,.24) !important;
  font-size: 0 !important;
}
body [data-loadlink-call-active="true"] > section > button:last-child svg {
  width: 23px !important;
  height: 23px !important;
  transform: rotate(135deg) !important;
}
body [data-loadlink-call-incoming="true"], body [data-loadlink-call-chooser="true"] {
  padding: 14px !important;
  backdrop-filter: blur(24px) !important;
}
body [data-loadlink-call-incoming="true"] section, body [data-loadlink-call-chooser="true"] section {
  border-radius: 26px !important;
  background: rgba(14,14,14,.96) !important;
  border-color: rgba(255,255,255,.1) !important;
  box-shadow: 0 28px 90px rgba(0,0,0,.46) !important;
}
body [data-loadlink-call-minimized="true"] {
  border-radius: 18px !important;
  box-shadow: 0 14px 40px rgba(0,0,0,.22) !important;
}

/* Contracts: keep the Jobs visual language, remove hard-white controls in dark mode. */
html[data-loadlink-theme="dark"] [data-loadlink-contracts-marketplace] [data-loadlink-contracts-search-shell] input,
html[data-loadlink-theme="dark"] [data-loadlink-contracts-marketplace] [data-loadlink-contracts-search-shell] select {
  background: rgba(255,255,255,.06) !important;
  color: #fff !important;
  border-color: rgba(255,255,255,.13) !important;
}
html[data-loadlink-theme="dark"] [data-loadlink-contracts-marketplace] [data-loadlink-contracts-search-shell] input::placeholder { color: rgba(255,255,255,.35) !important; }
[data-loadlink-contracts-marketplace] [data-loadlink-contracts-search-shell] { box-shadow: 0 18px 48px rgba(0,0,0,.16) !important; }

/* Vehicle listing: deliberate mobile steps and safe form controls. */
[data-loadlink-vehicle-listing-shell] input,
[data-loadlink-vehicle-listing-shell] select,
[data-loadlink-vehicle-listing-shell] textarea { font-size: 16px !important; }
[data-loadlink-vehicle-listing-shell] input[type="date"],
[data-loadlink-vehicle-listing-shell] input[type="datetime-local"],
[data-loadlink-vehicle-listing-shell] input[type="time"] { min-height: 50px !important; max-width: 100% !important; }
[data-loadlink-vehicle-listing-shell] form { padding-bottom: max(110px, calc(env(safe-area-inset-bottom) + 86px)) !important; }

/* Dealer workspace/showroom: reduce nested-card clutter while keeping the real data/tools. */
[data-loadlink-dealer-analytics="modern"] { gap: 12px !important; }
[data-loadlink-dealer-analytics="modern"] > section.grid { gap: 8px !important; }
[data-loadlink-dealer-analytics="modern"] article { box-shadow: none !important; }

/* Plan guide: one recommendation remains the visual focus. */
section[aria-label="Plan Guide"] > article { max-width: 980px !important; margin-inline: auto !important; box-shadow: none !important; }
section[aria-label="Plan Guide"] button { -webkit-tap-highlight-color: transparent; }

/* Never surface precise-location additions while the feature is paused. */
[data-loadlink-distance-control="true"],
[data-loadlink-distance-badge="true"],
[data-loadlink-location-upgrade="20260823"],
[data-loadlink-location-completion-host="true"],
iframe[title*="exact location" i] { display: none !important; }

@media (max-width: 640px) {
  body [data-loadlink-call-active="true"] > section { padding-inline: 18px !important; }
  body [data-loadlink-call-active="true"] section > div[class*="flex-1"] { padding-top: 18px !important; padding-bottom: 14px !important; }
  body [data-loadlink-call-active="true"] .grid.grid-cols-3 { gap: 14px !important; max-width: 278px !important; }
  body [data-loadlink-call-active="true"] .grid.grid-cols-3 > button { width: 68px !important; height: 68px !important; min-height: 68px !important; }
  body [data-loadlink-call-active="true"] > section > button:last-child { margin-top: 15px !important; }
}
`;

export default function LoadLinkFinalMarketplacePolish20260824() {
  const pathname = usePathname();

  useEffect(() => {
    let timer = 0;
    const run = () => repairAll(pathname);
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(run, 90);
    };
    run();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [pathname]);

  return <style>{FINAL_CSS}</style>;
}
