"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import LoadLinkDealerUpdateRail20260822 from "@/components/LoadLinkDealerUpdateRail20260822";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function LoadLinkDealerStatusChatBridge20260823() {
  const pathname = usePathname();
  const { darkMode } = useLoadLinkTheme();
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!pathname.startsWith("/messages")) {
      setHost(null);
      return;
    }
    let active = true;
    const mount = () => {
      const panel = document.querySelector<HTMLElement>(".loadlink-inbox-panel");
      const header = panel?.firstElementChild as HTMLElement | null;
      if (!panel || !header) return;
      let node = panel.querySelector<HTMLElement>(":scope > [data-loadlink-chat-dealer-status-host]");
      if (!node) {
        node = document.createElement("div");
        node.dataset.loadlinkChatDealerStatusHost = "true";
        node.className = "border-b border-current/10 px-4 pt-3";
        header.insertAdjacentElement("afterend", node);
      }
      if (active) setHost(node);
    };
    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [pathname]);

  if (!host) return null;
  return createPortal(<LoadLinkDealerUpdateRail20260822 darkMode={darkMode} />, host);
}
