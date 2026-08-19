"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const STYLE_ID = "loadlink-universal-ui-guard-style";
const INTEGER_TERMS = /(?:year|age|quantity|qty|count|number of|fleet|seats|capacity|mileage|odometer|kilomet|postal|otp|pin|code)/i;
const PHONE_TERMS = /(?:phone|mobile|whatsapp|contact number|telephone)/i;
const DECIMAL_TERMS = /(?:price|rate|amount|budget|cost|weight|distance|ton|litre|liter|km)/i;

function descriptor(input: HTMLInputElement) {
  const label = input.labels?.[0]?.textContent || "";
  return `${input.name} ${input.id} ${input.placeholder} ${input.getAttribute("aria-label") || ""} ${label}`;
}

function fixNumericInput(input: HTMLInputElement) {
  if (["date", "time", "datetime-local", "file"].includes(input.type)) return;
  const key = descriptor(input);
  if (PHONE_TERMS.test(key)) {
    if (input.type === "text") input.type = "tel";
    input.inputMode = "tel";
    input.autocomplete = input.autocomplete || "tel";
    return;
  }
  if (INTEGER_TERMS.test(key)) {
    input.inputMode = "numeric";
    if (!input.pattern) input.pattern = "[0-9]*";
    return;
  }
  if (DECIMAL_TERMS.test(key)) input.inputMode = "decimal";
}

function hideDeliveryBadges(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[aria-label="Seen"], [aria-label="Sent"]').forEach((node) => {
    node.style.setProperty("display", "none", "important");
    node.setAttribute("aria-hidden", "true");
  });

  root.querySelectorAll<HTMLElement>("button, span, div").forEach((node) => {
    if (node.children.length) return;
    const text = (node.textContent || "").trim().toLowerCase();
    if (/^(?:seen|sent)(?:\s*[✓✔]+)?$/.test(text)) {
      node.style.setProperty("display", "none", "important");
      node.setAttribute("aria-hidden", "true");
    }
  });
}

function removeLegacySliderControls(root: ParentNode) {
  root
    .querySelectorAll<HTMLElement>('[data-loadlink-universal-slider-controls="true"], #loadlink-promoted-carousel-controls')
    .forEach((node) => node.remove());
}

function polishSliders(root: ParentNode) {
  let changed = false;
  removeLegacySliderControls(root);

  root
    .querySelectorAll<HTMLElement>('[data-loadlink-swipe-dots="true"], #loadlink-promoted-carousel, [data-loadlink-product-slider="true"]')
    .forEach((rail) => {
      rail.dataset.loadlinkUniversalSlider = "true";
      if (rail.getAttribute("data-loadlink-swipe-dots") !== "true") {
        rail.setAttribute("data-loadlink-swipe-dots", "true");
        changed = true;
      }
      rail.style.scrollSnapType = "x mandatory";
      rail.style.scrollBehavior = "smooth";
      rail.style.overscrollBehaviorX = "contain";
      rail.style.setProperty("-webkit-overflow-scrolling", "touch");
      Array.from(rail.children).forEach((child) => {
        const card = child as HTMLElement;
        card.style.scrollSnapAlign = "start";
        card.style.scrollSnapStop = "always";
      });
    });

  return changed;
}

function ensureSinglePageNavigation(pathname: string) {
  if (pathname !== "/jobs") return;
  const section = document.getElementById("matching-jobs");
  if (!section || section.querySelector('[data-loadlink-pagination="true"]') || section.querySelector('[data-loadlink-single-page="true"]')) return;
  const cards = section.querySelectorAll('article[id^="job-"]');
  if (!cards.length) return;
  const nav = document.createElement("nav");
  nav.dataset.loadlinkSinglePage = "true";
  nav.setAttribute("aria-label", "Listing pages");
  nav.className = "mt-7 flex flex-col items-center gap-2";
  nav.innerHTML = '<div class="flex items-center rounded-2xl border border-current/10 bg-current/[.025] p-2"><span class="flex h-10 min-w-10 items-center justify-center rounded-xl border border-[#f6b800] bg-[#f6b800] px-3 text-xs font-black text-black">1</span></div><p class="text-[10px] font-bold opacity-35">Page 1 of 1</p>';
  section.appendChild(nav);
}

export default function LoadLinkUniversalUiGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
        button[aria-label="Close account menu"] {
          background: rgba(0,0,0,.34) !important;
          -webkit-backdrop-filter: blur(15px) saturate(112%) !important;
          backdrop-filter: blur(15px) saturate(112%) !important;
        }
        button[aria-label="Close More"] {
          background: rgba(0,0,0,.46) !important;
          -webkit-backdrop-filter: blur(12px) saturate(110%) !important;
          backdrop-filter: blur(12px) saturate(110%) !important;
        }
        [data-loadlink-universal-slider="true"] { scrollbar-width: none; }
        [data-loadlink-universal-slider="true"]::-webkit-scrollbar { display:none; }
        [data-loadlink-universal-slider-controls="true"], #loadlink-promoted-carousel-controls { display:none !important; }
        @media (max-width: 639px) {
          [data-loadlink-universal-slider="true"] { padding-right: 9vw !important; }
          [data-loadlink-universal-slider="true"] > * { max-width: 84vw; }
        }
        input, select, textarea, button { max-width: 100%; }
        img { max-width: 100%; }
        [role="dialog"], [aria-modal="true"] { overscroll-behavior: contain; }
      `;
      document.head.appendChild(style);
    }

    const scan = (root: ParentNode = document) => {
      root.querySelectorAll<HTMLInputElement>("input").forEach(fixNumericInput);
      hideDeliveryBadges(root);
      const sliderChanged = polishSliders(root);
      ensureSinglePageNavigation(pathname);
      if (sliderChanged) window.dispatchEvent(new Event("loadlink:content-updated"));
    };

    scan();
    const timers = [160, 500, 1200, 2400].map((delay) => window.setTimeout(() => scan(), delay));
    const observer = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches("input")) fixNumericInput(node as HTMLInputElement);
        scan(node);
      }));
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [pathname]);

  return null;
}
