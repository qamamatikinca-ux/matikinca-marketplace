"use client";

import { useEffect } from "react";

const STORAGE_KEYS = [
  "loadlink-distance-enabled-v1",
  "loadlink-distance-prompt-dismissed-v1",
  "loadlink-user-coordinates",
];

const SESSION_KEYS = ["loadlink-distance-user-point-v1"];

export default function LoadLinkDistanceLayer20260823() {
  useEffect(() => {
    // Precise/current-device location is intentionally disabled for this release.
    // Marketplace city/town/province text remains available in the normal filters.
    try {
      STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
      SESSION_KEYS.forEach((key) => sessionStorage.removeItem(key));
    } catch {}

    const clearPreciseLocationUi = () => {
      document.querySelectorAll<HTMLElement>(
        '[data-loadlink-distance-control="true"],[data-loadlink-distance-badge="true"],[data-loadlink-location-upgrade="20260823"]',
      ).forEach((node) => node.remove());
      document.querySelectorAll<HTMLElement>('[data-loadlink-distance-anchor="true"]').forEach((node) => {
        delete node.dataset.loadlinkDistanceAnchor;
      });
    };

    clearPreciseLocationUi();
    const observer = new MutationObserver(clearPreciseLocationUi);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
