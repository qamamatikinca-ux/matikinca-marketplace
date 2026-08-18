"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const EXTRA = [
  "Opening times and dealership business details shown on Dealer posts",
  "Public dealership reviews with professional dealer responses",
  "Dealership logo, location and contact identity across the showroom",
  "Simplified stock, leads, inbox and business-tools workspace",
];

export default function DealerPackageDetailsEnhancer() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname.includes("packages")) return;
    const apply = () => {
      const article = document.querySelector<HTMLElement>("#dealer-package");
      const list = article?.querySelector<HTMLUListElement>("ul");
      if (!list || list.dataset.loadlinkDealerBenefitsExtended) return;
      list.dataset.loadlinkDealerBenefitsExtended = "true";
      EXTRA.forEach((feature) => {
        const item = document.createElement("li");
        item.className = "flex gap-2 text-[11px] font-semibold";
        const dot = document.createElement("span");
        dot.className = "mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f6b800]";
        item.appendChild(dot); item.appendChild(document.createTextNode(feature)); list.appendChild(item);
      });
    };
    const observer = new MutationObserver(apply); observer.observe(document.body, { childList: true, subtree: true }); apply();
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}
