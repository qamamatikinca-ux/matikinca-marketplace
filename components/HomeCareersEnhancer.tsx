"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const CAREERS_BUTTON_ID = "loadlink-home-careers-tab";

export default function HomeCareersEnhancer() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname !== "/") return;
    let cancelled = false;
    let observer: MutationObserver | null = null;

    const goCareers = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      router.push("/careers");
    };

    function applyCareersNavigation() {
      if (cancelled || document.getElementById(CAREERS_BUTTON_ID)) return;
      const section = document.querySelector<HTMLElement>("[data-loadlink-home-search-section]");
      const tabRow = section?.querySelector<HTMLDivElement>(".no-scrollbar > .flex");
      if (!tabRow) return;

      const buttons = Array.from(tabRow.querySelectorAll<HTMLButtonElement>("button"));
      const contracts = buttons.find((button) => button.textContent?.trim() === "Contracts");
      const reference = contracts || buttons.find((button) => button.textContent?.trim() === "Jobs") || buttons[0];
      if (!reference) return;

      const careers = document.createElement("button");
      careers.id = CAREERS_BUTTON_ID;
      careers.type = "button";
      careers.textContent = "Careers";
      careers.className = reference.className;
      careers.removeAttribute("aria-current");
      careers.setAttribute("aria-label", "Open LoadLink Careers");
      careers.addEventListener("click", goCareers, true);

      if (contracts) contracts.insertAdjacentElement("afterend", careers);
      else tabRow.appendChild(careers);
    }

    applyCareersNavigation();
    observer = new MutationObserver(applyCareersNavigation);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      observer?.disconnect();
      const careers = document.getElementById(CAREERS_BUTTON_ID);
      careers?.removeEventListener("click", goCareers, true);
      careers?.remove();
    };
  }, [pathname, router]);

  return null;
}
