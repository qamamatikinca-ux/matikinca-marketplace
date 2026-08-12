"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function AccountSettingsGlassFix() {
  const pathname = usePathname();

  useEffect(() => {
    const active = pathname === "/account/settings";
    document.documentElement.classList.toggle("loadlink-settings-glass", active);
    if (!active) return;

    const applyAccountAccessStyles = () => {
      const headings = Array.from(document.querySelectorAll("h2"));
      const heading = headings.find((node) => node.textContent?.trim().toLowerCase() === "account access");
      const section = heading?.closest("section");
      if (!section) return;

      const buttons = Array.from(section.querySelectorAll("button"));
      for (const button of buttons) {
        const label = button.textContent?.trim().toLowerCase() || "";
        if (label === "sign out") {
          button.classList.remove("border-red-500", "text-red-500");
          button.classList.add("loadlink-account-neutral-action");
        }
        if (label === "request deletion" || label === "request account deletion") {
          button.textContent = "Request account deletion";
          button.classList.add("loadlink-account-danger-action");
        }
      }
    };

    applyAccountAccessStyles();
    const observer = new MutationObserver(applyAccountAccessStyles);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("loadlink-settings-glass");
    };
  }, [pathname]);

  return null;
}
