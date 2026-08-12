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
    };

    applyAccountAccessStyles();
    const observer = new MutationObserver(applyAccountAccessStyles);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("loadlink-settings-glass");
    };
  }, [pathname]);

  return (
    <style jsx global>{`
      html.loadlink-settings-glass body { background: #f4efe3; }
      html.loadlink-settings-glass main {
        background-color: #f4efe3 !important;
        background-image:
          radial-gradient(circle at 92% 10%, rgba(246,184,0,.10), transparent 24%),
          radial-gradient(circle at 8% 36%, rgba(255,255,255,.65), transparent 28%) !important;
        background-attachment: fixed !important;
      }
      html.dark.loadlink-settings-glass body { background: #030303; }
      html.dark.loadlink-settings-glass main {
        background-color: #030303 !important;
        background-image:
          radial-gradient(circle at 90% 12%, rgba(246,184,0,.085), transparent 25%),
          radial-gradient(circle at 8% 40%, rgba(255,255,255,.035), transparent 26%) !important;
      }

      html.loadlink-settings-glass main form,
      html.loadlink-settings-glass main aside,
      html.loadlink-settings-glass main section[id="message-privacy"],
      html.loadlink-settings-glass main [data-loadlink-account-access="true"],
      html.loadlink-settings-glass main > section > div[class*="grid"] > section {
        background: rgba(255,255,255,.42) !important;
        border-color: rgba(255,255,255,.72) !important;
        box-shadow: 0 22px 70px rgba(39,30,10,.08) !important;
        -webkit-backdrop-filter: blur(26px) saturate(145%) !important;
        backdrop-filter: blur(26px) saturate(145%) !important;
      }
      html.dark.loadlink-settings-glass main form,
      html.dark.loadlink-settings-glass main aside,
      html.dark.loadlink-settings-glass main section[id="message-privacy"],
      html.dark.loadlink-settings-glass main [data-loadlink-account-access="true"],
      html.dark.loadlink-settings-glass main > section > div[class*="grid"] > section {
        background: rgba(14,14,14,.46) !important;
        border-color: rgba(255,255,255,.13) !important;
        box-shadow: 0 26px 85px rgba(0,0,0,.28) !important;
      }

      html.loadlink-settings-glass main > section > div:nth-of-type(2) {
        background: rgba(255,255,255,.34) !important;
        border-color: rgba(255,255,255,.66) !important;
        -webkit-backdrop-filter: blur(22px) saturate(140%) !important;
        backdrop-filter: blur(22px) saturate(140%) !important;
      }
      html.dark.loadlink-settings-glass main > section > div:nth-of-type(2) {
        background: rgba(13,13,13,.42) !important;
        border-color: rgba(255,255,255,.12) !important;
      }

      html.loadlink-settings-glass main input,
      html.loadlink-settings-glass main select,
      html.loadlink-settings-glass main textarea,
      html.loadlink-settings-glass main [role="switch"] {
        background-color: rgba(255,255,255,.36) !important;
        -webkit-backdrop-filter: blur(14px) !important;
        backdrop-filter: blur(14px) !important;
      }
      html.dark.loadlink-settings-glass main input,
      html.dark.loadlink-settings-glass main select,
      html.dark.loadlink-settings-glass main textarea,
      html.dark.loadlink-settings-glass main [role="switch"] {
        background-color: rgba(255,255,255,.045) !important;
      }

      html.loadlink-settings-glass .loadlink-account-neutral-action {
        border-color: rgba(0,0,0,.16) !important;
        background: rgba(255,255,255,.22) !important;
        color: inherit !important;
      }
      html.dark.loadlink-settings-glass .loadlink-account-neutral-action {
        border-color: rgba(255,255,255,.16) !important;
        background: rgba(255,255,255,.045) !important;
        color: white !important;
      }
      html.loadlink-settings-glass .loadlink-account-danger-action {
        border-color: rgba(220,38,38,.52) !important;
        background: rgba(220,38,38,.055) !important;
        color: rgb(220 38 38) !important;
      }
      html.dark.loadlink-settings-glass .loadlink-account-danger-action {
        border-color: rgba(248,113,113,.48) !important;
        background: rgba(248,113,113,.06) !important;
        color: rgb(252 165 165) !important;
      }
    `}</style>
  );
}
