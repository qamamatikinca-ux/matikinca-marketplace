"use client";

import { useEffect, useState } from "react";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

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
  const { darkMode } = useLoadLinkTheme();
  const [open, setOpen] = useState(false);
  const [preferencesMode, setPreferencesMode] = useState(false);

  useEffect(() => {
    setOpen(!readStored());
    const showPreferences = () => { setPreferencesMode(true); setOpen(true); };
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
      data-loadlink-cookie-consent="major-20260823"
      role="dialog"
      aria-modal="false"
      aria-labelledby="loadlink-cookie-title"
      className={`fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-[9998] mx-auto max-w-[720px] border px-4 py-4 shadow-[0_24px_80px_rgba(0,0,0,.20)] sm:inset-x-5 sm:px-5 ${darkMode ? "border-white/12 bg-[#101010]/88 text-white" : "border-black/10 bg-white/84 text-black"}`}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${darkMode ? "border-white/12 bg-white/[.05]" : "border-black/10 bg-black/[.025]"}`}><CookieIcon /></span>
          <div>
            <h2 id="loadlink-cookie-title" className="text-[13px] font-black tracking-[-.02em]">{preferencesMode ? "Cookie preferences" : "Cookies on LoadLink"}</h2>
            <p className={`mt-1 max-w-xl text-[11px] font-semibold leading-5 ${darkMode ? "text-white/55" : "text-black/55"}`}>Essential cookies keep sign-in and security working. Optional cookies help LoadLink remember preferences and improve the marketplace.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button type="button" onClick={() => choose("essential")} className={`min-h-10 rounded-full border px-4 text-[10px] font-black ${darkMode ? "border-white/14 bg-white/[.035]" : "border-black/12 bg-black/[.02]"}`}>Essential only</button>
          <button type="button" onClick={() => choose("all")} className="min-h-10 rounded-full bg-[#f6b800] px-5 text-[10px] font-black text-black">Allow cookies</button>
        </div>
      </div>
    </aside>
  );
}

function CookieIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 12.4A8.2 8.2 0 1 1 11.6 4a4.4 4.4 0 0 0 5.6 5.6A4.4 4.4 0 0 0 20 12.4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><circle cx="8" cy="10" r="1" fill="currentColor"/><circle cx="10.5" cy="15" r="1" fill="currentColor"/></svg>;
}
