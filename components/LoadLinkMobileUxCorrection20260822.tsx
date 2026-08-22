"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const QUICK_SCOPE: Record<string, string> = {
  jobs: "job",
  contracts: "contract",
  vehicles: "asset",
  "vehicles & units": "asset",
  drivers: "driver",
  dealerships: "dealer",
};

function sortJobSearchTerms() {
  const datalist = document.querySelector<HTMLDataListElement>("#loadlink-job-search-terms");
  if (!datalist || datalist.dataset.loadlinkSorted === "true") return;
  const options = Array.from(datalist.querySelectorAll("option"));
  options
    .sort((a, b) => String(a.value || a.label).localeCompare(String(b.value || b.label), "en-ZA", { sensitivity: "base", numeric: true }))
    .forEach((option) => datalist.appendChild(option));
  datalist.dataset.loadlinkSorted = "true";
}

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

      if (pathname.startsWith("/jobs")) sortJobSearchTerms();
    }

    function onHomeQuickLink(event: MouseEvent) {
      if (pathname !== "/") return;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("button,a") : null;
      if (!target) return;
      const section = target.closest("[data-loadlink-home-search-section]");
      if (!section) return;
      if (target.closest("[data-loadlink-dealer-update-rail]")) return;
      const label = (target.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      const scope = QUICK_SCOPE[label];
      if (!scope) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      window.location.assign(`/quick-links/${scope}`);
    }

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", onHomeQuickLink, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", onHomeQuickLink, true);
    };
  }, [pathname]);

  return null;
}
