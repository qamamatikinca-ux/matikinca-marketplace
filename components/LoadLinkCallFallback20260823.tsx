"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function phoneHref() {
  const link = document.querySelector<HTMLAnchorElement>('.loadlink-chat-header a[href^="tel:"]');
  return link?.getAttribute("href") || "";
}

export default function LoadLinkCallFallback20260823() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname !== "/messages") return;
    const apply = () => {
      const chooser = document.querySelector<HTMLElement>('[data-loadlink-call-chooser="true"] > section');
      if (!chooser || chooser.querySelector('[data-loadlink-phone-network="true"]')) return;
      const href = phoneHref();
      if (!href) return;
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.dataset.loadlinkPhoneNetwork = "true";
      anchor.className = "mt-2 flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-white/14 bg-white/[.04] px-4 text-xs font-black text-white/75";
      anchor.textContent = "Use phone network";
      anchor.setAttribute("aria-label", "Call using your phone network");
      anchor.addEventListener("click", (event) => event.stopPropagation());
      chooser.appendChild(anchor);
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}
