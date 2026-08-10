"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (target: string | HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string | HTMLElement) => void;
    };
  }
}

const DEFAULT_LOADLINK_TURNSTILE_SITE_KEY = "0x4AAAAAAELFarTcMyOdHdOy";
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || DEFAULT_LOADLINK_TURNSTILE_SITE_KEY;
const SCRIPT_ID = "loadlink-turnstile-script";
const NETWORK_GRACE_MS = 12000;

export const loadLinkTurnstileConfigured = Boolean(SITE_KEY);

type TurnstileFailureReason =
  | "error"
  | "expired"
  | "timeout"
  | "unavailable"
  | "configuration";

type FailureState = {
  reason: TurnstileFailureReason;
  code?: string;
};

function classifyError(code: unknown): TurnstileFailureReason {
  const value = String(code || "");
  if (value.startsWith("1101") || value.startsWith("1102")) return "configuration";
  return "error";
}

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
  const networkFailureTimerRef = useRef<number | null>(null);
  const [internalReset, setInternalReset] = useState(0);
  const [failure, setFailure] = useState<FailureState | null>(null);

  const retry = useCallback(() => {
    setFailure(null);
    onToken("");
    setInternalReset((value) => value + 1);
  }, [onToken]);

  useEffect(() => {
    if (!SITE_KEY) return;

    let active = true;
    let attempts = 0;
    let mountTimer: number | null = null;
    let settled = false;

    const clearNetworkFailureTimer = () => {
      if (networkFailureTimerRef.current) {
        window.clearTimeout(networkFailureTimerRef.current);
        networkFailureTimerRef.current = null;
      }
    };

    const fail = (reason: TurnstileFailureReason, code?: string) => {
      if (!active || settled) return;
      clearNetworkFailureTimer();
      settled = true;
      onToken("");
      setFailure({ reason, code });
      onFailure?.(reason);
    };

    const scheduleNetworkFailure = (code?: string) => {
      if (!active || settled || networkFailureTimerRef.current) return;
      networkFailureTimerRef.current = window.setTimeout(() => {
        networkFailureTimerRef.current = null;
        fail("error", code);
      }, NETWORK_GRACE_MS);
    };

    const mount = () => {
      if (!active) return;
      const target = document.getElementById(containerId);

      if (!target || !window.turnstile) {
        attempts += 1;
        if (attempts < 120) {
          mountTimer = window.setTimeout(mount, 100);
        } else {
          fail("unavailable");
        }
        return;
      }

      if (widgetRef.current) {
        try {
          window.turnstile.remove(widgetRef.current);
        } catch {}
      }

      target.innerHTML = "";
      settled = false;
      setFailure(null);
      clearNetworkFailureTimer();

      try {
        widgetRef.current = window.turnstile.render(target, {
          sitekey: SITE_KEY,
          theme: darkMode ? "dark" : "light",
          size: "flexible",
          appearance: "interaction-only",
          retry: "auto",
          "retry-interval": 3000,
          "refresh-expired": "auto",
          "refresh-timeout": "auto",
          "feedback-enabled": false,
          action: "loadlink_security",
          callback: (token: unknown) => {
            if (!active) return;
            const value = typeof token === "string" ? token : "";
            if (!value) {
              scheduleNetworkFailure();
              return;
            }
            clearNetworkFailureTimer();
            settled = true;
            setFailure(null);
            onToken(value);
          },
          "expired-callback": () => {
            if (!active) return;
            settled = false;
            onToken("");
          },
          "timeout-callback": () => {
            if (!active) return;
            settled = false;
            onToken("");
            scheduleNetworkFailure("timeout");
          },
          "error-callback": (errorCode: unknown) => {
            if (!active) return;
            settled = false;
            onToken("");
            const code = String(errorCode || "");
            const reason = classifyError(code);
            if (reason === "configuration") {
              fail(reason, code);
              return;
            }
            scheduleNetworkFailure(code);
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
      clearNetworkFailureTimer();
      if (mountTimer) window.clearTimeout(mountTimer);
      if (widgetRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetRef.current);
        } catch {}
      }
      widgetRef.current = null;
    };
  }, [containerId, darkMode, internalReset, onFailure, onToken, resetKey]);

  if (!SITE_KEY) {
    return (
      <div
        className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
          darkMode
            ? "border-white/10 bg-white/[.035] text-white/70"
            : "border-black/10 bg-black/[.025] text-black/70"
        }`}
        role="status"
        aria-live="polite"
      >
        Security verification is temporarily unavailable. Refresh and try again.
      </div>
    );
  }

  return (
    <div className="relative min-h-[38px]" aria-label="Security verification">
      <div
        id={containerId}
        className={`min-h-[38px] w-full overflow-hidden rounded-xl transition-opacity ${
          failure ? "pointer-events-none h-0 min-h-0 opacity-0" : "opacity-100"
        }`}
      />
      {failure ? (
        <div
          role="status"
          aria-live="polite"
          className={`flex min-h-[54px] items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${
            darkMode
              ? "border-white/10 bg-white/[.035] text-white"
              : "border-black/10 bg-black/[.025] text-black"
          }`}
        >
          <div className="min-w-0">
            <div className="text-[11px] font-black">Security check needs another try</div>
            <div className="mt-0.5 text-[10px] font-semibold opacity-50">
              {failure.reason === "configuration"
                ? "LoadLink could not start verification on this address."
                : "The secure connection did not complete."}
            </div>
          </div>
          <button
            type="button"
            onClick={retry}
            className="h-9 shrink-0 rounded-lg bg-[#f6b800] px-3 text-[10px] font-black text-black active:scale-[.98]"
          >
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}
