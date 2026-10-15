"use client";

import { useCallback, useLayoutEffect, useState } from "react";

export type LoadLinkTheme = "light" | "dark";
const STORAGE_KEY = "loadlink-theme";

export function readLoadLinkTheme(): LoadLinkTheme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    const applied = document.documentElement.dataset.loadlinkTheme;
    if (applied === "dark" || applied === "light") return applied;
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyLoadLinkTheme(theme: LoadLinkTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (root.dataset.loadlinkTheme !== theme) root.dataset.loadlinkTheme = theme;
  if (root.classList.contains("dark") !== (theme === "dark")) root.classList.toggle("dark", theme === "dark");
  if (root.style.colorScheme !== theme) root.style.colorScheme = theme;
  if (document.body) {
    if (document.body.dataset.loadlinkTheme !== theme) document.body.dataset.loadlinkTheme = theme;
    if (document.body.style.colorScheme !== theme) document.body.style.colorScheme = theme;
  }
}

export function setLoadLinkTheme(theme: LoadLinkTheme) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, theme); } catch {}
  applyLoadLinkTheme(theme);
  window.dispatchEvent(new CustomEvent("loadlink-theme-change", { detail: { theme } }));
}

export function useLoadLinkTheme() {
  const [theme, setThemeState] = useState<LoadLinkTheme>("light");

  useLayoutEffect(() => {
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
    setTheme(readLoadLinkTheme() === "dark" ? "light" : "dark");
  }, [setTheme]);

  return { theme, darkMode: theme === "dark", setTheme, toggleTheme };
}
