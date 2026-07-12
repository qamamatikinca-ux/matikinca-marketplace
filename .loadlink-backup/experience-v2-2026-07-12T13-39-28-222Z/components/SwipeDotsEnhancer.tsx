"use client";

import { useEffect } from "react";

const DOTS_ATTRIBUTE = "data-loadlink-swipe-dots";

function isCardRail(element: HTMLElement) {
  const children = Array.from(element.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
  if (children.length < 2 || element.scrollWidth <= element.clientWidth + 8) return false;

  const firstWidths = children.slice(0, 3).map((child) => child.getBoundingClientRect().width);
  const widest = Math.max(...firstWidths, 0);
  return widest >= element.clientWidth * 0.42;
}

function enhanceRail(rail: HTMLElement) {
  if (rail.getAttribute(DOTS_ATTRIBUTE) === "ready" || !isCardRail(rail)) return;

  const children = Array.from(rail.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
  const dots = document.createElement("div");
  dots.className = "loadlink-swipe-dots flex items-center justify-center gap-5 py-4";
  dots.setAttribute("aria-label", "Swipe position");

  const buttons = children.map((child, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `Go to item ${index + 1}`);
    button.className = index === 0
      ? "h-3 w-12 rounded-full bg-[#1596df] transition-all"
      : "h-3 w-3 rounded-full bg-[#cbd5e1] transition-all";
    button.addEventListener("click", () => {
      child.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    });
    dots.appendChild(button);
    return button;
  });

  const update = () => {
    const railLeft = rail.getBoundingClientRect().left;
    let activeIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    children.forEach((child, index) => {
      const distance = Math.abs(child.getBoundingClientRect().left - railLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        activeIndex = index;
      }
    });

    buttons.forEach((button, index) => {
      const active = index === activeIndex;
      button.className = active
        ? "h-3 w-12 rounded-full bg-[#1596df] transition-all"
        : "h-3 w-3 rounded-full bg-[#cbd5e1] transition-all";
      button.setAttribute("aria-current", active ? "true" : "false");
    });
  };

  rail.insertAdjacentElement("afterend", dots);
  rail.setAttribute(DOTS_ATTRIBUTE, "ready");
  rail.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();

  const cleanup = () => {
    rail.removeEventListener("scroll", update);
    window.removeEventListener("resize", update);
    dots.remove();
    rail.removeAttribute(DOTS_ATTRIBUTE);
  };

  rail.dataset.loadlinkSwipeCleanup = "attached";
  Object.assign(rail, { __loadlinkSwipeCleanup: cleanup });
}

type EnhancedRail = HTMLElement & { __loadlinkSwipeCleanup?: () => void };

export default function SwipeDotsEnhancer() {
  useEffect(() => {
    let scanTimer: ReturnType<typeof setTimeout> | null = null;

    const scan = () => {
      document.querySelectorAll<HTMLElement>(".snap-x.overflow-x-auto").forEach(enhanceRail);
    };

    const scheduleScan = () => {
      if (scanTimer) clearTimeout(scanTimer);
      scanTimer = setTimeout(scan, 80);
    };

    scan();
    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("load", scheduleScan);
    window.addEventListener("resize", scheduleScan);

    return () => {
      observer.disconnect();
      if (scanTimer) clearTimeout(scanTimer);
      window.removeEventListener("load", scheduleScan);
      window.removeEventListener("resize", scheduleScan);
      document.querySelectorAll<EnhancedRail>(`[${DOTS_ATTRIBUTE}="ready"]`).forEach((rail) => rail.__loadlinkSwipeCleanup?.());
    };
  }, []);

  return null;
}
