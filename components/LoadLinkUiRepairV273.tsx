"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SEEN_KEY = "loadlink-seen-listings-v2";

function repairContractLinks() {
  document.querySelectorAll<HTMLAnchorElement>('a[href*="/jobs/list?mode=contract"]').forEach((link) => {
    link.href = link.href.replace("mode=contract", "type=contract");
  });
}

function readSeen() {
  const seen = new Set<string>();
  try {
    const saved = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
    if (Array.isArray(saved)) saved.forEach((id) => id && seen.add(String(id)));
  } catch {}
  try {
    const recent = JSON.parse(localStorage.getItem("loadlink-recent-viewed-jobs") || "[]");
    if (Array.isArray(recent)) recent.forEach((item) => item?.id && seen.add(String(item.id)));
  } catch {}
  return seen;
}

function markSeen(id: string) {
  if (!id) return;
  const seen = readSeen();
  seen.add(id);
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen])); } catch {}
  window.dispatchEvent(new Event("loadlink-seen-listings-updated"));
}

function listingIdFromHref(href: string) {
  try {
    const url = new URL(href, window.location.origin);
    const match = url.pathname.match(/^\/listing\/([^/?#]+)/i);
    return match?.[1] || "";
  } catch {
    return "";
  }
}

// Preserve viewed-listing history for recommendations without a visible badge.
function ensureSeenBadge(media: HTMLElement, _id: string) {
  media.querySelectorAll('[data-loadlink-seen-badge="true"]').forEach((node) => node.remove());
}

function repairSeenListings() {
  const seen = readSeen();

  document.querySelectorAll<HTMLAnchorElement>('a[href*="/listing/"]').forEach((link) => {
    const id = listingIdFromHref(link.href);
    if (!id || !seen.has(id)) return;
    const media = link.querySelector<HTMLElement>("img")?.parentElement || link;
    ensureSeenBadge(media, id);
  });

  document.querySelectorAll<HTMLElement>('article[id^="job-"]').forEach((article) => {
    const id = article.id.replace(/^job-/, "");
    if (!id || !seen.has(id)) return;
    const media = article.querySelector<HTMLElement>('[role="button"]') || article.querySelector<HTMLElement>("img")?.parentElement;
    if (media) ensureSeenBadge(media, id);
  });
}

function captureSeenClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return;

  const listingLink = target.closest<HTMLAnchorElement>('a[href*="/listing/"]');
  if (listingLink) {
    const id = listingIdFromHref(listingLink.href);
    if (id) markSeen(id);
    window.requestAnimationFrame(repairSeenListings);
    return;
  }

  const card = target.closest<HTMLElement>('article[id^="job-"]');
  if (!card) return;
  const id = card.id.replace(/^job-/, "");
  const photoOpen = Boolean(target.closest('[role="button"]'));
  const summary = target.closest("summary");
  const detailsOpen = Boolean(summary && /view full details/i.test(summary.textContent || ""));
  if (!photoOpen && !detailsOpen) return;
  markSeen(id);
  window.requestAnimationFrame(repairSeenListings);
}

// Real dealership showroom components already render trading hours and reviews.
// Remove obsolete injected placeholder cards when navigating without a full reload.
function removeLegacyDealerCards() {
  if (!window.location.pathname.startsWith("/dealership/")) return;
  document.querySelectorAll('[data-loadlink-dealer-business-info="true"]').forEach((node) => node.remove());
}

function ensureStyles() {
  if (document.getElementById("loadlink-v278-ui-repair")) return;
  const style = document.createElement("style");
  style.id = "loadlink-v278-ui-repair";
  style.textContent = `
.loadlink-chat-header button[aria-label="View latest dealer update"]{padding:0!important;background:transparent!important;overflow:visible!important}
.loadlink-chat-header button[aria-label="View latest dealer update"]>span{width:100%!important;height:100%!important;padding:0!important;background:transparent!important;border-radius:999px!important}
.loadlink-chat-header button[aria-label="View latest dealer update"] [aria-label$="profile picture"]{width:100%!important;height:100%!important}
[aria-label$="profile picture"]>span{background:transparent!important}
.loadlink-seen-post-badge{display:none!important;position:absolute!important;top:12px!important;left:12px!important;right:auto!important;z-index:20!important;pointer-events:none!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border:1px solid rgba(255,255,255,.12)!important;border-radius:9px!important;background:rgba(18,18,18,.78)!important;color:#fff!important;padding:8px 13px!important;font-size:12px!important;font-weight:700!important;line-height:1!important;letter-spacing:0!important;box-shadow:0 6px 18px rgba(0,0,0,.2)!important;backdrop-filter:blur(8px)!important;-webkit-backdrop-filter:blur(8px)!important}
`;
  document.head.appendChild(style);
}

function runRepairs() {
  ensureStyles();
  repairContractLinks();
  repairSeenListings();
  removeLegacyDealerCards();
}

export default function LoadLinkUiRepairV273() {
  const pathname = usePathname();

  useEffect(() => {
    runRepairs();
    let queuedFrame = 0;
    // Batch legacy repairs into a single frame instead of running per DOM insertion.
    const scheduleRepairs = () => {
      if (queuedFrame) return;
      queuedFrame = window.requestAnimationFrame(() => { queuedFrame = 0; runRepairs(); });
    };
    const observer = new MutationObserver(scheduleRepairs);
    observer.observe(document.body, { childList: true, subtree: true });
    const seenRefresh = () => runRepairs();
    document.addEventListener("click", captureSeenClick, true);
    window.addEventListener("loadlink-seen-listings-updated", seenRefresh);
    window.addEventListener("loadlink-recent-activity-updated", seenRefresh);
    const frame = window.requestAnimationFrame(runRepairs);
    const timer = window.setTimeout(runRepairs, 350);
    return () => {
      observer.disconnect();
      if (queuedFrame) window.cancelAnimationFrame(queuedFrame);
      document.removeEventListener("click", captureSeenClick, true);
      window.removeEventListener("loadlink-seen-listings-updated", seenRefresh);
      window.removeEventListener("loadlink-recent-activity-updated", seenRefresh);
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [pathname]);

  useEffect(() => {
    const body = document.body;
    body.dataset.loadlinkPath = pathname || "/";
    return () => { delete body.dataset.loadlinkPath; };
  }, [pathname]);

  return null;
}
