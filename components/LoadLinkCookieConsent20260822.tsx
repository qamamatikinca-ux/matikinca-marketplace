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

function CookieIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 13.2A8 8 0 1 1 10.8 4a4.2 4.2 0 0 0 5.1 5.1A4.2 4.2 0 0 0 20 13.2Z" stroke="currentColor" strokeWidth="1.8"/><circle cx="8.2" cy="13" r="1" fill="currentColor"/><circle cx="12.2" cy="16.4" r="1" fill="currentColor"/><circle cx="6.8" cy="8.6" r="1" fill="currentColor"/></svg>;
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

  const border = darkMode ? "border-white/12" : "border-black/10";
  const muted = darkMode ? "text-white/55" : "text-black/55";

  return (
    <aside
      data-loadlink-cookie-consent="major-20260823"
      role="dialog"
      aria-modal="false"
      aria-labelledby="loadlink-cookie-title"
      className={`fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-[9998] mx-auto max-w-[680px] rounded-[24px] border p-3.5 shadow-[0_24px_70px_rgba(0,0,0,.22)] sm:inset-x-5 sm:p-4 ${border}`}
    >
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${border}`}><CookieIcon /></span>
        <div className="min-w-0 flex-1">
          <h2 id="loadlink-cookie-title" className="text-[14px] font-black tracking-[-.02em]">{preferencesMode ? "Cookie preferences" : "Your LoadLink preferences"}</h2>
          <p className={`mt-1 max-w-xl text-[11px] font-semibold leading-5 ${muted}`}>Essential cookies keep your account and preferences working. Optional cookies help LoadLink understand and improve the marketplace.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => choose("essential")} className={`min-h-10 rounded-full border px-4 text-[10px] font-black ${border}`}>Essential only</button>
            <button type="button" onClick={() => choose("all")} className="min-h-10 rounded-full bg-[#f6b800] px-4 text-[10px] font-black text-black">Allow cookies</button>
          </div>
        </div>
      </div>
    </aside>
  );
}
