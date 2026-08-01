"use client";

import { useEffect } from "react";

function syncTheme() {
  const theme = window.localStorage.getItem("loadlink-theme") === "dark" ? "dark" : "light";
  document.documentElement.dataset.loadlinkTheme = theme;
  document.documentElement.style.colorScheme = theme;
  document.body.dataset.loadlinkTheme = theme;
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
