"use client";

import { useCallback, useEffect, useState } from "react";

export type LoadLinkTheme = "light" | "dark";

function readTheme(): LoadLinkTheme {
  if (typeof window === "undefined") return "light";
  try {
    return window.localStorage.getItem("loadlink-theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme: LoadLinkTheme) {
  if (typeof document === "undefined") return;
  try {
    document.documentElement.dataset.loadlinkTheme = theme;
    document.documentElement.style.colorScheme = theme;
    document.body.dataset.loadlinkTheme = theme;
  } catch {
    // A theme preference must never stop the website from rendering.
  }
}

export function setLoadLinkTheme(theme: LoadLinkTheme) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("loadlink-theme", theme);
  } catch {
    // Continue with the in-memory theme when browser storage is unavailable.
  }
  applyTheme(theme);
  try {
    window.dispatchEvent(new CustomEvent("loadlink-theme-change", { detail: { theme } }));
  } catch {
    // Older browsers may not support CustomEvent construction in all contexts.
  }
}

export function useLoadLinkTheme() {
  const [theme, setTheme] = useState<LoadLinkTheme>("light");

  useEffect(() => {
    const sync = () => {
      const next = readTheme();
      setTheme(next);
      applyTheme(next);
    };

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("loadlink-theme-change", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("loadlink-theme-change", sync as EventListener);
    };
  }, []);

  const updateTheme = useCallback((next: LoadLinkTheme) => {
    setLoadLinkTheme(next);
    setTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    updateTheme(theme === "dark" ? "light" : "dark");
  }, [theme, updateTheme]);

  return { theme, darkMode: theme === "dark", setTheme: updateTheme, toggleTheme };
}
