"use client";

import { useEffect } from "react";

const READY_ATTRIBUTE = "data-loadlink-swipe-dots-ready";
const DOTS_ATTRIBUTE = "data-loadlink-swipe-dots";

type EnhancedRail = HTMLElement & { __loadlinkSwipeCleanup?: () => void };

function contextText(rail: HTMLElement) {
  return (rail.closest("section, article, main, div[data-section]")?.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function shouldEnhance(rail: HTMLElement) {
  if (rail.closest("[data-loadlink-no-swipe-dots='true']")) return false;
  if (rail.getAttribute(DOTS_ATTRIBUTE) === "false") return false;
  if (rail.scrollWidth <= rail.clientWidth + 12) return false;
  if (rail.getAttribute(DOTS_ATTRIBUTE) === "true") return true;
  if (window.location.pathname === "/") {
    const text = contextText(rail);
    return /recent activity|logistics news|industry updates|headlines/.test(text);
  }
  return true;
}

function enhance(rail: EnhancedRail) {
  if (rail.getAttribute(READY_ATTRIBUTE) === "true" || !shouldEnhance(rail)) return;

  const dots = document.createElement("div");
  dots.className = "loadlink-swipe-dots";
  dots.setAttribute("aria-label", "Slider pages");
  Object.assign(dots.style, { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "14px 12px 10px", width: "100%" });

  let buttons: HTMLButtonElement[] = [];
  let frame = 0;

  const pageCount = () => Math.max(1, Math.ceil(rail.scrollWidth / Math.max(1, rail.clientWidth)));

  const paint = (active: number) => {
    buttons.forEach((button, index) => {
      const selected = index === active;
      button.style.width = selected ? "34px" : "9px";
      button.style.background = selected ? "#f6b800" : "rgba(184,137,0,.28)";
      button.setAttribute("aria-current", selected ? "page" : "false");
    });
  };

  const rebuild = () => {
    const count = pageCount();
    dots.replaceChildren();
    buttons = Array.from({ length: count }, (_, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", `Go to slider page ${index + 1}`);
      Object.assign(button.style, { height: "9px", width: "9px", border: "0", padding: "0", borderRadius: "999px", cursor: "pointer", transition: "width 180ms ease, background-color 180ms ease" });
      button.addEventListener("click", () => {
        const max = Math.max(0, rail.scrollWidth - rail.clientWidth);
        const left = count <= 1 ? 0 : (index / (count - 1)) * max;
        rail.scrollTo({ left, behavior: "smooth" });
      });
      dots.appendChild(button);
      return button;
    });
  };

  const update = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const count = pageCount();
      if (count !== buttons.length) rebuild();
      const max = Math.max(0, rail.scrollWidth - rail.clientWidth);
      const active = count <= 1 || max === 0 ? 0 : Math.round((rail.scrollLeft / max) * (count - 1));
      paint(Math.min(count - 1, Math.max(0, active)));
    });
  };

  rebuild();
  rail.insertAdjacentElement("afterend", dots);
  rail.setAttribute(READY_ATTRIBUTE, "true");
  const observer = new ResizeObserver(update);
  observer.observe(rail);
  const mutation = new MutationObserver(update);
  mutation.observe(rail, { childList: true });
  rail.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();

  rail.__loadlinkSwipeCleanup = () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    mutation.disconnect();
    rail.removeEventListener("scroll", update);
    window.removeEventListener("resize", update);
    dots.remove();
    rail.removeAttribute(READY_ATTRIBUTE);
    delete rail.__loadlinkSwipeCleanup;
  };
}

export default function SwipeDotsEnhancer() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scan = () => {
      document.querySelectorAll<EnhancedRail>("[data-loadlink-swipe-dots='true'], .snap-x.overflow-x-auto, .overflow-x-auto.snap-x").forEach(enhance);
      document.querySelectorAll<EnhancedRail>(`[${READY_ATTRIBUTE}='true']`).forEach((rail) => {
        if (!document.body.contains(rail) || !shouldEnhance(rail)) rail.__loadlinkSwipeCleanup?.();
      });
    };
    const schedule = () => { if (timer) clearTimeout(timer); timer = setTimeout(scan, 80); };
    scan();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("popstate", schedule);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("popstate", schedule);
      document.querySelectorAll<EnhancedRail>(`[${READY_ATTRIBUTE}='true']`).forEach((rail) => rail.__loadlinkSwipeCleanup?.());
    };
  }, []);
  return null;
}
