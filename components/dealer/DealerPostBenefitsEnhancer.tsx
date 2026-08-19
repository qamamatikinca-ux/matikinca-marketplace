"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const BENEFIT_SELECTOR = "[data-loadlink-dealer-benefits='true']";

function removeInjectedBenefits(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(BENEFIT_SELECTOR).forEach((node) => node.remove());
}

export default function DealerPostBenefitsEnhancer() {
  const pathname = usePathname();

  useEffect(() => {
    removeInjectedBenefits();

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches(BENEFIT_SELECTOR)) node.remove();
          else removeInjectedBenefits(node);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      removeInjectedBenefits();
    };
  }, [pathname]);

  return null;
}
