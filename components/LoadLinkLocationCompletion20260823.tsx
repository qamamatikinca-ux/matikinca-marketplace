"use client";

import { useEffect } from "react";

export default function LoadLinkLocationCompletion20260823() {
  useEffect(() => {
    // Exact-address, GPS and map-preview capture is paused for now.
    // Existing city/town/province fields remain untouched.
    const cleanup = () => {
      document.querySelectorAll<HTMLElement>('[data-loadlink-location-completion-host="true"],[data-loadlink-location-upgrade="20260823"]').forEach((node) => node.remove());
      document.querySelectorAll<HTMLInputElement>('[data-loadlink-injected-exact-location="true"]').forEach((node) => node.remove());
    };
    cleanup();
    const observer = new MutationObserver(cleanup);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
