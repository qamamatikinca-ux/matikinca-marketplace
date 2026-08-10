"use client";

import { useEffect, useId, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (target: string | HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
const SCRIPT_ID = "loadlink-turnstile-script";

export const loadLinkTurnstileConfigured = Boolean(SITE_KEY);

type TurnstileFailureReason = "error" | "expired" | "timeout" | "unavailable";

export default function TurnstileChallenge({
  onToken,
  onFailure,
  resetKey = 0,
  darkMode = false,
}: {
  onToken: (token: string) => void;
  onFailure?: (reason: TurnstileFailureReason) => void;
  resetKey?: number;
  darkMode?: boolean;
}) {
  const reactId = useId();
  const containerId = `loadlink-turnstile-${reactId.replace(/:/g, "")}`;
  const widgetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;

    let active = true;
    let attempts = 0;
    let mountTimer: number | null = null;
    let watchdogTimer: number | null = null;
    let settled = false;

    const fail = (reason: TurnstileFailureReason) => {
      if (!active || settled) return;
      settled = true;
      onToken("");
      onFailure?.(reason);
    };

    const clearWatchdog = () => {
      if (watchdogTimer) {
        window.clearTimeout(watchdogTimer);
        watchdogTimer = null;
      }
    };

    const mount = () => {
      if (!active) return;
      const target = document.getElementById(containerId);

      if (!target || !window.turnstile) {
        attempts += 1;
        if (attempts < 100) {
          mountTimer = window.setTimeout(mount, 100);
        } else {
          fail("unavailable");
        }
        return;
      }

      if (widgetRef.current) {
        try {
          window.turnstile.remove(widgetRef.current);
        } catch {
          // Ignore stale widget cleanup failures; a fresh widget is rendered below.
        }
      }

      target.innerHTML = "";
      settled = false;

      try {
        widgetRef.current = window.turnstile.render(target, {
          sitekey: SITE_KEY,
          theme: darkMode ? "dark" : "light",
          callback: (token: unknown) => {
            if (!active) return;
            const value = typeof token === "string" ? token : "";
            if (!value) {
              fail("error");
              return;
            }
            settled = true;
            clearWatchdog();
            onToken(value);
          },
          "expired-callback": () => {
            clearWatchdog();
            settled = false;
            fail("expired");
          },
          "timeout-callback": () => {
            clearWatchdog();
            settled = false;
            fail("timeout");
          },
          "error-callback": () => {
            clearWatchdog();
            settled = false;
            fail("error");
          },
        });

        watchdogTimer = window.setTimeout(() => {
          if (!settled) fail("timeout");
        }, 20000);
      } catch {
        fail("error");
      }
    };

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onerror = () => fail("unavailable");
      document.head.appendChild(script);
    }

    mount();

    return () => {
      active = false;
      if (mountTimer) window.clearTimeout(mountTimer);
      clearWatchdog();
      if (widgetRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetRef.current);
        } catch {
          // Ignore cleanup errors during navigation or retry.
        }
      }
      widgetRef.current = null;
    };
  }, [containerId, darkMode, onFailure, onToken, resetKey]);

  if (!SITE_KEY) return null;
  return <div id={containerId} className="min-h-[66px] overflow-hidden rounded-xl" aria-label="Security verification" />;
}
