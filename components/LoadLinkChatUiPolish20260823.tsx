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
