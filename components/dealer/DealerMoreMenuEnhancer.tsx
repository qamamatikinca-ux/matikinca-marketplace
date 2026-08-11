"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __loadLinkDealerMenuEnhancer?: {
      observer?: MutationObserver;
      style?: HTMLStyleElement;
      scheduled?: number;
    };
  }
}

const ACTIONS: Record<string, string> = {
  "Dealer page": "showroom",
  "Status & updates": "status",
  Customers: "customers",
  Performance: "performance",
  Reviews: "reviews",
  Team: "team",
  Activity: "activity",
  Verification: "verification",
  Billing: "billing",
  Settings: "settings",
  Support: "support",
};

const SECTION_LABELS = new Set(["DEALERSHIP", "SALES", "BUSINESS", "ACCOUNT"]);

function normalize(value: string | null | undefined) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function iconSvg(kind: string) {
  const common = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

  switch (kind) {
    case "showroom":
      return `<svg ${common}><path d="M4 10h16v10H4z"/><path d="m3 10 2-5h14l2 5"/><path d="M8 20v-5h8v5"/></svg>`;
    case "status":
      return `<svg ${common}><path d="M5 5h14v11H9l-4 3z"/><path d="M8 9h8M8 12h5"/><path d="M18.5 4.5h2M19.5 3.5v2"/></svg>`;
    case "customers":
      return `<svg ${common}><path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M3.5 19v-1.5c0-2.6 2.1-4.5 5-4.5s5 1.9 5 4.5V19"/><path d="M16 10a2.5 2.5 0 1 0 0-5"/><path d="M15 13c3.2 0 5.5 1.6 5.5 4V19"/></svg>`;
    case "performance":
      return `<svg ${common}><path d="M5 19V9M10 19V5M15 19v-7M20 19V8"/><path d="m5 8 5-3 5 5 5-4" opacity=".55"/></svg>`;
    case "reviews":
      return `<svg ${common}><path d="m12 4 2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.3l5-.7z"/></svg>`;
    case "team":
      return `<svg ${common}><path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M3.5 19v-1.5c0-2.6 2.3-4.5 5.5-4.5s5.5 1.9 5.5 4.5V19"/><path d="M16.5 8.5a2.5 2.5 0 1 0 0-5"/><path d="M16 12.5c2.9.2 4.5 1.7 4.5 4V19"/></svg>`;
    case "activity":
      return `<svg ${common}><path d="M3 12h4l2.2-5 4 10 2.4-5H21"/></svg>`;
    case "verification":
      return `<svg ${common}><path d="M12 3.5 19 6v5.5c0 4.4-2.7 7.7-7 9-4.3-1.3-7-4.6-7-9V6z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>`;
    case "billing":
      return `<svg ${common}><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 9h16M8 15h4"/></svg>`;
    case "settings":
      return `<svg ${common}><circle cx="12" cy="12" r="3"/><path d="M19 12a7.5 7.5 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.8-1L14.4 3h-4.8l-.4 3.1a7 7 0 0 0-1.8 1L5 6.1 3 9.5 5 11a7.5 7.5 0 0 0 0 2l-2 1.5L5 18l2.4-1.1a7 7 0 0 0 1.8 1l.4 3.1h4.8l.4-3.1a7 7 0 0 0 1.8-1L19 18l2-3.5-2-1.5c.1-.3.1-.7.1-1Z"/></svg>`;
    case "support":
      return `<svg ${common}><path d="M5 13v-2a7 7 0 0 1 14 0v2"/><path d="M5 12H3.5A1.5 1.5 0 0 0 2 13.5v2A1.5 1.5 0 0 0 3.5 17H6v-5Z"/><path d="M19 12h1.5a1.5 1.5 0 0 1 1.5 1.5v2a1.5 1.5 0 0 1-1.5 1.5H18v-5Z"/><path d="M18 17c-.4 2-2 3-4 3h-2"/></svg>`;
    default:
      return `<svg ${common}><path d="M5 12h14M14 7l5 5-5 5"/></svg>`;
  }
}

function parseRgb(value: string) {
  const match = value.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])] as const;
}

function isDarkSurface(element: HTMLElement) {
  let current: HTMLElement | null = element;
  for (let index = 0; index < 5 && current; index += 1) {
    const background = window.getComputedStyle(current).backgroundColor;
    const rgb = parseRgb(background);
    if (rgb) {
      const [r, g, b] = rgb;
      if (r + g + b > 15) return r * 0.299 + g * 0.587 + b * 0.114 < 125;
    }
    current = current.parentElement;
  }
  return document.documentElement.classList.contains("dark");
}

function findPanel() {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("aside,section,div"));
  const candidates = nodes.filter((node) => {
    const text = normalize(node.textContent);
    return (
      text.includes("Dealership tools and settings") &&
      text.includes("Dealer page") &&
      text.includes("Status & updates") &&
      text.includes("Verification") &&
      text.includes("Support")
    );
  });

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    const ar = a.getBoundingClientRect();
    const br = b.getBoundingClientRect();
    const areaA = Math.max(1, ar.width) * Math.max(1, ar.height);
    const areaB = Math.max(1, br.width) * Math.max(1, br.height);
    return areaA - areaB;
  });

  return candidates[0];
}

function decoratePanel() {
  if (!window.location.pathname.startsWith("/dealer")) return;

  const panel = findPanel();
  if (!panel) return;

  panel.setAttribute("data-loadlink-more-modern", "true");
  panel.setAttribute("data-loadlink-more-theme", isDarkSurface(panel) ? "dark" : "light");

  for (const node of Array.from(panel.querySelectorAll<HTMLElement>("*"))) {
    const text = normalize(node.textContent);

    if (SECTION_LABELS.has(text) && node.children.length === 0) {
      node.setAttribute("data-ll-more-section", "true");
    }

    if (text === "More" && node.children.length === 0) {
      node.setAttribute("data-ll-more-title", "true");
    }

    if (text === "Dealership tools and settings" && node.children.length === 0) {
      node.setAttribute("data-ll-more-subtitle", "true");
    }
  }

  const clickables = Array.from(
    panel.querySelectorAll<HTMLElement>("button,a,[role='button']"),
  );

  for (const element of clickables) {
    const label = normalize(element.textContent);
    const kind = ACTIONS[label];

    if (kind) {
      element.setAttribute("data-ll-more-action", kind);
      element.setAttribute("data-ll-more-label", label);

      if (!element.querySelector(":scope > [data-ll-more-icon]")) {
        const icon = document.createElement("span");
        icon.setAttribute("data-ll-more-icon", "true");
        icon.innerHTML = iconSvg(kind);
        element.prepend(icon);
      }

      if (!element.querySelector(":scope > [data-ll-more-arrow]")) {
        const arrow = document.createElement("span");
        arrow.setAttribute("data-ll-more-arrow", "true");
        arrow.innerHTML = iconSvg("arrow");
        element.append(arrow);
      }
      continue;
    }

    const lower = label.toLowerCase();
    const aria = normalize(element.getAttribute("aria-label")).toLowerCase();
    if (label === "×" || label === "✕" || lower === "close" || aria.includes("close")) {
      element.setAttribute("data-ll-more-close", "true");
    }
  }
}

function scheduleDecorate() {
  const state = window.__loadLinkDealerMenuEnhancer;
  if (!state || state.scheduled) return;
  state.scheduled = window.requestAnimationFrame(() => {
    if (window.__loadLinkDealerMenuEnhancer) {
      window.__loadLinkDealerMenuEnhancer.scheduled = undefined;
    }
    decoratePanel();
  });
}

function ensureStyle() {
  const existing = document.getElementById("loadlink-dealer-more-modern-style") as HTMLStyleElement | null;
  if (existing) return existing;

  const style = document.createElement("style");
  style.id = "loadlink-dealer-more-modern-style";
  style.textContent = `
[data-loadlink-more-modern="true"] {
  position: relative;
  overflow: hidden !important;
  border: 1px solid rgba(10,10,10,.09) !important;
  border-radius: 28px !important;
  background: #fff !important;
  box-shadow: 0 24px 70px rgba(0,0,0,.18) !important;
}
[data-loadlink-more-modern="true"]::before {
  content: "";
  position: absolute;
  left: 24px;
  right: 24px;
  top: 0;
  height: 3px;
  border-radius: 0 0 99px 99px;
  background: #f6b800;
  z-index: 3;
}
[data-loadlink-more-modern="true"][data-loadlink-more-theme="dark"] {
  border-color: rgba(255,255,255,.11) !important;
  background: #090909 !important;
  color: #fff !important;
  box-shadow: 0 24px 70px rgba(0,0,0,.5) !important;
}
[data-loadlink-more-modern="true"] [data-ll-more-title="true"] {
  font-size: 18px !important;
  line-height: 1.1 !important;
  font-weight: 900 !important;
  letter-spacing: -.03em !important;
}
[data-loadlink-more-modern="true"] [data-ll-more-subtitle="true"] {
  margin-top: 4px !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  opacity: .45 !important;
}
[data-loadlink-more-modern="true"] [data-ll-more-section="true"] {
  display: block !important;
  margin: 15px 0 8px !important;
  font-size: 9px !important;
  line-height: 1 !important;
  font-weight: 900 !important;
  letter-spacing: .14em !important;
  opacity: .36 !important;
}
[data-loadlink-more-modern="true"] [data-ll-more-action] {
  min-height: 66px !important;
  display: flex !important;
  align-items: center !important;
  gap: 11px !important;
  padding: 11px 13px !important;
  border: 1px solid rgba(10,10,10,.07) !important;
  border-radius: 18px !important;
  background: #f8f7f3 !important;
  color: #0b0b0b !important;
  box-shadow: none !important;
  font-size: 14px !important;
  line-height: 1.15 !important;
  font-weight: 850 !important;
  letter-spacing: -.02em !important;
  text-align: left !important;
  transition: transform .16s ease, border-color .16s ease, background .16s ease !important;
}
[data-loadlink-more-modern="true"][data-loadlink-more-theme="dark"] [data-ll-more-action] {
  border-color: rgba(255,255,255,.09) !important;
  background: rgba(255,255,255,.045) !important;
  color: #fff !important;
}
[data-loadlink-more-modern="true"] [data-ll-more-action]:active {
  transform: scale(.985) !important;
}
[data-loadlink-more-modern="true"] [data-ll-more-action="status"],
[data-loadlink-more-modern="true"] [data-ll-more-action="customers"] {
  border-color: rgba(246,184,0,.22) !important;
}
[data-loadlink-more-modern="true"] [data-ll-more-icon] {
  width: 38px !important;
  height: 38px !important;
  flex: 0 0 38px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  border: 1px solid rgba(246,184,0,.2) !important;
  border-radius: 13px !important;
  background: rgba(246,184,0,.11) !important;
  color: #a77c00 !important;
}
[data-loadlink-more-modern="true"][data-loadlink-more-theme="dark"] [data-ll-more-icon] {
  color: #f6b800 !important;
}
[data-loadlink-more-modern="true"] [data-ll-more-icon] svg {
  width: 18px !important;
  height: 18px !important;
}
[data-loadlink-more-modern="true"] [data-ll-more-arrow] {
  width: 20px !important;
  height: 20px !important;
  margin-left: auto !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  opacity: .28 !important;
}
[data-loadlink-more-modern="true"] [data-ll-more-arrow] svg {
  width: 14px !important;
  height: 14px !important;
}
[data-loadlink-more-modern="true"] [data-ll-more-close="true"] {
  width: 42px !important;
  height: 42px !important;
  min-width: 42px !important;
  border: 1px solid rgba(10,10,10,.1) !important;
  border-radius: 50% !important;
  background: transparent !important;
}
[data-loadlink-more-modern="true"][data-loadlink-more-theme="dark"] [data-ll-more-close="true"] {
  border-color: rgba(255,255,255,.14) !important;
  color: #fff !important;
}
@media (max-width: 640px) {
  [data-loadlink-more-modern="true"] {
    border-radius: 26px 26px 20px 20px !important;
  }
  [data-loadlink-more-modern="true"] [data-ll-more-action] {
    min-height: 62px !important;
    padding: 10px 11px !important;
    font-size: 13px !important;
  }
  [data-loadlink-more-modern="true"] [data-ll-more-icon] {
    width: 36px !important;
    height: 36px !important;
    flex-basis: 36px !important;
  }
}
`;
  document.head.appendChild(style);
  return style;
}

export default function DealerMoreMenuEnhancer() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!window.__loadLinkDealerMenuEnhancer) {
      window.__loadLinkDealerMenuEnhancer = {};
    }

    const state = window.__loadLinkDealerMenuEnhancer;
    state.style = ensureStyle();

    if (!state.observer) {
      state.observer = new MutationObserver(scheduleDecorate);
      state.observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "data-theme"],
      });
    }

    scheduleDecorate();
  }, []);

  return null;
}
