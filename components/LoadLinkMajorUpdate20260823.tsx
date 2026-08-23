"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

const NUMBERISH_NAMES = /(?:amount|budget|price|rate|quantity|count|number|seats|photos|listings|year|mileage|km|kilomet|capacity|ton|weight|days|months|hours|minutes)/i;
const TEXT_FIELD_HINTS = /(?:vehicle\s*(?:or|\/)?\s*(?:unit|service)|unit\s+needed|service\s+required|vehicle\s+needed|contract\s+title|scope|route|location|city|province|address)/i;
const PIN_STORAGE_KEY = "loadlink-pinned-conversations-v1";

function applyInputModes(root: ParentNode = document) {
  root.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
    const hint = `${input.name} ${input.id} ${input.placeholder} ${input.getAttribute("aria-label") || ""}`;
    if (input.dataset.loadlinkTextKeyboard === "true" || input.inputMode === "text" || (input.type === "text" && TEXT_FIELD_HINTS.test(hint))) {
      input.type = "text";
      input.inputMode = "text";
      input.removeAttribute("pattern");
      delete input.dataset.loadlinkNumericKeypad;
      input.dataset.loadlinkTextKeyboard = "true";
      return;
    }
    if (input.type === "number") {
      input.inputMode = input.step && input.step !== "1" ? "decimal" : "numeric";
      if (input.inputMode === "numeric") input.setAttribute("pattern", "[0-9]*");
      input.dataset.loadlinkNumericKeypad = "true";
      return;
    }
    if (input.type === "text" && NUMBERISH_NAMES.test(hint) && !/rate|price|amount|budget/i.test(hint)) {
      input.inputMode = "numeric";
      input.setAttribute("pattern", "[0-9]*");
      input.dataset.loadlinkNumericKeypad = "true";
    }
  });
}

function applyRoutingRepairs(root: ParentNode = document) {
  root.querySelectorAll<HTMLAnchorElement>('a[href="/jobs/list?mode=contract"],a[href="/jobs/list?type=contract"]').forEach((anchor) => {
    anchor.href = "/contracts/post";
    anchor.dataset.loadlinkContractPostLink = "true";
  });
}

function readPinnedThreads() {
  try {
    const value = JSON.parse(localStorage.getItem(PIN_STORAGE_KEY) || "[]");
    return new Set(Array.isArray(value) ? value.map(String) : []);
  } catch {
    return new Set<string>();
  }
}

function pinIcon() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14.5 4.5 5 5-3 1.25-3.25 3.25.75 3-1.5 1.5-3.25-3.25L5 19.5l-.5-.5 3.75-4.25L5 11.5 6.5 10l3 .75 3.25-3.25 1.75-3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
}

function applyConversationPin(panel: HTMLElement) {
  if (panel.querySelector("[data-loadlink-pin-chat]")) return;
  const thread = new URL(window.location.href).searchParams.get("thread") || new URL(window.location.href).searchParams.get("conversation");
  if (!thread) return;
  const content = panel.querySelector<HTMLElement>(".min-h-0.flex-1.overflow-y-auto") || panel.querySelector<HTMLElement>("div");
  if (!content) return;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.loadlinkPinChat = "true";
  button.className = "loadlink-pin-chat";
  const render = () => {
    const pinned = readPinnedThreads().has(thread);
    button.dataset.pinned = pinned ? "true" : "false";
    button.innerHTML = `${pinIcon()}<span>${pinned ? "Pinned chat" : "Pin chat"}</span>`;
    button.setAttribute("aria-pressed", String(pinned));
  };
  button.addEventListener("click", () => {
    const pinned = readPinnedThreads();
    if (pinned.has(thread)) pinned.delete(thread); else pinned.add(thread);
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(Array.from(pinned)));
    render();
    window.dispatchEvent(new CustomEvent("loadlink:pins-changed", { detail: { conversationId: thread, pinned: pinned.has(thread) } }));
    window.dispatchEvent(new CustomEvent("loadlink:toast", { detail: { kind: "success", title: pinned.has(thread) ? "Chat pinned" : "Chat unpinned", message: pinned.has(thread) ? "This conversation is pinned on this device." : "This conversation was removed from pinned chats.", duration: 2600 } }));
  });
  render();
  content.prepend(button);
}

function applyMessageUiHooks() {
  if (!window.location.pathname.startsWith("/messages")) return;
  document.querySelectorAll<HTMLElement>('[aria-label="Conversation details"]').forEach((node) => {
    node.dataset.loadlinkConversationInfoTrigger = "true";
  });
  document.querySelectorAll<HTMLElement>('[role="dialog"][aria-label="Conversation details"]').forEach((node) => {
    node.dataset.loadlinkConversationInfoPanel = "true";
    applyConversationPin(node);
  });
}

function applyImageReliability(root: ParentNode = document) {
  root.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    image.decoding = "async";
    image.draggable = false;
    if (image.closest("[data-loadlink-call-active],[data-loadlink-dealer-update-rail],.loadlink-chat-header")) {
      image.loading = "eager";
      image.fetchPriority = "high";
    }
    if (!image.dataset.loadlinkImageGuard) {
      image.dataset.loadlinkImageGuard = "true";
      image.addEventListener("error", () => {
        image.dataset.loadlinkImageFailed = "true";
        image.removeAttribute("srcset");
      }, { once: true });
    }
  });
}

export default function LoadLinkMajorUpdate20260823() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash) window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
    document.documentElement.dataset.loadlinkRoute = pathname.replace(/^\//, "") || "home";
    document.body.dataset.loadlinkRoute = pathname.replace(/^\//, "") || "home";
    applyInputModes();
    applyRoutingRepairs();
    applyMessageUiHooks();
    applyImageReliability();
  }, [pathname]);

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const setAuth = (signedIn: boolean) => {
      if (!active) return;
      const value = signedIn ? "signed-in" : "signed-out";
      document.documentElement.dataset.loadlinkAuth = value;
      document.body.dataset.loadlinkAuth = value;
    };

    if (!isSupabaseConfigured) {
      setAuth(false);
    } else {
      void supabase.auth.getSession().then(({ data }) => setAuth(Boolean(data.session?.user)));
      const listener = supabase.auth.onAuthStateChange((_event, session) => setAuth(Boolean(session?.user)));
      subscription = listener.data.subscription;
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          applyInputModes(node);
          applyRoutingRepairs(node);
          applyImageReliability(node);
        });
      }
      applyMessageUiHooks();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const themeSync = () => {
      const dark = document.documentElement.classList.contains("dark") || document.documentElement.dataset.loadlinkTheme === "dark";
      document.body.dataset.loadlinkThemeResolved = dark ? "dark" : "light";
    };
    themeSync();
    const themeObserver = new MutationObserver(themeSync);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-loadlink-theme"] });

    return () => {
      active = false;
      subscription?.unsubscribe();
      observer.disconnect();
      themeObserver.disconnect();
    };
  }, []);

  return null;
}
