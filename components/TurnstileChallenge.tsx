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
const LOADLINK_CANONICAL_HOST = "matikinca-marketplace.vercel.app";

function redirectUnsupportedVercelHostname() {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname.toLowerCase();
  if (!hostname.endsWith(".vercel.app") || hostname === LOADLINK_CANONICAL_HOST) return false;
  const target = new URL(window.location.href);
  target.protocol = "https:";
  target.host = LOADLINK_CANONICAL_HOST;
  window.location.replace(target.toString());
  return true;
}

export const loadLinkTurnstileConfigured = Boolean(SITE_KEY);

type TurnstileFailureReason = "error" | "expired" | "timeout" | "unavailable" | "configuration";

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
    if (redirectUnsupportedVercelHostname()) return;

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
        if (attempts < 120) mountTimer = window.setTimeout(mount, 100);
        else fail("unavailable");
        return;
      }

      if (widgetRef.current) {
        try { window.turnstile.remove(widgetRef.current); } catch {}
      }

      target.innerHTML = "";
      settled = false;
      setFailure(null);
      clearNetworkFailureTimer();

      try {
        widgetRef.current = window.turnstile.render(target, {
          sitekey: SITE_KEY,
          theme: darkMode ? "dark" : "light",
          size: "normal",
          appearance: "always",
          retry: "auto",
          "retry-interval": 3000,
          "refresh-expired": "auto",
          "refresh-timeout": "auto",
          action: "loadlink_security",
          callback: (token: unknown) => {
            if (!active) return;
            const value = typeof token === "string" ? token : "";
            if (!value) { scheduleNetworkFailure(); return; }
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
            if (reason === "configuration") fail(reason, code);
            else scheduleNetworkFailure(code);
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
        try { window.turnstile.remove(widgetRef.current); } catch {}
      }
      widgetRef.current = null;
    };
  }, [containerId, darkMode, internalReset, onFailure, onToken, resetKey]);

  if (!SITE_KEY) {
    return <p className="text-center text-[10px] font-semibold opacity-55">Security verification is temporarily unavailable.</p>;
  }

  if (failure) {
    return (
      <div className="loadlink-glass flex items-center justify-between gap-3 rounded-[15px] border px-3 py-2.5 text-xs">
        <span className="min-w-0 font-semibold opacity-70">
          {failure.reason === "configuration" ? "Security verification is not enabled for this address." : "Security check needs another try."}
        </span>
        <button type="button" onClick={retry} className="h-9 shrink-0 bg-[#f6b800] px-3 text-[10px] font-black text-black">Retry</button>
      </div>
    );
  }

  return (
    <div className="flex h-[58px] w-full items-start justify-center overflow-hidden" aria-label="Security verification">
      <div className="h-[65px] w-[300px] origin-top scale-[.88]">
        <div id={containerId} />
      </div>
    </div>
  );
}
