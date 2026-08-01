"use client";

import { useCallback, useEffect, useState } from "react";

export type LoadLinkTheme = "light" | "dark";

function readTheme(): LoadLinkTheme {
  if (typeof window === "undefined") return "light";
  return window.localStorage.getItem("loadlink-theme") === "dark" ? "dark" : "light";
}

function applyTheme(theme: LoadLinkTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.loadlinkTheme = theme;
  document.documentElement.style.colorScheme = theme;
  document.body.dataset.loadlinkTheme = theme;
}

export function setLoadLinkTheme(theme: LoadLinkTheme) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("loadlink-theme", theme);
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent("loadlink-theme-change", { detail: { theme } }));
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
