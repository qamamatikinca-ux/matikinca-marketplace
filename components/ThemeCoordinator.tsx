"use client";

import { useEffect } from "react";

function safeReadTheme() {
  try {
    return window.localStorage.getItem("loadlink-theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function syncTheme() {
  try {
    const theme = safeReadTheme();
    document.documentElement.dataset.loadlinkTheme = theme;
    document.documentElement.style.colorScheme = theme;
    document.body.dataset.loadlinkTheme = theme;
  } catch {
    // Theme coordination must never interrupt the marketplace.
  }
}

export default function ThemeCoordinator() {
  useEffect(() => {
    syncTheme();
    window.addEventListener("storage", syncTheme);
    window.addEventListener("loadlink-theme-change", syncTheme);
    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener("loadlink-theme-change", syncTheme);
    };
  }, []);

  return null;
}
