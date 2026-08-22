"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "loadlink-cookie-consent-v1";
const COOKIE_NAME = "loadlink_cookie_consent";
type Choice = "all" | "essential";

function persist(choice: Choice) {
  try { localStorage.setItem(STORAGE_KEY, choice); } catch {}
  document.cookie = `${COOKIE_NAME}=v1:${choice}; Max-Age=31536000; Path=/; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent("loadlink-cookie-consent-changed", { detail: { choice } }));
}

function readStored(): Choice | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "all" || value === "essential") return value;
  } catch {}
  const match = document.cookie.match(/(?:^|; )loadlink_cookie_consent=v1:(all|essential)(?:;|$)/);
  return match?.[1] === "all" || match?.[1] === "essential" ? match[1] : null;
}

export default function LoadLinkCookieConsent20260822() {
  const [open, setOpen] = useState(false);
  const [preferencesMode, setPreferencesMode] = useState(false);

  useEffect(() => {
    setOpen(!readStored());
    const showPreferences = () => {
      setPreferencesMode(true);
      setOpen(true);
    };
    window.addEventListener("loadlink:open-cookie-preferences", showPreferences);
    return () => window.removeEventListener("loadlink:open-cookie-preferences", showPreferences);
  }, []);

  function choose(choice: Choice) {
    persist(choice);
    setOpen(false);
    setPreferencesMode(false);
  }

  if (!open) return null;

  return (
    <aside
      data-loadlink-cookie-consent
      role="dialog"
      aria-modal="false"
      aria-labelledby="loadlink-cookie-title"
      className="fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-[9998] mx-auto max-w-[760px] border border-black/15 bg-white px-4 py-4 text-black shadow-[0_24px_70px_rgba(0,0,0,.24)] sm:inset-x-5 sm:px-5"
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <h2 id="loadlink-cookie-title" className="text-[14px] font-black tracking-[-.02em]">{preferencesMode ? "Cookie preferences" : "Cookies on LoadLink"}</h2>
          <p className="mt-1 max-w-xl text-[12px] font-semibold leading-5 text-black/58">LoadLink uses cookies to keep your account secure, remember your preferences and improve the platform.</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button type="button" onClick={() => choose("essential")} className="min-h-10 rounded-full border border-black/15 px-4 text-[11px] font-black">Essential only</button>
          <button type="button" onClick={() => choose("all")} className="min-h-10 rounded-full bg-[#f6b800] px-5 text-[11px] font-black text-black">Allow cookies</button>
        </div>
      </div>
    </aside>
  );
}
