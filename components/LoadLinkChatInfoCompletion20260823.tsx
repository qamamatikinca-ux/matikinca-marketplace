"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PIN_KEY = "loadlink-pinned-conversations-v1";

function currentThread() {
  const params = new URLSearchParams(window.location.search);
  return params.get("thread") || params.get("conversation") || "";
}

function readPins() {
  try { const value = JSON.parse(localStorage.getItem(PIN_KEY) || "[]"); return new Set(Array.isArray(value) ? value.filter((item) => typeof item === "string") : []); } catch { return new Set<string>(); }
}

function writePins(pins: Set<string>) { try { localStorage.setItem(PIN_KEY, JSON.stringify(Array.from(pins))); } catch {} }

function PinIcon() { return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 3h6l-1 5 4 4v2h-5v7l-1 1-1-1v-7H6v-2l4-4-1-5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`; }

function mountPin(panel: HTMLElement) {
  const thread = currentThread();
  if (!thread) return;
  const content = panel.matches(".loadlink-details-panel") ? panel.firstElementChild as HTMLElement | null : panel.querySelector<HTMLElement>(".min-h-0.flex-1.overflow-y-auto") || panel;
  if (!content || content.querySelector('[data-loadlink-pin-chat="true"]')) return;
  const button = document.createElement("button");
  button.type = "button"; button.dataset.loadlinkPinChat = "true"; button.className = "loadlink-pin-chat";
  const render = () => {
    const pinned = readPins().has(thread);
    button.innerHTML = `${PinIcon()}<span><strong>${pinned ? "Pinned chat" : "Pin chat"}</strong><small>${pinned ? "Keep this conversation easy to find" : "Keep this conversation at hand"}</small></span><i>${pinned ? "Pinned" : "Pin"}</i>`;
    button.setAttribute("aria-pressed", pinned ? "true" : "false");
  };
  button.addEventListener("click", () => {
    const pins = readPins();
    if (pins.has(thread)) pins.delete(thread); else pins.add(thread);
    writePins(pins); render();
    window.dispatchEvent(new CustomEvent("loadlink:toast", { detail: { kind: "success", title: pins.has(thread) ? "Chat pinned" : "Chat unpinned", message: pins.has(thread) ? "This conversation is pinned on this device." : "This conversation is no longer pinned.", duration: 2600 } }));
  });
  render(); content.prepend(button);
}

export default function LoadLinkChatInfoCompletion20260823() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname !== "/messages") return;
    const apply = () => {
      document.querySelectorAll<HTMLElement>('[role="dialog"][aria-label="Conversation details"],.loadlink-details-panel').forEach(mountPin);
      const header = document.querySelector<HTMLElement>(".loadlink-chat-header");
      header?.querySelectorAll<HTMLElement>('a[href^="tel:"],button[aria-label*="call" i]').forEach((node) => { node.dataset.loadlinkCallUiReady = "true"; });
    };
    apply();
    const observer = new MutationObserver(apply); observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("popstate", apply);
    return () => { observer.disconnect(); window.removeEventListener("popstate", apply); };
  }, [pathname]);
  return null;
}
