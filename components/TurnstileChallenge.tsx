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

export default function TurnstileChallenge({ onToken, resetKey = 0, darkMode = false }: { onToken: (token: string) => void; resetKey?: number; darkMode?: boolean }) {
  const reactId = useId();
  const containerId = `loadlink-turnstile-${reactId.replace(/:/g, "")}`;
  const widgetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;
    let active = true;
    let attempts = 0;
    let timer: number | null = null;

    const mount = () => {
      if (!active) return;
      const target = document.getElementById(containerId);
      if (!target || !window.turnstile) {
        attempts += 1;
        if (attempts < 80) timer = window.setTimeout(mount, 100);
        return;
      }
      if (widgetRef.current) window.turnstile.remove(widgetRef.current);
      target.innerHTML = "";
      widgetRef.current = window.turnstile.render(target, {
        sitekey: SITE_KEY,
        theme: darkMode ? "dark" : "light",
        callback: (token: unknown) => onToken(typeof token === "string" ? token : ""),
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    };

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    mount();

    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
      if (widgetRef.current && window.turnstile) window.turnstile.remove(widgetRef.current);
      widgetRef.current = null;
    };
  }, [containerId, darkMode, onToken, resetKey]);

  if (!SITE_KEY) return null;
  return <div id={containerId} className="min-h-[66px] overflow-hidden rounded-xl" aria-label="Security verification" />;
}
