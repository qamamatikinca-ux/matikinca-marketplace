"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function DealerPackageDetailsEnhancer() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.includes("packages")) return;

    const apply = () => {
      document.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
        const label = button.textContent?.trim().toLowerCase() || "";
        if (label === "manage dealer" || label === "manage dealer plan") {
          button.dataset.loadlinkManageDealer = "true";
        }
      });
    };

    const click = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>('button[data-loadlink-manage-dealer="true"]');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      window.location.assign("/packages/manage?plan=dealer");
    };

    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", click, true);
    apply();
    return () => {
      observer.disconnect();
      document.removeEventListener("click", click, true);
    };
  }, [pathname]);

  return null;
}
