"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const CAREERS_BUTTON_ID = "loadlink-home-careers-tab";
const CAREERS_PORTAL_ID = "loadlink-home-careers-portal";

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
      if (cancelled) return;
      const section = document.querySelector<HTMLElement>("[data-loadlink-home-search-section]");
      const tabRow = section?.querySelector<HTMLDivElement>(".no-scrollbar > .flex");
      if (!tabRow) return;

      const buttons = Array.from(tabRow.querySelectorAll<HTMLButtonElement>("button"));
      const contracts = buttons.find((button) => button.textContent?.trim() === "Contracts");
      const reference = contracts || buttons.find((button) => button.textContent?.trim() === "Jobs") || buttons[0];
      if (!reference) return;

      let careers = document.getElementById(CAREERS_BUTTON_ID) as HTMLButtonElement | null;
      if (!careers) {
        careers = document.createElement("button");
        careers.id = CAREERS_BUTTON_ID;
        careers.type = "button";
        careers.textContent = "Careers";
        careers.setAttribute("aria-label", "Open LoadLink Careers");
        careers.addEventListener("click", goCareers, true);
        if (contracts) contracts.insertAdjacentElement("afterend", careers);
        else tabRow.appendChild(careers);
      }

      careers.className = reference.className;
      careers.removeAttribute("aria-current");
    }

    function applyCareersPortal() {
      if (cancelled) return;

      const contractPortal = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href="/contracts"]'))
        .find((link) => link.querySelector("h2")?.textContent?.trim() === "Find Contracts");
      if (!contractPortal) return;

      let careersPortal = document.getElementById(CAREERS_PORTAL_ID) as HTMLAnchorElement | null;
      if (!careersPortal) {
        careersPortal = contractPortal.cloneNode(true) as HTMLAnchorElement;
        careersPortal.id = CAREERS_PORTAL_ID;
        careersPortal.href = "/careers";
        careersPortal.setAttribute("aria-label", "Open LoadLink Careers");

        const image = careersPortal.querySelector<HTMLImageElement>("img");
        if (image) {
          image.src = "/images/loadlink-careers-hero-hd.webp";
          image.alt = "Careers";
          image.style.objectPosition = "center center";
          image.loading = "eager";
          image.decoding = "async";
        }

        const title = careersPortal.querySelector<HTMLElement>("h2");
        if (title) title.textContent = "Careers";

        const button = title?.parentElement?.querySelector<HTMLElement>("div.mt-6");
        if (button) button.textContent = "Find logistics careers";

        contractPortal.insertAdjacentElement("afterend", careersPortal);
      }

      careersPortal.className = contractPortal.className;
    }

    function apply() {
      applyCareersNavigation();
      applyCareersPortal();
    }

    apply();
    observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      observer?.disconnect();

      const careers = document.getElementById(CAREERS_BUTTON_ID);
      careers?.removeEventListener("click", goCareers, true);
      careers?.remove();

      document.getElementById(CAREERS_PORTAL_ID)?.remove();
    };
  }, [pathname, router]);

  return null;
}
