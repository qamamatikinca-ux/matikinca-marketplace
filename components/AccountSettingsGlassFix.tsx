"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const STYLE_ID = "loadlink-account-access-compact";

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
[data-loadlink-account-access="true"] [data-loadlink-account-actions="true"]{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;margin-top:16px!important}
[data-loadlink-account-access="true"] button[data-loadlink-account-action]{width:100%!important;max-width:none!important;min-width:0!important;height:42px!important;min-height:42px!important;padding:0 12px!important;border-radius:13px!important;font-size:11px!important;line-height:1!important;letter-spacing:.025em!important;white-space:nowrap!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;box-shadow:none!important}
[data-loadlink-account-access="true"] button[data-loadlink-account-action] svg{width:17px!important;height:17px!important;display:block!important;flex:none!important}
[data-loadlink-account-access="true"] .loadlink-account-neutral-action{border:1px solid rgba(0,0,0,.14)!important;background:rgba(255,255,255,.24)!important;color:inherit!important}
[data-loadlink-account-access="true"] .loadlink-account-danger-action{border:1px solid rgba(220,38,38,.38)!important;background:rgba(220,38,38,.035)!important;color:#dc2626!important}
html[data-loadlink-theme="dark"] [data-loadlink-account-access="true"] .loadlink-account-neutral-action{border-color:rgba(255,255,255,.14)!important;background:rgba(255,255,255,.035)!important}
@media(max-width:420px){[data-loadlink-account-access="true"] button[data-loadlink-account-action]{font-size:10px!important;padding:0 9px!important;gap:5px!important}}
`;
  document.head.appendChild(style);
}

function applyAccountAccessStyles() {
  const headings = Array.from(document.querySelectorAll("h2"));
  const heading = headings.find((node) => node.textContent?.trim().toLowerCase() === "account access");
  const section = heading?.closest("section");
  if (!section) return false;

  section.setAttribute("data-loadlink-account-access", "true");
  const buttons = Array.from(section.querySelectorAll("button"));
  const actions = buttons[0]?.parentElement;
  if (actions) actions.setAttribute("data-loadlink-account-actions", "true");

  for (const button of buttons) {
    const label = button.textContent?.trim().toLowerCase() || "";
    if (label === "sign out") {
      button.classList.remove("border-red-500", "text-red-500", "loadlink-account-danger-action");
      button.classList.add("loadlink-account-neutral-action");
      button.setAttribute("data-loadlink-account-action", "signout");
    }
    if (label === "request deletion" || label === "request account deletion") {
      button.textContent = "Request deletion";
      button.classList.remove("loadlink-account-neutral-action");
      button.classList.add("loadlink-account-danger-action");
      button.setAttribute("data-loadlink-account-action", "delete");
    }
  }

  return true;
}

export default function AccountSettingsGlassFix() {
  const pathname = usePathname();

  useEffect(() => {
    const active = pathname === "/account/settings";
    document.documentElement.classList.toggle("loadlink-settings-glass", active);
    if (!active) return;

    ensureStyles();
    if (applyAccountAccessStyles()) return;

    const root = document.querySelector("main") || document.body;
    const observer = new MutationObserver(() => {
      if (applyAccountAccessStyles()) observer.disconnect();
    });
    observer.observe(root, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => observer.disconnect(), 2500);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
      document.documentElement.classList.remove("loadlink-settings-glass");
    };
  }, [pathname]);

  return null;
}
