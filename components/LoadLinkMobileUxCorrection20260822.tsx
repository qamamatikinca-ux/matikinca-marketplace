"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function LoadLinkMobileUxCorrection20260822() {
  const pathname = usePathname();

  useEffect(() => {
    function apply() {
      if (pathname === "/") {
        const section = document.querySelector<HTMLElement>("[data-loadlink-home-search-section]");
        if (section) {
          const quickLabel = Array.from(section.querySelectorAll<HTMLElement>("p")).find((node) =>
            (node.textContent || "").trim().toLowerCase() === "quick links",
          );
          const quickBlock = quickLabel?.parentElement;
          if (quickBlock) quickBlock.dataset.loadlinkHiddenLegacyQuickLinks = "true";
        }
      }

      if (pathname.startsWith("/dealership/")) {
        const main = document.querySelector<HTMLElement>("main");
        if (main) main.dataset.loadlinkPublicShowroom = "true";
      }
    }

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
