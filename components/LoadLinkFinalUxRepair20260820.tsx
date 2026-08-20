"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const STYLE_ID = "loadlink-final-ux-repair-20260820";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(node: Element | null | undefined) {
  return String(node?.textContent || "").replace(/\s+/g, " ").trim();
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
/* Chat readability: quotes/replies must remain legible in both themes. */
html[data-loadlink-theme="light"] .loadlink-chat-thread blockquote,
html[data-loadlink-theme="light"] [data-loadlink-chat-quote="true"]{
  color:#111!important;background:rgba(246,184,0,.11)!important;border:1px solid rgba(167,119,0,.24)!important;border-left:3px solid #d89e00!important;border-radius:13px!important;opacity:1!important;
}
html[data-loadlink-theme="dark"] .loadlink-chat-thread blockquote,
html[data-loadlink-theme="dark"] [data-loadlink-chat-quote="true"]{
  color:#fff!important;background:rgba(246,184,0,.10)!important;border:1px solid rgba(246,184,0,.22)!important;border-left:3px solid #f6b800!important;border-radius:13px!important;opacity:1!important;
}
.loadlink-chat-thread blockquote *,[data-loadlink-chat-quote="true"] *{color:inherit!important;opacity:1!important}

/* Keep the composer quiet: yellow is an action accent, not the typing canvas. */
form.loadlink-chat-composer{background:transparent!important;box-shadow:none!important}
form.loadlink-chat-composer:focus-within{background:transparent!important;box-shadow:none!important}
form.loadlink-chat-composer textarea,
form.loadlink-chat-composer [contenteditable="true"]{background:#fff!important;color:#111!important;border:1px solid rgba(0,0,0,.13)!important;outline:none!important;box-shadow:0 8px 24px rgba(0,0,0,.06)!important}
html[data-loadlink-theme="dark"] form.loadlink-chat-composer textarea,
html[data-loadlink-theme="dark"] form.loadlink-chat-composer [contenteditable="true"]{background:#111!important;color:#fff!important;border-color:rgba(255,255,255,.14)!important;box-shadow:0 8px 24px rgba(0,0,0,.24)!important}
form.loadlink-chat-composer textarea:focus,
form.loadlink-chat-composer [contenteditable="true"]:focus{border-color:rgba(246,184,0,.55)!important;box-shadow:0 0 0 3px rgba(246,184,0,.10),0 8px 24px rgba(0,0,0,.06)!important}
button[data-loadlink-tools-launcher="true"]{font-size:0!important;color:#111!important;background:#f3f0e8!important}
button[data-loadlink-tools-launcher="true"] svg{width:21px!important;height:21px!important;display:block!important}
html[data-loadlink-theme="dark"] button[data-loadlink-tools-launcher="true"]{background:#151515!important;color:#f6b800!important;border-color:rgba(255,255,255,.14)!important}

/* Account access: stop destructive action text from exploding/wrapping. */
button[data-loadlink-account-action="true"]{width:100%!important;max-width:100%!important;min-height:54px!important;height:auto!important;padding:12px 18px!important;border-radius:16px!important;font-size:13px!important;line-height:1.15!important;letter-spacing:.035em!important;white-space:normal!important;text-align:center!important;overflow-wrap:normal!important;word-break:normal!important}
button[data-loadlink-danger-action="true"]{color:#d92d2d!important;border:1px solid rgba(217,45,45,.44)!important;background:rgba(217,45,45,.045)!important}
button[data-loadlink-danger-action="true"] svg{width:18px!important;height:18px!important;flex:0 0 auto!important}

/* Edit post: compact, modern sheet rather than a rectangular legacy form. */
[data-loadlink-edit-modal="true"]{width:min(calc(100vw - 24px),620px)!important;max-height:min(88svh,820px)!important;overflow:auto!important;border-radius:30px!important;border:1px solid rgba(246,184,0,.35)!important;padding:22px!important;box-shadow:0 30px 100px rgba(0,0,0,.48)!important}
[data-loadlink-edit-modal="true"] input,[data-loadlink-edit-modal="true"] select,[data-loadlink-edit-modal="true"] textarea{width:100%!important;border-radius:15px!important;border:1px solid rgba(255,255,255,.12)!important;background:#111!important;color:#fff!important;padding:14px 15px!important;font-size:15px!important;line-height:1.35!important;box-shadow:none!important}
[data-loadlink-edit-modal="true"] input,[data-loadlink-edit-modal="true"] select{min-height:52px!important}
[data-loadlink-edit-modal="true"] textarea{min-height:130px!important;resize:vertical!important}
[data-loadlink-edit-modal="true"] button:not([aria-label*="Close"]){border-radius:16px!important;min-height:50px!important;font-weight:850!important}
html[data-loadlink-theme="light"] [data-loadlink-edit-modal="true"]{background:rgba(255,255,255,.98)!important;color:#111!important;border-color:rgba(0,0,0,.10)!important}
html[data-loadlink-theme="light"] [data-loadlink-edit-modal="true"] input,
html[data-loadlink-theme="light"] [data-loadlink-edit-modal="true"] select,
html[data-loadlink-theme="light"] [data-loadlink-edit-modal="true"] textarea{background:#f7f7f5!important;color:#111!important;border-color:rgba(0,0,0,.12)!important}

/* Pro/Dealer analytics: high-density dashboard with softer hierarchy. */
[data-loadlink-analytics-modal="true"]{width:min(calc(100vw - 24px),760px)!important;max-height:90svh!important;overflow:auto!important;border-radius:30px!important;border:1px solid rgba(246,184,0,.28)!important;box-shadow:0 34px 110px rgba(0,0,0,.52)!important}
[data-loadlink-analytics-modal="true"] h1,[data-loadlink-analytics-modal="true"] h2{letter-spacing:-.035em!important}
[data-loadlink-analytics-modal="true"] [data-loadlink-smart-insights="true"]{margin:18px!important;padding:0!important;border:0!important}
.loadlink-smart-insights-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:10px}
.loadlink-smart-insights-kicker{font-size:9px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#f6b800}
.loadlink-smart-insights-title{font-size:18px;font-weight:900;letter-spacing:-.03em}
.loadlink-smart-insights-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.loadlink-smart-insight{min-height:92px;border:1px solid rgba(255,255,255,.10);border-radius:18px;background:rgba(255,255,255,.035);padding:13px}
.loadlink-smart-insight-label{font-size:9px;font-weight:850;letter-spacing:.10em;text-transform:uppercase;color:rgba(255,255,255,.44)}
.loadlink-smart-insight-value{margin-top:7px;font-size:20px;font-weight:900;letter-spacing:-.035em;color:#fff}
.loadlink-smart-insight-note{margin-top:4px;font-size:10px;line-height:1.45;font-weight:650;color:rgba(255,255,255,.45)}
html[data-loadlink-theme="light"] [data-loadlink-analytics-modal="true"]{background:#fff!important;color:#111!important;border-color:rgba(0,0,0,.10)!important}
html[data-loadlink-theme="light"] .loadlink-smart-insight{border-color:rgba(0,0,0,.09);background:rgba(0,0,0,.025)}
html[data-loadlink-theme="light"] .loadlink-smart-insight-label,html[data-loadlink-theme="light"] .loadlink-smart-insight-note{color:rgba(0,0,0,.48)}
html[data-loadlink-theme="light"] .loadlink-smart-insight-value{color:#111}
@media(min-width:640px){.loadlink-smart-insights-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}

/* Logistics tools editor: a selected tool should visibly become the next task. */
.loadlink-logistics-sheet [data-loadlink-auto-edit="true"]{scroll-margin-top:20px!important;scroll-margin-bottom:24px!important}
`;
  document.head.appendChild(style);
}

function replaceComposerGlyph() {
  document.querySelectorAll<HTMLButtonElement>('button[aria-label="Open chat actions"],button[aria-label="Close chat actions"]').forEach((button) => {
    button.dataset.loadlinkToolsLauncher = "true";
    if (button.querySelector('[data-loadlink-logistics-glyph="true"]')) return;
    button.innerHTML = '<svg data-loadlink-logistics-glyph="true" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 7.5h11v8H3v-8Zm11 2.5h3.6L21 13.3v2.2h-7V10Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="7" cy="17.5" r="1.7" stroke="currentColor" stroke-width="1.8"/><circle cx="17.5" cy="17.5" r="1.7" stroke="currentColor" stroke-width="1.8"/><path d="M7 4.5h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  });
}

function markQuotes() {
  document.querySelectorAll<HTMLElement>('.loadlink-chat-thread blockquote,[data-quote],[data-message-quote],[class*="quote" i]').forEach((node) => {
    if (node.closest("form")) return;
    node.dataset.loadlinkChatQuote = "true";
  });
}

function markAccountActions() {
  document.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
    const label = text(button).toLowerCase();
    if (label === "request deletion" || label === "request account deletion") {
      button.dataset.loadlinkAccountAction = "true";
      button.dataset.loadlinkDangerAction = "true";
    }
  });
}

function markModals() {
  document.querySelectorAll<HTMLElement>("h1,h2,h3").forEach((heading) => {
    const label = text(heading).toLowerCase();
    const modal = heading.closest<HTMLElement>('[role="dialog"],section,div.fixed > div,div[class*="modal" i]');
    if (!modal) return;
    if (label === "edit post") modal.dataset.loadlinkEditModal = "true";
    if (label === "listing analytics") {
      modal.dataset.loadlinkAnalyticsModal = "true";
      addSmartAnalytics(modal);
    }
  });
}

function metric(modal: HTMLElement, label: string) {
  const candidates = Array.from(modal.querySelectorAll<HTMLElement>("p,span,div"));
  const exact = candidates.find((node) => text(node).toUpperCase() === label && node.children.length === 0);
  if (!exact) return 0;
  const parentText = text(exact.parentElement);
  const match = parentText.replace(label, "").match(/\b(\d[\d,]*)\b/);
  return match ? Number(match[1].replace(/,/g, "")) : 0;
}

function addSmartAnalytics(modal: HTMLElement) {
  if (modal.querySelector('[data-loadlink-smart-insights="true"]')) return;
  const total = metric(modal, "TOTAL VIEWS");
  const unique = metric(modal, "UNIQUE VIEWERS");
  const uniqueRate = total > 0 ? Math.min(100, Math.round((unique / total) * 100)) : 0;
  const repeats = Math.max(0, total - unique);
  const momentum = total >= 20 ? "Strong" : total >= 5 ? "Building" : total > 0 ? "Early" : "No data";
  const action = total < 5 ? "Share listing" : uniqueRate > 80 ? "Improve conversion" : "Refresh details";
  const note = total < 5 ? "More traffic is needed before judging performance." : "Use this signal together with messages and quote activity.";
  const section = document.createElement("section");
  section.dataset.loadlinkSmartInsights = "true";
  section.innerHTML = `<div class="loadlink-smart-insights-head"><div><p class="loadlink-smart-insights-kicker">Pro / Dealer intelligence</p><h3 class="loadlink-smart-insights-title">Performance signals</h3></div></div><div class="loadlink-smart-insights-grid"><div class="loadlink-smart-insight"><p class="loadlink-smart-insight-label">Unique reach</p><p class="loadlink-smart-insight-value">${uniqueRate}%</p><p class="loadlink-smart-insight-note">Share of views from unique viewers.</p></div><div class="loadlink-smart-insight"><p class="loadlink-smart-insight-label">Repeat interest</p><p class="loadlink-smart-insight-value">${repeats}</p><p class="loadlink-smart-insight-note">Additional views beyond unique reach.</p></div><div class="loadlink-smart-insight"><p class="loadlink-smart-insight-label">7-day momentum</p><p class="loadlink-smart-insight-value">${momentum}</p><p class="loadlink-smart-insight-note">Current traffic signal from available view data.</p></div><div class="loadlink-smart-insight"><p class="loadlink-smart-insight-label">Recommended action</p><p class="loadlink-smart-insight-value" style="font-size:15px">${action}</p><p class="loadlink-smart-insight-note">${note}</p></div></div>`;
  const firstLargeSection = Array.from(modal.children).find((child) => child instanceof HTMLElement && /views over 7 days/i.test(text(child)));
  if (firstLargeSection) modal.insertBefore(section, firstLargeSection);
  else modal.appendChild(section);
}

function listingId(control: HTMLElement) {
  const explicit = control.closest<HTMLElement>("[data-listing-id]")?.dataset.listingId;
  if (explicit && UUID_RE.test(explicit)) return explicit;
  const href = control instanceof HTMLAnchorElement ? control.getAttribute("href") : control.dataset.loadlinkExactPost;
  const match = String(href || "").match(/\/listing\/([^/?#]+)/i);
  const value = match?.[1] ? decodeURIComponent(match[1]) : "";
  return UUID_RE.test(value) ? value : "";
}

async function validatePromoted() {
  const headings = Array.from(document.querySelectorAll<HTMLElement>("h1,h2,h3,p")).filter((node) => /promoted (?:posts|listings)/i.test(text(node)));
  for (const heading of headings) {
    const section = heading.closest<HTMLElement>("section") || heading.parentElement;
    if (!section) continue;
    const controls = Array.from(section.querySelectorAll<HTMLElement>("a,button")).filter((node) => /^view post(?:\s*→)?$/i.test(text(node)));
    for (const control of controls) {
      if (control.dataset.loadlinkPromotedChecked || control.dataset.loadlinkPromotedChecking) continue;
      const id = listingId(control);
      if (!id) continue;
      control.dataset.loadlinkPromotedChecking = "true";
      const { data, error } = await supabase.rpc("loadlink_listing_public_state", { p_listing_id: id });
      delete control.dataset.loadlinkPromotedChecking;
      if (error) continue;
      const state = String((data as { state?: string } | null)?.state || "unavailable");
      if (state !== "active") {
        const card = control.closest<HTMLElement>('article,[data-listing-card],[data-listing-id],li');
        if (card) card.remove();
        else control.remove();
        continue;
      }
      const href = `/listing/${encodeURIComponent(id)}`;
      control.dataset.loadlinkPromotedChecked = "true";
      control.dataset.loadlinkExactPost = href;
      if (control instanceof HTMLAnchorElement) control.href = href;
    }
  }
}

function scan() {
  ensureStyles();
  replaceComposerGlyph();
  markQuotes();
  markAccountActions();
  markModals();
  void validatePromoted();
}

export default function LoadLinkFinalUxRepair20260820() {
  const pathname = usePathname();
  useEffect(() => {
    scan();
    const observer = new MutationObserver(() => window.requestAnimationFrame(scan));
    observer.observe(document.body, { childList: true, subtree: true });

    const click = (event: MouseEvent) => {
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
        } else {
          activeSheet.scrollTo({ top: activeSheet.scrollHeight, behavior: "smooth" });
        }
      }, 90);
    };
    document.addEventListener("click", click, true);
    return () => { observer.disconnect(); document.removeEventListener("click", click, true); };
  }, [pathname]);
  return null;
}
