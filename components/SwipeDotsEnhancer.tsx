"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const READY_ATTRIBUTE = "data-loadlink-swipe-dots-ready";
const DOTS_ATTRIBUTE = "data-loadlink-swipe-dots";

type EnhancedRail = HTMLElement & { __loadlinkSwipeCleanup?: () => void };

function shouldEnhance(rail: HTMLElement) {
  if (rail.closest("[data-loadlink-no-swipe-dots='true']")) return false;
  if (rail.getAttribute(DOTS_ATTRIBUTE) === "false") return false;
  if (rail.scrollWidth <= rail.clientWidth + 12) return false;
  return true;
}

function railItems(rail: HTMLElement) {
  return Array.from(rail.children).filter((child): child is HTMLElement => {
    if (!(child instanceof HTMLElement)) return false;
    if (child.hidden || child.getAttribute("aria-hidden") === "true") return false;
    const style = window.getComputedStyle(child);
    if (style.display === "none" || style.visibility === "hidden") return false;
    return child.getBoundingClientRect().width > 36;
  });
}

function enhance(rail: EnhancedRail) {
  if (rail.getAttribute(READY_ATTRIBUTE) === "true" || !shouldEnhance(rail)) return;

  const dots = document.createElement("div");
  dots.className = "loadlink-swipe-dots";
  dots.setAttribute("aria-label", "Slider items");
  Object.assign(dots.style, {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "14px 12px 10px",
    width: "100%",
  });

  let buttons: HTMLButtonElement[] = [];
  let frame = 0;

  const paint = (active: number) => {
    buttons.forEach((button, index) => {
      const selected = index === active;
      button.style.width = selected ? "34px" : "9px";
      button.style.background = selected ? "#f6b800" : "rgba(184,137,0,.28)";
      button.setAttribute("aria-current", selected ? "true" : "false");
    });
  };

  const scrollToItem = (index: number) => {
    const items = railItems(rail);
    const item = items[index];
    if (!item) return;
    const max = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const centered = item.offsetLeft - Math.max(0, (rail.clientWidth - item.offsetWidth) / 2);
    rail.scrollTo({ left: Math.min(max, Math.max(0, centered)), behavior: "smooth" });
  };

  const rebuild = () => {
    const count = railItems(rail).length;
    dots.replaceChildren();
    buttons = Array.from({ length: count }, (_, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", `Go to item ${index + 1}`);
      Object.assign(button.style, {
        height: "9px",
        width: "9px",
        border: "0",
        padding: "0",
        borderRadius: "999px",
        cursor: "pointer",
        transition: "width 160ms ease, background-color 160ms ease",
      });
      button.addEventListener("click", () => scrollToItem(index));
      dots.appendChild(button);
      return button;
    });
  };

  const update = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const items = railItems(rail);
      if (items.length !== buttons.length) rebuild();
      if (!items.length) return;

      const railCenter = rail.scrollLeft + rail.clientWidth / 2;
      let active = 0;
      let distance = Number.POSITIVE_INFINITY;
      items.forEach((item, index) => {
        const itemCenter = item.offsetLeft + item.offsetWidth / 2;
        const nextDistance = Math.abs(itemCenter - railCenter);
        if (nextDistance < distance) {
          distance = nextDistance;
          active = index;
        }
      });
      paint(active);
    });
  };

  rebuild();
  rail.insertAdjacentElement("afterend", dots);
  rail.setAttribute(READY_ATTRIBUTE, "true");

  const resizeObserver = new ResizeObserver(update);
  resizeObserver.observe(rail);
  const childObserver = new MutationObserver(update);
  childObserver.observe(rail, { childList: true, subtree: false });
  rail.addEventListener("scroll", update, { passive: true });
  update();

  rail.__loadlinkSwipeCleanup = () => {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    childObserver.disconnect();
    rail.removeEventListener("scroll", update);
    dots.remove();
    rail.removeAttribute(READY_ATTRIBUTE);
    delete rail.__loadlinkSwipeCleanup;
  };
}

function scanRails() {
  document
    .querySelectorAll<EnhancedRail>("[data-loadlink-swipe-dots='true'], .snap-x.overflow-x-auto, .overflow-x-auto.snap-x")
    .forEach(enhance);

  document.querySelectorAll<EnhancedRail>(`[${READY_ATTRIBUTE}='true']`).forEach((rail) => {
    if (!document.body.contains(rail) || !shouldEnhance(rail)) rail.__loadlinkSwipeCleanup?.();
  });
}

export default function SwipeDotsEnhancer() {
  const pathname = usePathname();

  useEffect(() => {
    let timer = 0;
    const schedule = (delay = 0) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(scanRails, delay);
    };

    scanRails();
    const frame = window.requestAnimationFrame(scanRails);
    const delayed = window.setTimeout(scanRails, 400);

    const onResize = () => schedule(80);
    const onContent = () => schedule(80);
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("pageshow", onContent);
    window.addEventListener("loadlink:content-updated", onContent);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.clearTimeout(delayed);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pageshow", onContent);
      window.removeEventListener("loadlink:content-updated", onContent);
      document
        .querySelectorAll<EnhancedRail>(`[${READY_ATTRIBUTE}='true']`)
        .forEach((rail) => rail.__loadlinkSwipeCleanup?.());
    };
  }, [pathname]);

  return null;
}
