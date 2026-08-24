"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PIN_KEY = "loadlink-pinned-conversations-v1";
const PIN_META_KEY = "loadlink-pinned-conversation-meta-v1";

type PinMeta = Record<string, { name: string; avatar?: string; savedAt?: string }>;

function iconMarkup() {
  return `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="9" cy="7" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="17" r="2" fill="currentColor"/></svg>`;
}

function pinMarkup() {
  return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 3h6l-.8 5.1 3.3 3.3v1.6H13v7l-1 1-1-1v-7H6.5v-1.6l3.3-3.3L9 3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
}

function readPinIds() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(PIN_KEY) || "[]");
    return Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
  } catch {
    return [] as string[];
  }
}

function readPinMeta(): PinMeta {
  try {
    const raw = JSON.parse(window.localStorage.getItem(PIN_META_KEY) || "{}");
    return raw && typeof raw === "object" ? raw as PinMeta : {};
  } catch {
    return {};
  }
}

function currentThread() {
  const params = new URLSearchParams(window.location.search);
  return params.get("thread") || params.get("conversation") || "";
}

function currentChatIdentity() {
  const header = document.querySelector<HTMLElement>(".loadlink-chat-header");
  if (!header) return null;

  const name = header.querySelector<HTMLElement>("h2")?.textContent?.replace(/\s+/g, " ").trim() || "";
  const avatarHost = header.querySelector<HTMLElement>('[aria-label$=" profile picture"]');
  const image = avatarHost?.querySelector<HTMLImageElement>("img");
  const avatar = image?.currentSrc || image?.src || "";

  if (!name) return null;
  return { name, avatar };
}

function uniqueConversationRow(name: string) {
  if (!name) return null;
  const rows = Array.from(document.querySelectorAll<HTMLButtonElement>(".loadlink-inbox-panel button"));
  const matches = rows.filter((row) => {
    const rowName = row.querySelector<HTMLElement>("strong")?.textContent?.replace(/\s+/g, " ").trim() || "";
    return rowName === name;
  });
  return matches.length === 1 ? matches[0] : null;
}

function repairPinnedProfiles() {
  const ids = readPinIds();
  if (!ids.length) return false;

  const meta = readPinMeta();
  let changed = false;
  const thread = currentThread();
  const current = currentChatIdentity();

  if (thread && ids.includes(thread) && current) {
    const previous = meta[thread] || { name: current.name };
    const next = {
      ...previous,
      name: current.name,
      ...(current.avatar ? { avatar: current.avatar } : {}),
      savedAt: previous.savedAt || new Date().toISOString(),
    };
    if (previous.name !== next.name || (current.avatar && previous.avatar !== current.avatar) || !previous.savedAt) {
      meta[thread] = next;
      changed = true;
    }
  }

  for (const id of ids) {
    const existing = meta[id];
    if (!existing?.name) continue;
    const row = uniqueConversationRow(existing.name);
    if (!row) continue;
    const avatarHost = row.querySelector<HTMLElement>('[aria-label$=" profile picture"]');
    const image = avatarHost?.querySelector<HTMLImageElement>("img");
    const avatar = image?.currentSrc || image?.src || "";
    if (avatar && existing.avatar !== avatar) {
      meta[id] = { ...existing, avatar };
      changed = true;
    }
  }

  if (changed) {
    window.localStorage.setItem(PIN_META_KEY, JSON.stringify(meta));
    window.dispatchEvent(new Event("loadlink-pins-updated"));
  }
  return changed;
}

function syncPinnedEmptyState() {
  const rail = document.querySelector<HTMLElement>('[data-loadlink-pinned-chat-rail="true"]');
  if (!rail) return;
  const ids = readPinIds();
  const current = rail.querySelector<HTMLElement>("[data-loadlink-pin-empty-state]");

  if (ids.length) {
    current?.remove();
    return;
  }

  if (current) return;
  const empty = document.createElement("div");
  empty.dataset.loadlinkPinEmptyState = "true";
  empty.className = "loadlink-pin-empty-state";
  empty.setAttribute("role", "note");
  empty.setAttribute("aria-label", "No pinned chats. Pin a chat for quick access.");
  empty.innerHTML = `<span class="loadlink-pin-empty-icon">${pinMarkup()}</span><span><strong>Pin a chat</strong><small>Keep important conversations within reach.</small></span>`;
  rail.appendChild(empty);
}

function decorate() {
  const trigger = document.querySelector<HTMLButtonElement>('button[aria-label="Conversation details"]');
  if (trigger && !trigger.dataset.loadlinkModernInfo) {
    trigger.dataset.loadlinkModernInfo = "true";
    trigger.innerHTML = iconMarkup();
    trigger.title = "Conversation info";
  }
  document.querySelectorAll<HTMLElement>('[aria-label="Conversation details"]').forEach((node) => {
    if (node === trigger) return;
    if (node.matches('[role="dialog"], section, aside')) node.dataset.loadlinkConversationInfoSheet = "true";
  });

  repairPinnedProfiles();
  syncPinnedEmptyState();
}

const CALL_UI_CSS = `
[data-loadlink-call-chooser="true"],
[data-loadlink-call-incoming="true"] {
  backdrop-filter: blur(22px) saturate(1.08) !important;
  -webkit-backdrop-filter: blur(22px) saturate(1.08) !important;
}

[data-loadlink-call-chooser="true"] section,
[data-loadlink-call-incoming="true"] section {
  border-radius: 28px !important;
  border-width: 1px !important;
  box-shadow: 0 28px 90px rgba(0, 0, 0, .34) !important;
}

[data-loadlink-call-chooser="true"] button,
[data-loadlink-call-incoming="true"] button,
[data-loadlink-call-active="true"] button,
[data-loadlink-call-minimized="true"] button {
  -webkit-tap-highlight-color: transparent;
  transition: transform .16s ease, background-color .16s ease, border-color .16s ease, opacity .16s ease !important;
}

[data-loadlink-call-chooser="true"] button:active,
[data-loadlink-call-incoming="true"] button:active,
[data-loadlink-call-active="true"] button:active,
[data-loadlink-call-minimized="true"] button:active {
  transform: scale(.975);
}

[data-loadlink-call-active="true"] {
  overflow: hidden !important;
}

[data-loadlink-call-active="true"] > section {
  max-width: 510px !important;
  gap: 12px !important;
  padding-left: clamp(16px, 4vw, 28px) !important;
  padding-right: clamp(16px, 4vw, 28px) !important;
}

[data-loadlink-call-active="true"] section > div[class*="flex-1"] {
  min-height: 0 !important;
  margin: 8px 0 2px !important;
  border: 1px solid transparent !important;
  border-radius: 30px !important;
  padding: clamp(28px, 7vh, 56px) 22px !important;
}

[data-loadlink-call-active="true"] [data-loadlink-call-avatar="true"] {
  box-shadow: 0 14px 45px rgba(0, 0, 0, .22), 0 0 0 5px rgba(246, 184, 0, .07) !important;
}

[data-loadlink-call-active="true"] section > div.grid {
  gap: 10px !important;
  padding: 4px 0 !important;
}

[data-loadlink-call-active="true"] section > div.grid > button {
  min-height: 72px !important;
  border-radius: 20px !important;
  font-size: 11px !important;
  letter-spacing: -.01em !important;
}

[data-loadlink-call-active="true"] section > button:last-child {
  min-height: 50px !important;
  width: 168px !important;
  border-radius: 18px !important;
  box-shadow: 0 10px 30px rgba(227, 69, 69, .22) !important;
}

[data-loadlink-call-minimized="true"] {
  border-radius: 20px !important;
  box-shadow: 0 16px 48px rgba(0, 0, 0, .2) !important;
  backdrop-filter: blur(18px) saturate(1.12) !important;
  -webkit-backdrop-filter: blur(18px) saturate(1.12) !important;
}

html[data-loadlink-theme="light"] [data-loadlink-call-chooser="true"],
html[data-loadlink-theme="light"] [data-loadlink-call-incoming="true"] {
  background: rgba(18, 18, 18, .28) !important;
}

html[data-loadlink-theme="light"] [data-loadlink-call-chooser="true"] section,
html[data-loadlink-theme="light"] [data-loadlink-call-incoming="true"] section {
  background: rgba(255, 255, 255, .96) !important;
  border-color: rgba(0, 0, 0, .09) !important;
  color: #111 !important;
}

html[data-loadlink-theme="light"] [data-loadlink-call-chooser="true"] section p,
html[data-loadlink-theme="light"] [data-loadlink-call-incoming="true"] section p {
  color: rgba(17, 17, 17, .52) !important;
}

html[data-loadlink-theme="light"] [data-loadlink-call-chooser="true"] section p[class*="text-xl"] {
  color: #111 !important;
}

html[data-loadlink-theme="light"] [data-loadlink-call-chooser="true"] section p[class*="text-red"],
html[data-loadlink-theme="light"] [data-loadlink-call-incoming="true"] section p[class*="text-red"] {
  color: #b4232d !important;
  background: rgba(180, 35, 45, .06) !important;
}

html[data-loadlink-theme="light"] [data-loadlink-call-chooser="true"] section div > button {
  border-color: rgba(0, 0, 0, .1) !important;
  color: #111 !important;
}

html[data-loadlink-theme="light"] [data-loadlink-call-active="true"] {
  background: radial-gradient(circle at 50% 18%, rgba(246, 184, 0, .12), transparent 35%), #f4f1e9 !important;
  color: #111 !important;
}

html[data-loadlink-theme="light"] [data-loadlink-call-active="true"] section > div:first-child > p,
html[data-loadlink-theme="light"] [data-loadlink-call-active="true"] section > div[class*="flex-1"] > p {
  color: rgba(17, 17, 17, .5) !important;
}

html[data-loadlink-theme="light"] [data-loadlink-call-active="true"] section > div[class*="flex-1"] > p[class*="f6b800"] {
  color: #9a7200 !important;
}

html[data-loadlink-theme="light"] [data-loadlink-call-active="true"] section > div[class*="flex-1"] {
  background: rgba(255, 255, 255, .72) !important;
  border-color: rgba(0, 0, 0, .07) !important;
  box-shadow: 0 18px 55px rgba(44, 36, 20, .07) !important;
}

html[data-loadlink-theme="light"] [data-loadlink-call-active="true"] section > div:first-child > button,
html[data-loadlink-theme="light"] [data-loadlink-call-active="true"] section > div.grid > button {
  background: rgba(255, 255, 255, .86) !important;
  border-color: rgba(0, 0, 0, .1) !important;
  color: #111 !important;
}

html[data-loadlink-theme="light"] [data-loadlink-call-active="true"] section > div.grid > button[class*="bg-[#f6b800]"] {
  background: #f6b800 !important;
  border-color: #f6b800 !important;
  color: #111 !important;
}

html[data-loadlink-theme="dark"] [data-loadlink-call-active="true"],
html.dark [data-loadlink-call-active="true"] {
  background: radial-gradient(circle at 50% 16%, rgba(246, 184, 0, .08), transparent 34%), #050505 !important;
}

html[data-loadlink-theme="dark"] [data-loadlink-call-active="true"] section > div[class*="flex-1"],
html.dark [data-loadlink-call-active="true"] section > div[class*="flex-1"] {
  background: rgba(255, 255, 255, .025) !important;
  border-color: rgba(255, 255, 255, .08) !important;
}

html[data-loadlink-theme="dark"] [data-loadlink-call-active="true"] section > div.grid > button,
html.dark [data-loadlink-call-active="true"] section > div.grid > button {
  background: rgba(255, 255, 255, .045) !important;
  border-color: rgba(255, 255, 255, .11) !important;
}

.loadlink-pin-empty-state {
  margin-top: 9px;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 50px;
  padding: 9px 10px;
  border: 1px dashed currentColor;
  border-color: rgba(0, 0, 0, .12);
  border-radius: 16px;
  background: rgba(0, 0, 0, .018);
}

.loadlink-pin-empty-icon {
  display: flex;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  background: #f6b800;
  color: #111;
}

.loadlink-pin-empty-state strong,
.loadlink-pin-empty-state small {
  display: block;
}

.loadlink-pin-empty-state strong {
  font-size: 11px;
  line-height: 1.2;
  font-weight: 800;
}

.loadlink-pin-empty-state small {
  margin-top: 3px;
  font-size: 9px;
  line-height: 1.3;
  font-weight: 650;
  opacity: .48;
}

html[data-loadlink-theme="dark"] .loadlink-pin-empty-state,
html.dark .loadlink-pin-empty-state {
  border-color: rgba(255, 255, 255, .12);
  background: rgba(255, 255, 255, .025);
}

@media (max-width: 640px) {
  [data-loadlink-call-chooser="true"],
  [data-loadlink-call-incoming="true"] {
    padding: 10px !important;
  }

  [data-loadlink-call-chooser="true"] section,
  [data-loadlink-call-incoming="true"] section {
    border-radius: 24px !important;
  }

  [data-loadlink-call-active="true"] > section {
    padding-top: max(12px, env(safe-area-inset-top)) !important;
  }

  [data-loadlink-call-active="true"] section > div[class*="flex-1"] {
    border-radius: 26px !important;
    padding-top: 28px !important;
    padding-bottom: 28px !important;
  }

  [data-loadlink-call-active="true"] section > div.grid > button {
    min-height: 68px !important;
    border-radius: 18px !important;
  }
}
`;

export default function LoadLinkChatUiPolish20260823() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith("/messages")) return;

    let timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(decorate, 60);
    };

    decorate();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    const onPinsUpdated = () => window.setTimeout(decorate, 40);
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === PIN_KEY || event.key === PIN_META_KEY) schedule();
    };
    const onPinClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-loadlink-pin-chat]") : null;
      if (!target) return;
      window.setTimeout(decorate, 80);
      window.setTimeout(decorate, 220);
    };

    window.addEventListener("loadlink-pins-updated", onPinsUpdated);
    window.addEventListener("storage", onStorage);
    document.addEventListener("click", onPinClick, true);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener("loadlink-pins-updated", onPinsUpdated);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("click", onPinClick, true);
    };
  }, [pathname]);

  return pathname.startsWith("/messages") ? <style>{CALL_UI_CSS}</style> : null;
}
