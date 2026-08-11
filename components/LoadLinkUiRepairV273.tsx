"use client";

import { useEffect } from "react";

function currentTheme() {
  const explicit = document.documentElement.dataset.loadlinkTheme;
  if (explicit === "dark" || explicit === "light") return explicit;
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function normalizeCurrentContractRoute() {
  if (window.location.pathname !== "/jobs/list") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("mode") !== "contract" || params.get("type") === "contract") return false;
  params.delete("mode");
  params.set("type", "contract");
  window.location.replace(`/jobs/list?${params.toString()}`);
  return true;
}

function centerHeaderLogos() {
  document.querySelectorAll<HTMLElement>('header a[aria-label="Go to LoadLink homepage"]').forEach((anchor) => {
    const header = anchor.closest<HTMLElement>("header");
    if (!header) return;

    const parent = anchor.parentElement as HTMLElement | null;
    const target = parent && parent.closest("header") === header && getComputedStyle(parent).position === "absolute" ? parent : anchor;

    if (getComputedStyle(header).position === "static") header.style.position = "relative";
    target.style.position = "absolute";
    target.style.left = "50%";
    target.style.top = "50%";
    target.style.right = "auto";
    target.style.marginLeft = "0";
    target.style.marginRight = "0";
    target.style.transform = "translate(-50%, -50%)";
    target.style.zIndex = "8";
  });
}

function syncStandaloneLogos() {
  const dark = currentTheme() === "dark";
  const src = dark ? "/images/loadlink-logo-dark.png?v=v273-theme" : "/images/loadlink-logo-light.png?v=v273-theme";

  document.querySelectorAll<HTMLImageElement>('.loadlink-quote-card img[alt="LoadLink"]').forEach((image) => {
    if (image.getAttribute("src") !== src) image.setAttribute("src", src);
  });
}

function repairContractLinks() {
  document.querySelectorAll<HTMLAnchorElement>('a[href*="/jobs/list?mode=contract"]').forEach((link) => {
    link.href = link.href.replace("mode=contract", "type=contract");
  });
}

function liftLogisticsSheet() {
  const sheet = document.querySelector<HTMLElement>(".loadlink-logistics-sheet");
  if (!sheet) return;

  sheet.style.zIndex = "2147483000";
  let ancestor = sheet.parentElement;
  while (ancestor && ancestor !== document.body) {
    const computed = getComputedStyle(ancestor);
    if (computed.position !== "static" || computed.zIndex !== "auto") ancestor.style.zIndex = "2147482990";
    ancestor = ancestor.parentElement;
  }
}

function syncOverlayLock() {
  const dealerSheet = Boolean(document.querySelector('[aria-label="Close More"]'));
  const logisticsSheet = Boolean(document.querySelector(".loadlink-logistics-sheet"));
  const locked = dealerSheet || logisticsSheet;
  document.documentElement.classList.toggle("loadlink-overlay-lock", locked);
  document.body.classList.toggle("loadlink-overlay-lock", locked);
}

function repair() {
  if (normalizeCurrentContractRoute()) return;
  centerHeaderLogos();
  syncStandaloneLogos();
  repairContractLinks();
  liftLogisticsSheet();
  syncOverlayLock();
}

function ensureStyles() {
  if (document.getElementById("loadlink-v273-ui-repair")) return;
  const style = document.createElement("style");
  style.id = "loadlink-v273-ui-repair";
  style.textContent = `
html.loadlink-overlay-lock,
body.loadlink-overlay-lock {
  overflow: hidden !important;
  overscroll-behavior: none !important;
  touch-action: none;
}

.loadlink-logistics-sheet {
  z-index: 2147483000 !important;
  max-height: calc(100dvh - max(12px, env(safe-area-inset-top))) !important;
  overscroll-behavior: contain !important;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}

body:has(.loadlink-logistics-sheet) [data-loadlink-job-timing-toast="v272"] {
  visibility: hidden !important;
  pointer-events: none !important;
}

.loadlink-chat-header button[aria-label="View latest dealer update"] {
  padding: 0 !important;
  background: transparent !important;
  box-shadow: 0 0 0 3px #f6b800, 0 0 0 5px rgba(246,184,0,.16) !important;
  overflow: visible !important;
}

.loadlink-chat-header button[aria-label="View latest dealer update"] > span {
  width: 100% !important;
  height: 100% !important;
  padding: 0 !important;
  background: transparent !important;
  border-radius: 999px !important;
}

.loadlink-chat-header button[aria-label="View latest dealer update"] [aria-label$="profile picture"] {
  width: 100% !important;
  height: 100% !important;
}

[aria-label$="profile picture"] > span:has(img) {
  background: transparent !important;
}

@media (max-width: 640px) {
  .loadlink-logistics-sheet {
    border-radius: 26px 26px 0 0 !important;
    padding-bottom: env(safe-area-inset-bottom) !important;
  }
}
`;
  document.head.appendChild(style);
}

export default function LoadLinkUiRepairV273() {
  useEffect(() => {
    ensureStyles();
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        repair();
      });
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-loadlink-theme", "src", "href"],
    });

    window.addEventListener("loadlink-theme-change", schedule);
    window.addEventListener("popstate", schedule);
    window.addEventListener("pageshow", schedule);
    schedule();

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("loadlink-theme-change", schedule);
      window.removeEventListener("popstate", schedule);
      window.removeEventListener("pageshow", schedule);
      document.documentElement.classList.remove("loadlink-overlay-lock");
      document.body.classList.remove("loadlink-overlay-lock");
    };
  }, []);

  return null;
}
