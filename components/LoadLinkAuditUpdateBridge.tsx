"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const STYLE_ID = "loadlink-audit-update-bridge-style";

function scrollToToolWorkspace() {
  let attempts = 0;
  const seek = () => {
    const workspace = document.getElementById("tool-workspace");
    if (workspace) {
      workspace.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => {
        const editable = workspace.querySelector<HTMLElement>("input:not([type='hidden']), textarea, select, button");
        editable?.focus({ preventScroll: true });
      }, 520);
      return;
    }
    attempts += 1;
    if (attempts < 12) window.setTimeout(seek, 60);
  };
  window.setTimeout(seek, 0);
}

function styleSinglePageNavigation(nav: HTMLElement) {
  nav.dataset.loadlinkClassicSinglePage = "true";
  nav.dataset.loadlinkPagination = "true";
  nav.setAttribute("aria-label", "Listing pages");
  nav.className = "loadlink-classic-pagination mt-7";
  nav.innerHTML = '<div class="loadlink-classic-pagination__bar"><button type="button" disabled aria-label="Previous page">‹</button><button type="button" class="is-active" aria-current="page" aria-label="Page 1">1</button><button type="button" disabled aria-label="Next page">›</button></div><p>Page 1 of 1</p>';
}

function restoreClassicSinglePageNavigation() {
  const section = document.getElementById("matching-jobs");
  if (!section || !section.querySelector('article[id^="job-"]')) return;
  if (section.querySelector('[data-loadlink-pagination="true"]')) return;

  const legacy = section.querySelector<HTMLElement>('[data-loadlink-single-page="true"]');
  if (legacy) {
    styleSinglePageNavigation(legacy);
    return;
  }

  const nav = document.createElement("nav");
  styleSinglePageNavigation(nav);
  section.appendChild(nav);
}

function tidyMarketplaceCards() {
  document.querySelectorAll<HTMLElement>('article[id^="job-"]').forEach((card) => {
    card.dataset.loadlinkNeatCard = "true";
    const contactHeading = Array.from(card.querySelectorAll<HTMLElement>("p")).find((node) => (node.textContent || "").trim().toLowerCase() === "contact poster");
    if (!contactHeading) return;
    const contactSection = contactHeading.parentElement;
    if (!contactSection || contactSection.dataset.loadlinkGenericProfileRemoved === "true") return;
    contactSection.dataset.loadlinkGenericProfileRemoved = "true";
    // Generic marketplace cards intentionally do not inject profile/account identity blocks.
    // Keep only the contact actions; dealership identity remains on dealership/showroom pages.
    contactSection.style.display = "none";
  });
}

export default function LoadLinkAuditUpdateBridge() {
  const pathname = usePathname();

  useEffect(() => {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
        article[data-loadlink-neat-card="true"] {
          border-radius: 24px !important;
          box-shadow: 0 14px 38px rgba(0,0,0,.055);
        }
        article[data-loadlink-neat-card="true"] > div:first-child {
          border-radius: 23px 23px 0 0;
        }
        article[data-loadlink-neat-card="true"] details {
          border-radius: 16px !important;
          overflow: hidden;
        }
        article[data-loadlink-neat-card="true"] details > summary {
          min-height: 46px;
          display: flex;
          align-items: center;
        }
        article[data-loadlink-neat-card="true"] h3 { text-wrap: balance; }
        .loadlink-classic-pagination { display:flex; flex-direction:column; align-items:center; }
        .loadlink-classic-pagination__bar {
          display:flex; align-items:center; gap:8px; padding:8px;
          border:1px solid rgba(0,0,0,.09); border-radius:16px; background:rgba(255,255,255,.82);
        }
        .loadlink-classic-pagination__bar button {
          height:40px; min-width:40px; padding:0 12px; border:1px solid rgba(0,0,0,.12);
          border-radius:12px; background:white; font-size:12px; font-weight:900;
        }
        .loadlink-classic-pagination__bar button.is-active { background:#f6b800; border-color:#f6b800; color:#000; }
        .loadlink-classic-pagination__bar button:disabled { opacity:.28; }
        .loadlink-classic-pagination > p { margin-top:8px; font-size:10px; font-weight:700; opacity:.38; }
        html.dark .loadlink-classic-pagination__bar,
        [data-loadlink-theme="dark"] .loadlink-classic-pagination__bar { border-color:rgba(255,255,255,.12); background:#0c0c0c; }
        html.dark .loadlink-classic-pagination__bar button,
        [data-loadlink-theme="dark"] .loadlink-classic-pagination__bar button { border-color:rgba(255,255,255,.15); background:#111; color:white; }
        html.dark .loadlink-classic-pagination__bar button.is-active,
        [data-loadlink-theme="dark"] .loadlink-classic-pagination__bar button.is-active { background:#f6b800; border-color:#f6b800; color:#000; }
        @media (max-width: 639px) {
          article[data-loadlink-neat-card="true"] { border-radius:20px !important; }
          article[data-loadlink-neat-card="true"] > div:first-child { border-radius:19px 19px 0 0; }
        }
      `;
      document.head.appendChild(style);
    }

    const scan = () => {
      if (pathname === "/jobs") {
        tidyMarketplaceCards();
        restoreClassicSinglePageNavigation();
      }
    };

    const onClick = (event: MouseEvent) => {
      if (pathname !== "/tools") return;
      const target = event.target instanceof Element ? event.target.closest("button") : null;
      if (!target) return;
      const text = (target.textContent || "").trim();
      if (!text || /^(all|planning|money|operations)$/i.test(text)) return;
      if (target.closest("#tool-workspace")) return;
      scrollToToolWorkspace();
    };

    scan();
    document.addEventListener("click", onClick, true);
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      document.removeEventListener("click", onClick, true);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
