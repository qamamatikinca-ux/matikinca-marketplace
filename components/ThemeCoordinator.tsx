"use client";

import { useLayoutEffect } from "react";
import { applyLoadLinkTheme, readLoadLinkTheme } from "@/lib/useLoadLinkTheme";

function updateBrowserChrome(theme: "light" | "dark") {
  const colour = theme === "dark" ? "#050505" : "#f4efe3";
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  if (meta.content !== colour) meta.content = colour;
}

function syncTheme() {
  const theme = readLoadLinkTheme();
  applyLoadLinkTheme(theme);
  updateBrowserChrome(theme);
}

export default function ThemeCoordinator() {
  useLayoutEffect(() => {
    syncTheme();
    // Reveal server-rendered markup only after React applies the saved visual mode.
    const revealFrame = window.requestAnimationFrame(() => { delete document.documentElement.dataset.loadlinkHydrating; });
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onVisible = () => { if (document.visibilityState === "visible") syncTheme(); };
    window.addEventListener("storage", syncTheme);
    window.addEventListener("loadlink-theme-change", syncTheme);
    window.addEventListener("pageshow", syncTheme);
    window.addEventListener("focus", syncTheme);
    document.addEventListener("visibilitychange", onVisible);
    media?.addEventListener("change", syncTheme);
    return () => {
      window.cancelAnimationFrame(revealFrame);
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener("loadlink-theme-change", syncTheme);
      window.removeEventListener("pageshow", syncTheme);
      window.removeEventListener("focus", syncTheme);
      document.removeEventListener("visibilitychange", onVisible);
      media?.removeEventListener("change", syncTheme);
    };
  }, []);
  return null;
}
