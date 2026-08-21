"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const STYLE_ID = "loadlink-final-ux-repair-20260820";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PublicListingRow = {
  id?: string;
  title?: string;
  city?: string;
};

let publicListingsPromise: Promise<PublicListingRow[]> | null = null;

function text(node: Element | null | undefined) {
  return String(node?.textContent || "").replace(/\s+/g, " ").trim();
}

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
html[data-loadlink-theme="light"] .loadlink-chat-thread blockquote,
html[data-loadlink-theme="light"] [data-loadlink-chat-quote="true"]{color:#111!important;background:rgba(246,184,0,.11)!important;border:1px solid rgba(167,119,0,.24)!important;border-left:3px solid #d89e00!important;border-radius:13px!important;opacity:1!important}
html[data-loadlink-theme="dark"] .loadlink-chat-thread blockquote,
html[data-loadlink-theme="dark"] [data-loadlink-chat-quote="true"]{color:#fff!important;background:rgba(246,184,0,.10)!important;border:1px solid rgba(246,184,0,.22)!important;border-left:3px solid #f6b800!important;border-radius:13px!important;opacity:1!important}
.loadlink-chat-thread blockquote *,[data-loadlink-chat-quote="true"] *{color:inherit!important;opacity:1!important}
form.loadlink-chat-composer{background:transparent!important;box-shadow:none!important}
form.loadlink-chat-composer:focus-within{background:transparent!important;box-shadow:none!important}
form.loadlink-chat-composer textarea,form.loadlink-chat-composer [contenteditable="true"]{background:#fff!important;color:#111!important;border:1px solid rgba(0,0,0,.13)!important;outline:none!important;box-shadow:0 8px 24px rgba(0,0,0,.06)!important}
html[data-loadlink-theme="dark"] form.loadlink-chat-composer textarea,html[data-loadlink-theme="dark"] form.loadlink-chat-composer [contenteditable="true"]{background:#111!important;color:#fff!important;border-color:rgba(255,255,255,.14)!important;box-shadow:0 8px 24px rgba(0,0,0,.24)!important}
form.loadlink-chat-composer textarea:focus,form.loadlink-chat-composer [contenteditable="true"]:focus{border-color:rgba(246,184,0,.55)!important;box-shadow:0 0 0 3px rgba(246,184,0,.10),0 8px 24px rgba(0,0,0,.06)!important}
[data-loadlink-edit-modal="true"]{width:min(calc(100vw - 24px),620px)!important;max-height:min(88svh,820px)!important;overflow:auto!important;border-radius:30px!important;border:1px solid rgba(246,184,0,.35)!important;padding:22px!important;box-shadow:0 30px 100px rgba(0,0,0,.48)!important}
[data-loadlink-edit-modal="true"] input,[data-loadlink-edit-modal="true"] select,[data-loadlink-edit-modal="true"] textarea{width:100%!important;border-radius:15px!important;border:1px solid rgba(255,255,255,.12)!important;background:#111!important;color:#fff!important;padding:14px 15px!important;font-size:15px!important;line-height:1.35!important;box-shadow:none!important}
[data-loadlink-edit-modal="true"] input,[data-loadlink-edit-modal="true"] select{min-height:52px!important}
[data-loadlink-edit-modal="true"] textarea{min-height:130px!important;resize:vertical!important}
[data-loadlink-edit-modal="true"] button:not([aria-label*="Close"]){border-radius:16px!important;min-height:50px!important;font-weight:850!important}
html[data-loadlink-theme="light"] [data-loadlink-edit-modal="true"]{background:rgba(255,255,255,.98)!important;color:#111!important;border-color:rgba(0,0,0,.10)!important}
html[data-loadlink-theme="light"] [data-loadlink-edit-modal="true"] input,html[data-loadlink-theme="light"] [data-loadlink-edit-modal="true"] select,html[data-loadlink-theme="light"] [data-loadlink-edit-modal="true"] textarea{background:#f7f7f5!important;color:#111!important;border-color:rgba(0,0,0,.12)!important}
[data-loadlink-analytics-modal="true"]{width:min(calc(100vw - 24px),760px)!important;max-height:90svh!important;overflow:auto!important;border-radius:30px!important;border:1px solid rgba(246,184,0,.28)!important;box-shadow:0 34px 110px rgba(0,0,0,.52)!important}
.loadlink-logistics-sheet [data-loadlink-auto-edit="true"]{scroll-margin-top:20px!important;scroll-margin-bottom:24px!important}
`;
  document.head.appendChild(style);
}

function markQuotes() {
  document.querySelectorAll<HTMLElement>('.loadlink-chat-thread blockquote,[data-quote],[data-message-quote],[class*="quote" i]').forEach((node) => {
    if (!node.closest("form")) node.dataset.loadlinkChatQuote = "true";
  });
}

function markModals() {
  document.querySelectorAll<HTMLElement>("h1,h2,h3").forEach((heading) => {
    const label = text(heading).toLowerCase();
    const modal = heading.closest<HTMLElement>('[role="dialog"],section,div.fixed > div,div[class*="modal" i]');
    if (!modal) return;
    if (label === "edit post") modal.dataset.loadlinkEditModal = "true";
    if (label === "listing analytics") modal.dataset.loadlinkAnalyticsModal = "true";
  });
}

function fixSearchKeyboards() {
  document.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
    const descriptor = `${input.id} ${input.name} ${input.placeholder} ${input.getAttribute("aria-label") || ""}`.toLowerCase();
    if (!/(search|find|keyword|city|town|province|location)/.test(descriptor)) return;
    if (/(phone|cell|whatsapp|otp|pin|code|postal|price|rate|amount|weight|year|mileage)/.test(descriptor)) return;
    if (["password", "email", "tel", "date", "time", "file"].includes(input.type)) return;
    input.type = "search";
    input.inputMode = "search";
    input.enterKeyHint = "search";
  });
}

async function publicListings() {
  if (!publicListingsPromise) {
    publicListingsPromise = fetch(`/api/job-listings?t=${Date.now()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return [];
        const payload = await response.json() as { rows?: PublicListingRow[] };
        return Array.isArray(payload.rows) ? payload.rows : [];
      })
      .catch(() => []);
  }
  return publicListingsPromise;
}

function idFromHref(value: string) {
  const match = value.match(/\/listing\/([^/?#]+)/i);
  const id = match?.[1] ? decodeURIComponent(match[1]) : "";
  return UUID_RE.test(id) ? id : "";
}

async function bindPromotedPosts() {
  const rows = await publicListings();
  if (!rows.length) return;
  const sections = Array.from(document.querySelectorAll<HTMLElement>("section")).filter((section) => /promoted (?:posts|listings)/i.test(text(section.querySelector("h1,h2,h3"))));

  for (const section of sections) {
    const cards = Array.from(section.querySelectorAll<HTMLElement>(":scope button, :scope a, :scope div > button, :scope div > a")).filter((node) => Boolean(node.querySelector("h2,h3")));
    for (const card of cards) {
      if (card.dataset.loadlinkExactPost) continue;
      const directId = card instanceof HTMLAnchorElement ? idFromHref(card.getAttribute("href") || "") : "";
      const title = normalise(text(card.querySelector("h2,h3")));
      const meta = normalise(text(card.querySelector("p")));
      const matches = directId
        ? rows.filter((row) => row.id === directId)
        : rows.filter((row) => normalise(String(row.title || "")) === title && (!row.city || !meta || meta.includes(normalise(String(row.city)))));
      const row = matches.length === 1 ? matches[0] : rows.find((candidate) => normalise(String(candidate.title || "")) === title);
      const id = String(row?.id || "");
      if (!UUID_RE.test(id)) continue;
      const href = `/listing/${encodeURIComponent(id)}`;
      card.dataset.loadlinkExactPost = href;
      card.dataset.listingId = id;
      if (card instanceof HTMLAnchorElement) card.href = href;
    }
  }
}

function scan() {
  ensureStyles();
  markQuotes();
  markModals();
  fixSearchKeyboards();
  void bindPromotedPosts();
}

export default function LoadLinkFinalUxRepair20260820() {
  const pathname = usePathname();

  useEffect(() => {
    publicListingsPromise = null;
    scan();
    const observer = new MutationObserver(() => window.requestAnimationFrame(scan));
    observer.observe(document.body, { childList: true, subtree: true });

    const click = (event: MouseEvent) => {
      const exact = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-loadlink-exact-post]') : null;
      if (exact?.dataset.loadlinkExactPost) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        window.location.assign(exact.dataset.loadlinkExactPost);
        return;
      }

      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button") : null;
      const sheet = target?.closest<HTMLElement>(".loadlink-logistics-sheet");
      if (!target || !sheet) return;
      const isToolCard = Boolean(target.closest(".grid")) && Boolean(target.querySelector("svg"));
      if (!isToolCard) return;
      window.setTimeout(() => {
        const activeSheet = document.querySelector<HTMLElement>(".loadlink-logistics-sheet");
        if (!activeSheet) return;
        const editable = Array.from(activeSheet.querySelectorAll<HTMLElement>("textarea,input,select")).filter((node) => node.offsetParent !== null).at(-1);
        if (editable) {
          editable.dataset.loadlinkAutoEdit = "true";
          editable.scrollIntoView({ behavior: "smooth", block: "center" });
          editable.focus({ preventScroll: true });
        } else {
          activeSheet.scrollTo({ top: activeSheet.scrollHeight, behavior: "smooth" });
        }
      }, 90);
    };

    document.addEventListener("click", click, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", click, true);
    };
  }, [pathname]);

  return null;
}
