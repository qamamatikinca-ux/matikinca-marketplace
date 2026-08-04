"use client";

import { useCallback, useEffect, useState } from "react";

export type LoadLinkTheme = "light" | "dark";
const STORAGE_KEY = "loadlink-theme";

export function readLoadLinkTheme(): LoadLinkTheme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyLoadLinkTheme(theme: LoadLinkTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.loadlinkTheme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  if (document.body) {
    document.body.dataset.loadlinkTheme = theme;
    document.body.style.colorScheme = theme;
  }
}

export function setLoadLinkTheme(theme: LoadLinkTheme) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, theme);
  applyLoadLinkTheme(theme);
  window.dispatchEvent(new CustomEvent("loadlink-theme-change", { detail: { theme } }));
}

export function useLoadLinkTheme() {
  const [theme, setThemeState] = useState<LoadLinkTheme>("light");

  useEffect(() => {
    const sync = () => {
      const next = readLoadLinkTheme();
      setThemeState(next);
      applyLoadLinkTheme(next);
    };
    sync();
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    window.addEventListener("storage", sync);
    window.addEventListener("loadlink-theme-change", sync as EventListener);
    window.addEventListener("pageshow", sync);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    media?.addEventListener("change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("loadlink-theme-change", sync as EventListener);
      window.removeEventListener("pageshow", sync);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
      media?.removeEventListener("change", sync);
    };
  }, []);

  const setTheme = useCallback((next: LoadLinkTheme) => {
    setLoadLinkTheme(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, darkMode: theme === "dark", setTheme, toggleTheme };
}
