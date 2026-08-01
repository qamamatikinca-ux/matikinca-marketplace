"use client";

import { useEffect } from "react";

function syncTheme() {
  const stored = window.localStorage.getItem("loadlink-theme");
  const theme = stored === "dark" || stored === "light"
    ? stored
    : window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.loadlinkTheme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  document.body.dataset.loadlinkTheme = theme;
}

export default function ThemeCoordinator() {
  useEffect(() => {
    syncTheme();
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    window.addEventListener("storage", syncTheme);
    window.addEventListener("loadlink-theme-change", syncTheme);
    media?.addEventListener("change", syncTheme);
    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener("loadlink-theme-change", syncTheme);
      media?.removeEventListener("change", syncTheme);
    };
  }, []);

  return null;
}
