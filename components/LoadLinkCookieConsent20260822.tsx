"use client";

import Link from "next/link";
import LoadLinkIcon from "@/components/LoadLinkIcon";
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
    const frame = window.requestAnimationFrame(() => setOpen(!readStored()));
    const showPreferences = () => { setPreferencesMode(true); setOpen(true); };
    window.addEventListener("loadlink:open-cookie-preferences", showPreferences);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("loadlink:open-cookie-preferences", showPreferences); };
  }, []);

  function choose(choice: Choice) {
    persist(choice);
    setOpen(false);
    setPreferencesMode(false);
  }

  if (!open) return null;

  return (
    <aside
      data-loadlink-cookie-consent="major-20260826"
      data-loadlink-cookie-panel="true"
      data-theme={darkMode ? "dark" : "light"}
      role="dialog"
      aria-modal="false"
      aria-labelledby="loadlink-cookie-title"
      className={`fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-[9998] mx-auto max-w-[720px] border px-4 py-4 shadow-[0_24px_80px_rgba(0,0,0,.20)] backdrop-blur-xl sm:inset-x-5 sm:px-5 ${darkMode ? "border-white/12 bg-[#101010]/88 text-white" : "border-black/10 bg-white/84 text-black"}`}
    >
      <div className="ll-cookie-layout">
        <div className="flex items-start gap-3">
          <div>
            <h2 id="loadlink-cookie-title" className="pr-9">Cookies on LoadLink</h2>
            <p className="ll-cookie-copy">Essential cookies keep you signed in. Optional cookies are your choice. <Link href="/legal#cookie-policy">Cookie policy</Link>.</p>
          </div>
        </div>
        {preferencesMode ? <button type="button" aria-label="Close cookie settings" onClick={() => setOpen(false)} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-current/15"><LoadLinkIcon name="close" size={16} /></button> : null}
        <div className="ll-cookie-actions">
          <button type="button" onClick={() => choose("essential")}>Essential only</button>
          <button type="button" onClick={() => choose("all")} className="ll-cookie-accept">Allow optional</button>
        </div>
      </div>
    </aside>
  );
}
