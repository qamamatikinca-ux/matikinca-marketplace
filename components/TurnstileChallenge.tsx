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

// Cloudflare Turnstile site keys are public by design. Keep the known-good
// LoadLink production key as a fallback so a missing Vercel env var can never
// silently remove CAPTCHA protection from signup/login/reset surfaces.
const DEFAULT_LOADLINK_TURNSTILE_SITE_KEY = "0x4AAAAAAELFarTcMyOdHdOy";
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || DEFAULT_LOADLINK_TURNSTILE_SITE_KEY;
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
    let settled = false;

    const fail = (reason: TurnstileFailureReason) => {
      if (!active || settled) return;
      settled = true;
      onToken("");
      onFailure?.(reason);
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
            onToken(value);
          },
          "expired-callback": () => {
            settled = false;
            fail("expired");
          },
          "timeout-callback": () => {
            settled = false;
            fail("timeout");
          },
          "error-callback": () => {
            settled = false;
            fail("error");
          },
        });
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

  if (!SITE_KEY) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/[.06] px-4 py-3 text-sm font-semibold" role="status">
        Security verification is temporarily unavailable. Refresh and try again.
      </div>
    );
  }

  return <div id={containerId} className="min-h-[66px] overflow-hidden rounded-xl" aria-label="Security verification" />;
}
