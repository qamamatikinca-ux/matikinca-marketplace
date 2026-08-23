"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import LoadLinkPinnedChatsRail20260823 from "@/components/LoadLinkPinnedChatsRail20260823";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function LoadLinkDealerStatusChatBridge20260823() {
  const pathname = usePathname();
  const { darkMode } = useLoadLinkTheme();
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!pathname.startsWith("/messages")) { setHost(null); return; }
    let active = true;
    const mount = () => {
      const panel = document.querySelector<HTMLElement>(".loadlink-inbox-panel");
      const header = panel?.firstElementChild as HTMLElement | null;
      if (!panel || !header) return;
      let node = panel.querySelector<HTMLElement>(":scope > [data-loadlink-pinned-chat-host]");
      const oldDealerHost = panel.querySelector<HTMLElement>(":scope > [data-loadlink-chat-dealer-status-host]");
      oldDealerHost?.remove();
      if (!node) {
        node = document.createElement("div");
        node.dataset.loadlinkPinnedChatHost = "true";
        node.className = "border-b border-current/10 px-4 pt-3";
        header.insertAdjacentElement("afterend", node);
      }
      if (active) setHost(node);
    };
    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { active = false; observer.disconnect(); };
  }, [pathname]);

  return host ? createPortal(<LoadLinkPinnedChatsRail20260823 darkMode={darkMode} />, host) : null;
}
