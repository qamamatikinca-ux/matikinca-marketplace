"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const STYLE_ID = "loadlink-universal-ui-guard-style";
const INTEGER_TERMS = /(?:year|age|quantity|qty|count|number of|fleet|seats|capacity|mileage|odometer|kilomet|postal|otp|pin|code)/i;
const PHONE_TERMS = /(?:phone|mobile|whatsapp|contact number|telephone)/i;
const DECIMAL_TERMS = /(?:price|rate|amount|budget|cost|weight|distance|ton|litre|liter|km)/i;
const INTERNAL_REPAIR_TEXT = /(?:run|apply|install).{0,45}(?:loadlink|supabase|marketplace).{0,35}(?:sql|patch|migration)|(?:supabase|postgres|pgrst).{0,30}(?:repair|sql|schema cache)/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PENDING_REPORTS_KEY = "loadlink-pending-reports";
let reportSyncBusy = false;

type PendingListingReport = {
  listingId?: string;
  title?: string;
  reason?: string;
  createdAt?: string;
};

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

function sanitizeInternalRepairMessages(root: ParentNode) {
  root.querySelectorAll<HTMLElement>("p, div, span, li").forEach((node) => {
    if (node.children.length) return;
    const text = (node.textContent || "").trim();
    if (!text || !INTERNAL_REPAIR_TEXT.test(text)) return;

    const messaging = /messag|chat|conversation/i.test(text);
    const posting = /post|listing|vehicle|resubmit/i.test(text);
    node.textContent = messaging
      ? "LoadLink messaging is temporarily unavailable. Refresh once and try again."
      : posting
        ? "LoadLink could not save that post change right now. Your information is still safe; refresh once and try again."
        : "LoadLink could not complete that action right now. Refresh once and try again.";
  });
}

async function syncPendingListingReports() {
  if (reportSyncBusy || typeof window === "undefined") return;
  reportSyncBusy = true;
  try {
    const raw = window.localStorage.getItem(PENDING_REPORTS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const pending: PendingListingReport[] = Array.isArray(parsed) ? parsed : [];
    if (!pending.length) {
      window.localStorage.removeItem(PENDING_REPORTS_KEY);
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const remaining: PendingListingReport[] = [];
    let sent = 0;
    for (const report of pending.slice(0, 20)) {
      const listingId = String(report?.listingId || "");
      const reason = String(report?.reason || "").trim();
      if (!UUID_RE.test(listingId) || reason.length < 3) continue;

      const result = await supabase.rpc("loadlink_report_listing", {
        p_listing_id: listingId,
        p_category: "other",
        p_details: reason.slice(0, 2000),
      });

      if (result.error) {
        if (/listing not found|own listing/i.test(result.error.message || "")) continue;
        remaining.push(report);
      } else {
        sent += 1;
      }
    }
    if (pending.length > 20) remaining.push(...pending.slice(20));

    if (remaining.length) window.localStorage.setItem(PENDING_REPORTS_KEY, JSON.stringify(remaining));
    else window.localStorage.removeItem(PENDING_REPORTS_KEY);

    if (sent > 0) {
      window.dispatchEvent(new CustomEvent("loadlink:toast", {
        detail: {
          kind: "success",
          title: "Report sent to LoadLink",
          message: sent === 1 ? "Your marketplace report is now in the review queue." : `${sent} marketplace reports are now in the review queue.`,
          duration: 5200,
        },
      }));
    }
  } catch {
    // Keep pending reports on-device until a later safe retry.
  } finally {
    reportSyncBusy = false;
  }
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
      sanitizeInternalRepairMessages(root);
      const sliderChanged = polishSliders(root);
      ensureSinglePageNavigation(pathname);
      if (sliderChanged) window.dispatchEvent(new Event("loadlink:content-updated"));
    };

    const tryReportSync = () => void syncPendingListingReports();
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("button,a") : null;
      if (!target || !/report/i.test((target.textContent || target.getAttribute("aria-label") || "").trim())) return;
      window.setTimeout(tryReportSync, 300);
    };

    scan();
    tryReportSync();
    const timers = [160, 500, 1200, 2400].map((delay) => window.setTimeout(() => scan(), delay));
    const reportTimer = window.setInterval(tryReportSync, 15_000);
    window.addEventListener("focus", tryReportSync);
    window.addEventListener("loadlink-account-state-changed", tryReportSync as EventListener);
    document.addEventListener("click", onDocumentClick);

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
      window.clearInterval(reportTimer);
      window.removeEventListener("focus", tryReportSync);
      window.removeEventListener("loadlink-account-state-changed", tryReportSync as EventListener);
      document.removeEventListener("click", onDocumentClick);
    };
  }, [pathname]);

  return null;
}