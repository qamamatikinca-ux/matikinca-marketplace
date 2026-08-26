"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function phoneHref() {
  const direct = document.querySelector<HTMLAnchorElement>('.loadlink-chat-header a[href^="tel:"]');
  if (direct?.getAttribute("href")) return direct.getAttribute("href") || "";
  const anyPhone = document.querySelector<HTMLAnchorElement>('a[href^="tel:"]');
  return anyPhone?.getAttribute("href") || "";
}

function nativeCallButton(href: string) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.dataset.loadlinkPhoneNetwork = "true";
  anchor.className = "mt-2 flex min-h-[48px] w-full items-center justify-center rounded-xl border border-white/14 bg-white/[.035] px-4 text-xs font-black text-white/80";
  anchor.textContent = "Call with phone";
  anchor.setAttribute("aria-label", "Call using your phone network");
  anchor.addEventListener("click", (event) => event.stopPropagation());
  return anchor;
}

export default function LoadLinkCallFallback20260823() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname !== "/messages") return;

    const apply = () => {
      const href = phoneHref();
      if (!href) return;

      const chooser = document.querySelector<HTMLElement>('[data-loadlink-call-chooser="true"] > section');
      if (chooser && !chooser.querySelector('[data-loadlink-phone-network="true"]')) {
        chooser.appendChild(nativeCallButton(href));
      }

      document.querySelectorAll<HTMLElement>("body *").forEach((node) => {
        if (node.children.length || !/call services? (are )?unavailable/i.test(node.textContent || "")) return;
        node.textContent = "Use your phone network to place this call.";
        const shell = node.closest<HTMLElement>('section, [role="dialog"], div');
        if (shell && !shell.querySelector('[data-loadlink-phone-network="true"]')) {
          shell.appendChild(nativeCallButton(href));
        }
      });
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}
