"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function iconMarkup() {
  return `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="9" cy="7" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="17" r="2" fill="currentColor"/></svg>`;
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
}

export default function LoadLinkChatUiPolish20260823() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith("/messages")) return;
    decorate();
    const observer = new MutationObserver(decorate);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
