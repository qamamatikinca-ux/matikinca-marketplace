"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const DRIVER_MEMORY_PREFIX = "loadlink-driver-setup-v2:";
const FOLLOW_UP_DISMISSED_KEY = "loadlink-smart-followups-dismissed-v1";

function normaliseText(value: string | null | undefined) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function findByText(pattern: RegExp, root: ParentNode = document) {
  return Array.from(root.querySelectorAll<HTMLElement>("h1,h2,h3,h4,p,span,strong,button,a")).filter((node) => pattern.test(normaliseText(node.textContent)));
}

function nearestCard(node: HTMLElement | null) {
  if (!node) return null;
  return node.closest<HTMLElement>("section,article,[data-loadlink-card],.rounded-\[24px\],.rounded-\[28px\],.rounded-\[32px\]") || node.parentElement;
}

function applyMessagePolish() {
  const root = document.querySelector<HTMLElement>(".loadlink-messages") || document.querySelector<HTMLElement>("[data-loadlink-messages]");
  if (!root) return;
  root.dataset.loadlinkSmartGlass = "true";
  root.querySelectorAll<HTMLImageElement>(".loadlink-chat-header img, [data-loadlink-contact-avatar] img, [data-loadlink-call-avatar] img").forEach((image) => {
    image.dataset.loadlinkRoundAvatar = "true";
  });
}

function removeDealershipTopBlocks() {
  if (!window.location.pathname.startsWith("/dealership/")) return;
  findByText(/^Showroom hours$/i).forEach((heading) => {
    const card = nearestCard(heading);
    if (card) card.dataset.loadlinkRemovedDealerIntro = "true";
  });
  findByText(/^Customer reviews$/i).forEach((heading) => {
    const card = nearestCard(heading);
    if (card) card.dataset.loadlinkRemovedDealerIntro = "true";
  });
}

function enhanceDealerPoster() {
  const dealershipEvidence = findByText(/verified dealership|dealership member|dealer account|loadlink dealership/i);
  if (!dealershipEvidence.length) return;

  document.querySelectorAll<HTMLElement>("button,a").forEach((node) => {
    const text = normaliseText(node.textContent);
    if (/^(view account reviews|write a review)$/i.test(text)) node.dataset.loadlinkDealerReviewAction = "removed";
  });

  const evidence = dealershipEvidence[0];
  const card = nearestCard(evidence);
  if (card && !card.querySelector("[data-loadlink-dealer-rating]") && !findByText(/★/, card).length) {
    const rating = document.createElement("div");
    rating.dataset.loadlinkDealerRating = "true";
    rating.setAttribute("aria-label", "Dealership rating");
    const scoreText = normaliseText(card.textContent).match(/\b([0-5](?:\.\d)?)\s*(?:\/\s*5|stars?)/i)?.[1];
    rating.innerHTML = `<span aria-hidden="true">★★★★★</span><strong>${scoreText ? `${scoreText} / 5` : "New dealership"}</strong>`;
    const actions = Array.from(card.querySelectorAll<HTMLElement>("button,a")).find((node) => !/review/i.test(normaliseText(node.textContent)));
    if (actions?.parentElement) actions.parentElement.insertBefore(rating, actions);
    else card.appendChild(rating);
  }

  const showroomLink = document.querySelector<HTMLAnchorElement>('a[href^="/dealership/"]:not([href="/dealership/"])');
  if (!showroomLink) return;
  const listingRoot = document.querySelector<HTMLElement>("main");
  if (!listingRoot || listingRoot.querySelector('[data-loadlink-view-showroom="true"]')) return;
  const posterHeading = findByText(/listed by|posted by/i, listingRoot)[0] || dealershipEvidence[0];
  const posterCard = nearestCard(posterHeading);
  if (!posterCard) return;
  const link = document.createElement("a");
  link.href = showroomLink.getAttribute("href") || showroomLink.href;
  link.dataset.loadlinkViewShowroom = "true";
  link.textContent = "View showroom";
  link.setAttribute("aria-label", "View dealership showroom");
  posterCard.appendChild(link);
}

function applyContractProgress() {
  if (!/contract/i.test(window.location.pathname)) return;
  document.documentElement.dataset.loadlinkContractGoldProgress = "true";
}

function enhancePackageGuide() {
  if (!window.location.pathname.startsWith("/packages")) return;
  const guideHeading = findByText(/Tell us how you use LoadLink/i)[0];
  const guideCard = nearestCard(guideHeading);
  if (guideCard) guideCard.dataset.loadlinkPackageGuideGlass = "true";

  if (document.querySelector('[data-loadlink-partner-cta="true"]')) return;
  const target = guideCard || document.querySelector<HTMLElement>("main");
  if (!target) return;
  const cta = document.createElement("aside");
  cta.dataset.loadlinkPartnerCta = "true";
  cta.innerHTML = `
    <div>
      <span>LOADLINK PARTNERS</span>
      <strong>Become a LoadLink partner today.</strong>
      <p>Unlock Pro or Dealer tools when they are available for your account. If a plan is not currently available, LoadLink will take you to the package options instead of leaving you at a dead end.</p>
    </div>
    <a href="/packages#plans">View packages</a>`;
  target.appendChild(cta);
}

function rememberDriverSetup() {
  if (!/^\/driver-(portal|profile)/.test(window.location.pathname)) return () => {};
  const key = `${DRIVER_MEMORY_PREFIX}${window.location.pathname}`;
  let saved: Record<string, string | boolean> = {};
  try { saved = JSON.parse(localStorage.getItem(key) || "{}"); } catch {}

  const controls = Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input,select,textarea"));
  controls.forEach((control) => {
    const type = control instanceof HTMLInputElement ? control.type : "";
    if (["password", "file", "hidden", "submit", "button"].includes(type)) return;
    const name = control.name || control.id;
    if (!name || !(name in saved) || control.value) return;
    if (control instanceof HTMLInputElement && (type === "checkbox" || type === "radio")) {
      control.checked = Boolean(saved[name]);
    } else if (typeof saved[name] === "string") {
      control.value = String(saved[name]);
    }
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
  });

  const save = (event: Event) => {
    const control = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
    if (!control || !control.matches("input,select,textarea")) return;
    const type = control instanceof HTMLInputElement ? control.type : "";
    if (["password", "file", "hidden", "submit", "button"].includes(type)) return;
    const name = control.name || control.id;
    if (!name) return;
    let current: Record<string, string | boolean> = {};
    try { current = JSON.parse(localStorage.getItem(key) || "{}"); } catch {}
    current[name] = control instanceof HTMLInputElement && (type === "checkbox" || type === "radio") ? control.checked : control.value;
    try { localStorage.setItem(key, JSON.stringify(current)); } catch {}
  };
  document.addEventListener("input", save, true);
  document.addEventListener("change", save, true);
  return () => {
    document.removeEventListener("input", save, true);
    document.removeEventListener("change", save, true);
  };
}

function standardiseSortControls() {
  if (!/^\/(jobs|contracts|vehicles)/.test(window.location.pathname)) return;
  document.querySelectorAll<HTMLElement>("label,button,div").forEach((node) => {
    if (/^sort by/i.test(normaliseText(node.textContent)) && node.querySelector("select")) node.dataset.loadlinkUnifiedSort = "true";
  });
}

function smartFollowUp() {
  if (window.location.pathname.startsWith("/messages")) return;
  if (document.querySelector('[data-loadlink-smart-followup="true"]')) return;
  let dismissed: string[] = [];
  try { dismissed = JSON.parse(localStorage.getItem(FOLLOW_UP_DISMISSED_KEY) || "[]"); } catch {}

  const candidates = Array.from(document.querySelectorAll<HTMLElement>("article,section,a")).filter((node) => {
    const text = normaliseText(node.textContent);
    return /needed (today|by today)|today.*(?:truck|trailer|vehicle|unit)|(?:truck|trailer|vehicle|unit).*today/i.test(text) && text.length < 900;
  });
  const candidate = candidates.find((node) => {
    const id = node.getAttribute("data-listing-id") || node.querySelector<HTMLAnchorElement>('a[href*="/listing/"]')?.href || normaliseText(node.textContent).slice(0, 80);
    return id && !dismissed.includes(id);
  });
  if (!candidate) return;
  const id = candidate.getAttribute("data-listing-id") || candidate.querySelector<HTMLAnchorElement>('a[href*="/listing/"]')?.href || normaliseText(candidate.textContent).slice(0, 80);
  const title = normaliseText(candidate.querySelector("h2,h3,strong")?.textContent) || "A LoadLink user needs a vehicle today";
  const href = candidate.querySelector<HTMLAnchorElement>('a[href*="/listing/"]')?.getAttribute("href") || window.location.pathname;
  const notice = document.createElement("aside");
  notice.dataset.loadlinkSmartFollowup = "true";
  notice.innerHTML = `<span>FOLLOW-UP</span><strong>${title}</strong><p>This opportunity is time-sensitive. Open it now if you can help today.</p><div><a href="${href}">Open</a><button type="button">Dismiss</button></div>`;
  notice.querySelector("button")?.addEventListener("click", () => {
    const next = Array.from(new Set([...dismissed, id])).slice(-100);
    try { localStorage.setItem(FOLLOW_UP_DISMISSED_KEY, JSON.stringify(next)); } catch {}
    notice.remove();
  });
  document.body.appendChild(notice);
}

function applyAll() {
  applyMessagePolish();
  removeDealershipTopBlocks();
  enhanceDealerPoster();
  applyContractProgress();
  enhancePackageGuide();
  standardiseSortControls();
  smartFollowUp();
}

export default function LoadLinkSmartUxPass20260826() {
  const pathname = usePathname();

  useEffect(() => {
    applyAll();
    const cleanupDriver = rememberDriverSetup();
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(() => {
        queued = false;
        applyAll();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      cleanupDriver();
      delete document.documentElement.dataset.loadlinkContractGoldProgress;
    };
  }, [pathname]);

  return null;
}
