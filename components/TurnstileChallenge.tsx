"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        target: string | HTMLElement,
        options: Record<string, unknown>,
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string | HTMLElement) => void;
    };
  }
}

const DEFAULT_LOADLINK_TURNSTILE_SITE_KEY =
  "0x4AAAAAAELFarTcMyOdHdOy";
const SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
  DEFAULT_LOADLINK_TURNSTILE_SITE_KEY;
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
  if (value.startsWith("1101") || value.startsWith("1102")) {
    return "configuration";
  }
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
  const [verified, setVerified] = useState(false);

  const retry = useCallback(() => {
    setFailure(null);
    setVerified(false);
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
      setVerified(false);
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
      setVerified(false);
      clearNetworkFailureTimer();

      try {
        widgetRef.current = window.turnstile.render(target, {
          sitekey: SITE_KEY,
          theme: darkMode ? "dark" : "light",
          size: "flexible",
          appearance: "always",
          retry: "auto",
          "retry-interval": 3000,
          "refresh-expired": "auto",
          "refresh-timeout": "auto",
          "feedback-enabled": true,
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
            setVerified(true);
            onToken(value);
          },
          "expired-callback": () => {
            if (!active) return;
            settled = false;
            setVerified(false);
            onToken("");
          },
          "timeout-callback": () => {
            if (!active) return;
            settled = false;
            setVerified(false);
            onToken("");
            scheduleNetworkFailure("timeout");
          },
          "error-callback": (errorCode: unknown) => {
            if (!active) return;
            settled = false;
            setVerified(false);
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

    let script = document.getElementById(
      SCRIPT_ID,
    ) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
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
  }, [
    containerId,
    darkMode,
    internalReset,
    onFailure,
    onToken,
    resetKey,
  ]);

  const frame = darkMode
    ? "border-white/10 bg-white/[.035] text-white"
    : "border-black/10 bg-[#fbfaf7] text-black";

  const hostname =
    typeof window === "undefined" ? "" : window.location.hostname;

  return (
    <div
      className={`overflow-hidden rounded-[16px] border ${frame}`}
      aria-label="Security verification"
    >
      <div className="flex items-center justify-between gap-3 border-b border-current/10 px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f6b800]/12">
            <LoadLinkShield />
          </span>
          <div className="min-w-0">
            <div className="text-[10px] font-black">LoadLink security</div>
            <div className="mt-0.5 text-[8px] font-semibold opacity-42">
              Protected by Cloudflare Turnstile
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[.06em] opacity-45">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              verified
                ? "bg-emerald-500"
                : failure
                  ? "bg-[#f6b800]"
                  : "bg-current opacity-30"
            }`}
          />
          {verified ? "Verified" : failure ? "Check required" : "Checking"}
        </div>
      </div>

      {!SITE_KEY ? (
        <div
          role="status"
          aria-live="polite"
          className="px-3.5 py-3 text-[10px] font-semibold opacity-60"
        >
          Security verification is temporarily unavailable.
        </div>
      ) : (
        <>
          <div
            id={containerId}
            className={`w-full min-w-0 overflow-hidden px-2.5 py-2.5 ${
              failure ? "hidden" : "block"
            }`}
          />

          {failure ? (
            <div
              role="status"
              aria-live="polite"
              className="flex min-h-[74px] items-center justify-between gap-3 px-3.5 py-3"
            >
              <div className="min-w-0">
                <div className="text-[10px] font-black">
                  {failure.reason === "configuration"
                    ? "This address is not enabled for verification"
                    : "Security check needs another try"}
                </div>
                <div className="mt-1 max-w-[240px] text-[8px] font-semibold leading-4 opacity-45">
                  {failure.reason === "configuration"
                    ? hostname
                      ? `Cloudflare Turnstile is not authorized for ${hostname}.`
                      : "Cloudflare Turnstile is not authorized for this address."
                    : "The secure connection did not complete. Retry the verification."}
                </div>
              </div>

              <button
                type="button"
                onClick={retry}
                className="h-9 shrink-0 rounded-xl bg-[#f6b800] px-3.5 text-[9px] font-black text-black active:scale-[.98]"
              >
                Retry
              </button>
            </div>
          ) : null}
        </>
      )}

      <div className="flex items-center justify-between border-t border-current/10 px-3.5 py-2">
        <div className="flex items-center gap-2 opacity-55">
          <CloudflareMark />
          <span className="text-[8px] font-bold">Cloudflare Turnstile</span>
        </div>
        <span className="text-[7px] font-semibold opacity-30">
          Privacy · Help
        </span>
      </div>
    </div>
  );
}

function LoadLinkShield() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-[#b88600]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3.5 19 6v5.5c0 4.4-2.7 7.7-7 9-4.3-1.3-7-4.6-7-9V6z" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </svg>
  );
}

function CloudflareMark() {
  return (
    <svg
      viewBox="0 0 28 18"
      className="h-3 w-[18px]"
      aria-label="Cloudflare"
    >
      <path
        fill="#F48120"
        d="M10.7 4.2c1.1-2.3 3.5-3.7 6-3.4 2.8.3 5 2.5 5.3 5.2.4 0 .8 0 1.2.2 2 .5 3.5 2.2 3.8 4.2H8.2c.2-2.7 1.1-4.8 2.5-6.2Z"
      />
      <path
        fill="#FAAD3D"
        d="M1 10.5c.3-2 2-3.5 4.1-3.5.8 0 1.5.2 2.2.6.9-1.1 2.3-1.8 3.8-1.8 2.7 0 4.9 2.1 5 4.7H1Z"
      />
    </svg>
  );
}
