"use client";

import { useEffect } from "react";

export const SIMPLE_MODE_KEY = "loadlink-simple-mode";

export function setLoadLinkSimpleMode(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIMPLE_MODE_KEY, enabled ? "true" : "false");
  } catch {}
  const root = document.documentElement;
  root.dataset.loadlinkSimple = enabled ? "true" : "false";
  window.dispatchEvent(new CustomEvent("loadlink-simple-mode-changed", { detail: { enabled } }));
}

export function readLoadLinkSimpleMode() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SIMPLE_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

export default function SimpleModeCoordinator(): null {
  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.loadlinkSimple = readLoadLinkSimpleMode() ? "true" : "false";
    };
    apply();
    window.addEventListener("storage", apply);
    window.addEventListener("loadlink-simple-mode-changed", apply as EventListener);
    return () => {
      window.removeEventListener("storage", apply);
      window.removeEventListener("loadlink-simple-mode-changed", apply as EventListener);
    };
  }, []);
  return null;
}
