"use client";

import { useEffect } from "react";

const numericHints = /(?:amount|price|quantity|qty|year|mileage|odometer|payload|capacity|weight|tonnage|distance|kilomet|km|days|hours|minutes|seats|units|credit|rate|budget)/i;
const phoneHints = /(?:phone|mobile|whatsapp|contact.number|cell)/i;

function configureInput(input: HTMLInputElement) {
  const descriptor = `${input.name} ${input.id} ${input.placeholder} ${input.getAttribute("aria-label") || ""}`;
  if (input.type === "tel" || phoneHints.test(descriptor)) {
    input.inputMode = "tel";
    input.autocomplete ||= "tel";
  } else if (input.type === "number") {
    const decimal = String(input.step || "").includes(".") || /(?:amount|price|rate|budget)/i.test(descriptor);
    input.inputMode = decimal ? "decimal" : "numeric";
    if (!decimal) input.pattern = "[0-9]*";
  } else if (numericHints.test(descriptor) && !/search|reference|registration|model|code/i.test(descriptor)) {
    input.inputMode = /(?:amount|price|rate|budget|weight|tonnage|distance)/i.test(descriptor) ? "decimal" : "numeric";
  }
  if (["date", "datetime-local", "time", "month"].includes(input.type)) input.dataset.loadlinkCalendarControl = "true";
}

function configureDocument() { document.querySelectorAll<HTMLInputElement>("input").forEach(configureInput); }
function isTopNavigationTarget(target: Element | null) { return Boolean(target?.closest('[data-loadlink-home-portal-card], [data-loadlink-quick-link], [data-loadlink-scroll-top="true"]')); }

export default function LoadLinkMajorUpdate20260823() {
  useEffect(() => {
    configureDocument();
    const observer = new MutationObserver(configureDocument);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      const button = target.closest<HTMLButtonElement>("button");
      const href = anchor?.getAttribute("href") || "";
      const label = (button?.textContent || anchor?.textContent || "").replace(/\s+/g, " ").trim();

      // Old contract links are migrated to the dedicated business-contract wizard.
      if (href && /\/jobs\/list\?(?:[^#]*)(?:mode|type)=contract/i.test(href)) {
        event.preventDefault();
        event.stopPropagation();
        window.location.assign("/contracts/post");
        return;
      }

      // Active Dealer cards open the intentional two-choice management page.
      if (window.location.pathname === "/packages" && /^Manage Dealer$/i.test(label)) {
        event.preventDefault();
        event.stopPropagation();
        window.location.assign("/packages/manage");
        return;
      }

      // Public showroom follow actions update all status consumers, including homepage/chat.
      if (window.location.pathname.startsWith("/dealership/") && button && /^(Follow|Following)$/i.test(label)) {
        [180, 650, 1400].forEach((delay) => window.setTimeout(() => {
          window.dispatchEvent(new Event("loadlink-dealership-follow-changed"));
          window.dispatchEvent(new Event("loadlink-account-state-changed"));
        }, delay));
      }

      if (!isTopNavigationTarget(target)) return;
      try { sessionStorage.setItem("loadlink-scroll-next-page-top", "1"); } catch {}
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };

    const restoreTop = () => {
      let should = false;
      try { should = sessionStorage.getItem("loadlink-scroll-next-page-top") === "1"; if (should) sessionStorage.removeItem("loadlink-scroll-next-page-top"); } catch {}
      if (!should) return;
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
      window.setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }), 120);
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("pageshow", restoreTop);
    return () => { observer.disconnect(); document.removeEventListener("click", onClick, true); window.removeEventListener("pageshow", restoreTop); };
  }, []);
  return null;
}
