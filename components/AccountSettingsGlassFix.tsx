"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function applyAccountAccessStyles() {
  const headings = Array.from(document.querySelectorAll("h2"));
  const heading = headings.find((node) => node.textContent?.trim().toLowerCase() === "account access");
  const section = heading?.closest("section");
  if (!section) return false;

  section.setAttribute("data-loadlink-account-access", "true");
  const buttons = Array.from(section.querySelectorAll("button"));

  for (const button of buttons) {
    const label = button.textContent?.trim().toLowerCase() || "";
    if (label === "sign out") {
      button.classList.remove("border-red-500", "text-red-500", "loadlink-account-danger-action");
      button.classList.add("loadlink-account-neutral-action");
      button.setAttribute("data-loadlink-account-action", "signout");
    }
    if (label === "request deletion" || label === "request account deletion") {
      button.textContent = "Request account deletion";
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

    if (applyAccountAccessStyles()) return;

    // Wait only until the async settings page has rendered, then disconnect.
    // This is intentionally not a permanent whole-page observer.
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
