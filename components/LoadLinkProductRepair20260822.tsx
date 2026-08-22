"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function ensureVehicleReviewHosts() {
  document.querySelectorAll<HTMLElement>('[data-loadlink-vehicle-card="true"][data-listing-id]').forEach((card) => {
    const id = String(card.dataset.listingId || "");
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

function markContactPosterBlocks() {
  document.querySelectorAll<HTMLElement>("p").forEach((label) => {
    if ((label.textContent || "").replace(/\s+/g, " ").trim().toLowerCase() !== "contact poster") return;
    const block = label.closest<HTMLElement>("div.mt-5.overflow-hidden.border");
    if (block) block.dataset.llContactPoster = "true";
  });
}

function markJobCardDensity() {
  document.querySelectorAll<HTMLElement>('article[id^="job-"]').forEach((card) => {
    card.dataset.llCompactMarketplaceCard = "true";
  });
}

export default function LoadLinkProductRepair20260822() {
  const pathname = usePathname();

  useEffect(() => {
    let frame = 0;
    const scan = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        ensureVehicleReviewHosts();
        markContactPosterBlocks();
        markJobCardDensity();
      });
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("popstate", scan);
    window.addEventListener("hashchange", scan);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("popstate", scan);
      window.removeEventListener("hashchange", scan);
    };
  }, [pathname]);

  return null;
}
