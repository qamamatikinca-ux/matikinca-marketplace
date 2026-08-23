"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

const NUMBERISH_NAMES = /(?:amount|budget|price|rate|quantity|count|number|seats|photos|listings|year|mileage|km|kilomet|capacity|ton|weight|days|months|hours|minutes)/i;

function applyInputModes(root: ParentNode = document) {
  root.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
    if (input.type === "number") {
      input.inputMode = input.step && input.step !== "1" ? "decimal" : "numeric";
      if (input.inputMode === "numeric") input.setAttribute("pattern", "[0-9]*");
      input.dataset.loadlinkNumericKeypad = "true";
      return;
    }
    const hint = `${input.name} ${input.id} ${input.placeholder} ${input.getAttribute("aria-label") || ""}`;
    if (input.type === "text" && NUMBERISH_NAMES.test(hint) && !/rate|price|amount|budget/i.test(hint)) {
      input.inputMode = "numeric";
      input.setAttribute("pattern", "[0-9]*");
      input.dataset.loadlinkNumericKeypad = "true";
    }
  });
}

function applyMessageUiHooks() {
  if (!window.location.pathname.startsWith("/messages")) return;
  document.querySelectorAll<HTMLElement>('[aria-label="Conversation details"]').forEach((node) => {
    node.dataset.loadlinkConversationInfoTrigger = "true";
  });
  document.querySelectorAll<HTMLElement>('[role="dialog"][aria-label="Conversation details"]').forEach((node) => {
    node.dataset.loadlinkConversationInfoPanel = "true";
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
