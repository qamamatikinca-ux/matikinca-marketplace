"use client";

import { useEffect } from "react";

const READY_ATTRIBUTE = "data-loadlink-swipe-dots-ready";
const DOTS_ATTRIBUTE = "data-loadlink-swipe-dots";

type EnhancedRail = HTMLElement & {
  __loadlinkSwipeCleanup?: () => void;
};

function visibleChildren(rail: HTMLElement) {
  return Array.from(rail.children).filter((child): child is HTMLElement => {
    if (!(child instanceof HTMLElement)) return false;
    const style = window.getComputedStyle(child);
    return style.display !== "none" && style.visibility !== "hidden" && child.getBoundingClientRect().width > 24;
  });
}

function nearestSectionText(rail: HTMLElement) {
  const section = rail.closest("section, article, main, div[data-section]");
  return (section?.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function shouldEnhanceRail(rail: HTMLElement) {
  if (rail.closest("[data-loadlink-no-swipe-dots='true']")) return false;
  if (rail.getAttribute(DOTS_ATTRIBUTE) === "false") return false;

  const children = visibleChildren(rail);
  if (children.length < 2) return false;
  if (rail.scrollWidth <= rail.clientWidth + 12) return false;

  const pathname = window.location.pathname;
  const context = nearestSectionText(rail);

  // The homepage discovery/quick-link rail should stay clean. Only Recent Activity
  // receives an indicator on the homepage.
  if (pathname === "/") {
    if (/quick links|browse by category|find faster|popular searches|marketplace discovery/.test(context)) return false;
    if (!/recent activity|recently posted|recently viewed|south african logistics news|logistics news|engineering news|industry updates|headlines and images/.test(context)) return false;
  }

  const explicit = rail.getAttribute(DOTS_ATTRIBUTE) === "true";
  if (explicit) return true;

  const firstWidths = children.slice(0, 4).map((child) => child.getBoundingClientRect().width);
  const widest = Math.max(...firstWidths, 0);
  return widest >= rail.clientWidth * 0.38;
}

function createDot(active: boolean, index: number) {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", `Go to slide ${index + 1}`);
  button.style.height = "10px";
  button.style.border = "0";
  button.style.padding = "0";
  button.style.borderRadius = "999px";
  button.style.cursor = "pointer";
  button.style.transition = "width 180ms ease, background-color 180ms ease, opacity 180ms ease";
  button.style.width = active ? "48px" : "10px";
  button.style.background = active ? "#f6b800" : "rgba(184,137,0,.28)";
  button.style.opacity = active ? "1" : ".9";
  return button;
}

function enhanceRail(rail: EnhancedRail) {
  if (rail.getAttribute(READY_ATTRIBUTE) === "true" || !shouldEnhanceRail(rail)) return;

  const dots = document.createElement("div");
  dots.className = "loadlink-swipe-dots";
  dots.setAttribute("role", "tablist");
  dots.setAttribute("aria-label", "Swipe position");
  dots.style.display = "flex";
  dots.style.alignItems = "center";
  dots.style.justifyContent = "center";
  dots.style.gap = "16px";
  dots.style.padding = "16px 12px 12px";
  dots.style.width = "100%";

  let children = visibleChildren(rail);
  let buttons: HTMLButtonElement[] = [];
  let frame = 0;

  const buildDots = () => {
    children = visibleChildren(rail);
    dots.replaceChildren();
    buttons = children.map((child, index) => {
      const button = createDot(index === 0, index);
      button.addEventListener("click", () => {
        const left = child.offsetLeft - Math.max(0, (rail.clientWidth - child.clientWidth) / 2);
        rail.scrollTo({ left, behavior: "smooth" });
      });
      dots.appendChild(button);
      return button;
    });
  };

  const update = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      children = visibleChildren(rail);
      if (children.length !== buttons.length) buildDots();
      if (!children.length) return;

      const visibleCenter = rail.scrollLeft + rail.clientWidth / 2;
      let activeIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      children.forEach((child, index) => {
        const childCenter = child.offsetLeft + child.offsetWidth / 2;
        const distance = Math.abs(childCenter - visibleCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          activeIndex = index;
        }
      });

      buttons.forEach((button, index) => {
        const active = index === activeIndex;
        button.style.width = active ? "48px" : "10px";
        button.style.background = active ? "#f6b800" : "rgba(184,137,0,.28)";
        button.setAttribute("aria-selected", active ? "true" : "false");
        button.setAttribute("aria-current", active ? "true" : "false");
      });
    });
  };

  buildDots();
  rail.insertAdjacentElement("afterend", dots);
  rail.setAttribute(READY_ATTRIBUTE, "true");
  rail.style.scrollSnapType = rail.style.scrollSnapType || "x mandatory";

  const resizeObserver = new ResizeObserver(update);
  resizeObserver.observe(rail);
  children.forEach((child) => resizeObserver.observe(child));

  const mutationObserver = new MutationObserver(() => {
    buildDots();
    update();
  });
  mutationObserver.observe(rail, { childList: true, subtree: false });

  rail.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();

  rail.__loadlinkSwipeCleanup = () => {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    rail.removeEventListener("scroll", update);
    window.removeEventListener("resize", update);
    dots.remove();
    rail.removeAttribute(READY_ATTRIBUTE);
    delete rail.__loadlinkSwipeCleanup;
  };
}

export default function SwipeDotsEnhancer() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const scan = () => {
      document
        .querySelectorAll<EnhancedRail>("[data-loadlink-swipe-dots='true'], .snap-x.overflow-x-auto, .overflow-x-auto.snap-x")
        .forEach((rail) => enhanceRail(rail));

      // Remove old indicators that belonged to a section that no longer qualifies.
      document.querySelectorAll<EnhancedRail>(`[${READY_ATTRIBUTE}='true']`).forEach((rail) => {
        if (!document.body.contains(rail) || !shouldEnhanceRail(rail)) rail.__loadlinkSwipeCleanup?.();
      });
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(scan, 80);
    };

    scan();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("load", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("popstate", schedule);

    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
      window.removeEventListener("load", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("popstate", schedule);
      document.querySelectorAll<EnhancedRail>(`[${READY_ATTRIBUTE}='true']`).forEach((rail) => rail.__loadlinkSwipeCleanup?.());
    };
  }, []);

  return null;
}
