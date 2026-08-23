"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const NUMERIC_HINT = /(amount|price|rate|quantity|qty|phone|mobile|year|capacity|distance|weight|ton|kilomet|km|number|count|credit)/i;
const DECIMAL_HINT = /(amount|price|rate|distance|weight|ton|kilomet|km)/i;

function enhanceNode(root: ParentNode = document) {
  root.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
    const hint = [input.name, input.id, input.placeholder, input.getAttribute("aria-label") || ""].join(" ");
    if (input.type === "number" || NUMERIC_HINT.test(hint)) {
      input.inputMode = DECIMAL_HINT.test(hint) ? "decimal" : "numeric";
      if (input.type === "text" && !DECIMAL_HINT.test(hint)) input.setAttribute("pattern", "[0-9]*");
      input.dataset.loadlinkNumericInput = "true";
    }
    if (input.type === "tel") {
      input.inputMode = "tel";
      input.dataset.loadlinkNumericInput = "true";
    }
    if (input.type === "date" || input.type === "datetime-local" || input.type === "time") {
      input.dataset.loadlinkDateControl = "true";
    }
  });

  root.querySelectorAll<HTMLSelectElement>("select").forEach((select) => {
    select.dataset.loadlinkSelectControl = "true";
  });

  root.querySelectorAll<HTMLElement>("button,a").forEach((node) => {
    const text = (node.textContent || "").replace(/\s+/g, " ").trim();
    if (/^cookie preferences$|^cookies$/i.test(text)) node.dataset.loadlinkCookieButton = "true";
    const aria = node.getAttribute("aria-label") || "";
    if (/conversation info|chat info|information/i.test(`${text} ${aria}`)) node.dataset.loadlinkChatInfoTrigger = "true";
  });

  root.querySelectorAll<HTMLElement>("section,aside,dialog,div").forEach((node) => {
    const text = (node.firstElementChild?.textContent || "").replace(/\s+/g, " ").trim();
    if (/^conversation info\b/i.test(text)) node.dataset.loadlinkConversationInfoPanel = "true";
  });

  root.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    image.decoding = "async";
    if (!image.hasAttribute("loading") && !image.closest("header,[data-loadlink-home-portals]")) image.loading = "lazy";
  });
}

export default function LoadLinkMajorUpdate20260823() {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.dataset.loadlinkRoute = pathname || "/";
    if (!pathname.startsWith("/messages")) {
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
    }
  }, [pathname]);

  useEffect(() => {
    let active = true;
    const syncAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      document.documentElement.dataset.loadlinkAuthenticated = data.session?.user ? "true" : "false";
    };
    void syncAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      document.documentElement.dataset.loadlinkAuthenticated = session?.user ? "true" : "false";
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    enhanceNode(document);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) enhanceNode(node);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const onError = (event: Event) => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement)) return;
      image.dataset.loadlinkImageFailed = "true";
      image.closest<HTMLElement>("[data-loadlink-image-shell],article,figure")?.setAttribute("data-loadlink-image-fallback", "true");
    };
    document.addEventListener("error", onError, true);

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("a,button") : null;
      if (!target) return;

      if (target.matches("[data-loadlink-home-portal-card], [data-loadlink-quick-link], a[href^='/quick-links/']")) {
        sessionStorage.setItem("loadlink-force-top", "true");
      }

      const href = target instanceof HTMLAnchorElement ? target.getAttribute("href") || "" : "";
      if (/^\/jobs\/list\?(?:mode|type)=contract(?:&|$)/.test(href)) {
        event.preventDefault();
        window.location.assign("/contracts/post");
        return;
      }

      if (window.location.pathname === "/packages") {
        const text = (target.textContent || "").replace(/\s+/g, " ").trim();
        if (/^manage (dealer|pro)$/i.test(text)) {
          event.preventDefault();
          event.stopPropagation();
          window.location.assign("/packages/manage");
        }
      }
    };
    document.addEventListener("click", onClick, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("error", onError, true);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem("loadlink-force-top") !== "true") return;
    sessionStorage.removeItem("loadlink-force-top");
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  }, [pathname]);

  return null;
}
