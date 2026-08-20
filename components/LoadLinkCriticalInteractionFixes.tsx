"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const STYLE_ID = "loadlink-critical-interaction-fixes";

function normalise(value: string | null | undefined) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function listingIdFromHref(href: string) {
  try {
    const url = new URL(href, window.location.origin);
    const match = url.pathname.match(/^\/listing\/([^/?#]+)/i);
    return match?.[1] ? decodeURIComponent(match[1]) : "";
  } catch {
    return "";
  }
}

function listingIdFor(element: Element) {
  const article = element.closest<HTMLElement>('article[id^="job-"]');
  if (article?.id) return article.id.replace(/^job-/, "");

  const explicit = element.closest<HTMLElement>("[data-listing-id]")?.dataset.listingId;
  if (explicit) return explicit;

  const ownLink = element.closest<HTMLAnchorElement>('a[href*="/listing/"]');
  const ownLinkId = ownLink ? listingIdFromHref(ownLink.href) : "";
  if (ownLinkId) return ownLinkId;

  const card = element.closest<HTMLElement>("article, li, [data-card], [data-listing-card], button, a");
  const childLink = card?.querySelector<HTMLAnchorElement>('a[href*="/listing/"]');
  const childId = childLink ? listingIdFromHref(childLink.href) : "";
  if (childId) return childId;

  const title = normalise(card?.querySelector("h2,h3")?.textContent).toLowerCase();
  if (!title) return "";
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('article[id^="job-"]'));
  const match = candidates.find((candidate) => normalise(candidate.querySelector("h2,h3")?.textContent).toLowerCase() === title);
  return match?.id.replace(/^job-/, "") || "";
}

function exactListingHref(element: Element) {
  const id = listingIdFor(element);
  return id ? `/listing/${encodeURIComponent(id)}` : "";
}

function makeIcon(kind: "edit" | "trash" | "logout") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "17");
  svg.setAttribute("height", "17");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.9");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.dataset.loadlinkActionIcon = kind;

  if (kind === "edit") {
    svg.innerHTML = '<path d="M5 19h4l10-10-4-4L5 15v4Z"></path><path d="M13.5 6.5l4 4"></path>';
  } else if (kind === "logout") {
    svg.innerHTML = '<path d="M10 5H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H10"></path><path d="M14 8l4 4-4 4M9 12h9"></path>';
  } else {
    svg.innerHTML = '<path d="M5 7h14M9 7V4.5h6V7M7.5 7l.7 12h7.6l.7-12M10 10.5v5M14 10.5v5"></path>';
  }
  return svg;
}

function ensureButtonIcon(button: HTMLButtonElement, kind: "edit" | "trash" | "logout") {
  if (button.querySelector("svg")) return;
  button.prepend(makeIcon(kind));
}

function markOwnerCards() {
  document.querySelectorAll<HTMLElement>('article[id^="job-"]').forEach((article) => {
    const buttons = Array.from(article.querySelectorAll<HTMLButtonElement>("button"));
    const edit = buttons.find((button) => /^edit post$/i.test(normalise(button.textContent)));
    const remove = buttons.find((button) => /^delete post$/i.test(normalise(button.textContent)));
    if (!edit || !remove) return;

    article.dataset.loadlinkOwnerCard = "true";
    ensureButtonIcon(edit, "edit");
    ensureButtonIcon(remove, "trash");
    edit.parentElement?.setAttribute("data-loadlink-owner-actions", "true");

    Array.from(article.querySelectorAll<HTMLElement>("div")).forEach((node) => {
      if (/your listing is being viewed\.?/i.test(normalise(node.textContent)) && node.querySelector("button")) {
        node.dataset.loadlinkOwnerAnalytics = "true";
      }
      const nodeButtons = Array.from(node.querySelectorAll<HTMLButtonElement>(":scope > button"));
      const labels = nodeButtons.map((button) => normalise(button.textContent).toLowerCase());
      if (labels.includes("share") && labels.includes("report")) node.dataset.loadlinkShareReport = "true";
    });

    Array.from(article.querySelectorAll<HTMLDetailsElement>("details")).forEach((details) => {
      if (/view full details/i.test(normalise(details.querySelector("summary")?.textContent))) {
        details.dataset.loadlinkCompactDetails = "true";
      }
    });
  });
}

function markAccountActions() {
  document.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
    const label = normalise(button.textContent).toLowerCase();
    if (label === "sign out") {
      ensureButtonIcon(button, "logout");
      button.dataset.loadlinkAccountAction = "true";
    } else if (label === "request deletion" || label === "request account deletion") {
      ensureButtonIcon(button, "trash");
      button.dataset.loadlinkAccountAction = "true";
    }
  });
}

function markExactPostControls() {
  document.querySelectorAll<HTMLElement>("a,button").forEach((element) => {
    if (!/^view post(?:\s*→)?$/i.test(normalise(element.textContent))) return;
    const href = exactListingHref(element);
    if (!href) return;
    element.dataset.loadlinkExactPost = href;
    if (element instanceof HTMLAnchorElement) element.href = href;
  });

  const sections = Array.from(document.querySelectorAll<HTMLElement>("section"));
  sections.forEach((section) => {
    const heading = normalise(section.querySelector("h1,h2,h3")?.textContent).toLowerCase();
    if (heading !== "promoted listings") return;
    section.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
      const href = exactListingHref(button);
      if (href) button.dataset.loadlinkExactPost = href;
    });
  });
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
article[data-loadlink-owner-card="true"] [data-loadlink-owner-analytics="true"]{margin-top:12px!important;border:1px solid rgba(246,184,0,.25)!important;border-radius:14px!important;background:rgba(246,184,0,.055)!important;padding:10px 12px!important;min-height:44px!important}
article[data-loadlink-owner-card="true"] [data-loadlink-owner-analytics="true"] p{font-size:10px!important;line-height:1.35!important;letter-spacing:.08em!important;color:#9a7300!important}
article[data-loadlink-owner-card="true"] [data-loadlink-owner-analytics="true"] button{min-height:32px!important;border-radius:999px!important;padding:0 12px!important;border-color:rgba(246,184,0,.45)!important;background:transparent!important;font-size:9px!important;letter-spacing:.06em!important}
article[data-loadlink-owner-card="true"] details[data-loadlink-compact-details="true"]{margin-top:12px!important;border-radius:14px!important;overflow:hidden!important}
article[data-loadlink-owner-card="true"] details[data-loadlink-compact-details="true"]>summary{min-height:44px!important;padding:0 14px!important;display:flex!important;align-items:center!important;font-size:11px!important;letter-spacing:.06em!important}
article[data-loadlink-owner-card="true"] [data-loadlink-share-report="true"]{margin-top:12px!important;border-radius:14px!important;overflow:hidden!important}
article[data-loadlink-owner-card="true"] [data-loadlink-share-report="true"]>button{min-height:42px!important;font-size:10px!important;letter-spacing:.05em!important}
article[data-loadlink-owner-card="true"] [data-loadlink-owner-actions="true"]{margin-top:8px!important;gap:8px!important}
article[data-loadlink-owner-card="true"] [data-loadlink-owner-actions="true"]>button{min-height:42px!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;border-radius:14px!important;padding:0 13px!important;font-size:10px!important;letter-spacing:.05em!important;background:transparent!important}
button[data-loadlink-account-action="true"]{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:8px!important}
button[data-loadlink-account-action="true"] svg{display:block!important;flex:none!important}
html[data-loadlink-theme="dark"] article[data-loadlink-owner-card="true"] [data-loadlink-owner-analytics="true"] p{color:#f6b800!important}
`;
  document.head.appendChild(style);
}

function scan() {
  ensureStyles();
  markOwnerCards();
  markAccountActions();
  markExactPostControls();
}

export default function LoadLinkCriticalInteractionFixes() {
  const pathname = usePathname();

  useEffect(() => {
    scan();
    const frame = window.requestAnimationFrame(scan);
    const observer = new MutationObserver(() => window.requestAnimationFrame(scan));
    observer.observe(document.body, { childList: true, subtree: true });

    const click = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("a,button") : null;
      if (!target) return;
      const href = target.dataset.loadlinkExactPost || (/^view post(?:\s*→)?$/i.test(normalise(target.textContent)) ? exactListingHref(target) : "");
      if (!href) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      window.location.assign(href);
    };

    document.addEventListener("click", click, true);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("click", click, true);
    };
  }, [pathname]);

  return null;
}
