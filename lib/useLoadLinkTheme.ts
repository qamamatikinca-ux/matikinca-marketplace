"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import { flushSync } from "react-dom";

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

let themeTransitionRunning = false;
let fallbackCleanup: number | null = null;

// Keep root theme attributes and all React darkMode classes in the same commit,
// preventing mixed-mode frames during a user-initiated theme switch.
export function setLoadLinkTheme(theme: LoadLinkTheme) {
  if (typeof window === "undefined" || themeTransitionRunning) return;
  const root = document.documentElement;
  if (readLoadLinkTheme() === theme && root.dataset.loadlinkTheme === theme) return;

  const commit = () => {
    try { window.localStorage.setItem(STORAGE_KEY, theme); } catch {}
    flushSync(() => {
      applyLoadLinkTheme(theme);
      window.dispatchEvent(new CustomEvent("loadlink-theme-change", { detail: { theme } }));
    });
  };

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || root.dataset.loadlinkHydrating === "true") {
    commit();
    return;
  }

  const doc = document as Document & {
    startViewTransition?: (update: () => void) => { finished: Promise<void> };
  };
  // A single crossfade between fully rendered states is cheaper and cleaner
  // than dozens of asynchronous per-card flashes, especially on iOS Safari.
  if (typeof doc.startViewTransition === "function") {
    themeTransitionRunning = true;
    root.dataset.loadlinkThemeTransition = "true";
    try {
      const transition = doc.startViewTransition(commit);
      void transition.finished.catch(() => undefined).finally(() => {
        delete root.dataset.loadlinkThemeTransition;
        themeTransitionRunning = false;
      });
    } catch {
      delete root.dataset.loadlinkThemeTransition;
      themeTransitionRunning = false;
      commit();
    }
    return;
  }

  // Fallback is restricted to visual properties; truck loader stays unchanged.
  root.dataset.loadlinkThemeFallback = "true";
  commit();
  if (fallbackCleanup !== null) window.clearTimeout(fallbackCleanup);
  fallbackCleanup = window.setTimeout(() => {
    delete root.dataset.loadlinkThemeFallback;
    fallbackCleanup = null;
  }, 300);
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
    // Every mounted theme hook responds to the same atomic theme-change event.
    setLoadLinkTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(readLoadLinkTheme() === "dark" ? "light" : "dark");
  }, [setTheme]);

  return { theme, darkMode: theme === "dark", setTheme, toggleTheme };
}
