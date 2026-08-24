"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import LoadLinkDealerUpdateRail20260822 from "@/components/LoadLinkDealerUpdateRail20260822";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

export default function LoadLinkFollowedStatusBridge20260823() {
  const pathname = usePathname();
  const { darkMode } = useLoadLinkTheme();
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (pathname !== "/following") { setHost(null); return; }
    let alive = true;
    const mount = () => {
      if (!alive) return;
      const main = document.querySelector<HTMLElement>("main");
      if (!main) return;
      let node = main.querySelector<HTMLElement>('[data-loadlink-followed-status-host="true"]');
      if (!node) {
        node = document.createElement("div");
        node.dataset.loadlinkFollowedStatusHost = "true";
        const header = main.querySelector<HTMLElement>("header");
        if (header) header.insertAdjacentElement("afterend", node);
        else main.prepend(node);
      }
      setHost(node);
    };
    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      alive = false;
      observer.disconnect();
      setHost((current) => { current?.remove(); return null; });
    };
  }, [pathname]);

  if (!host) return null;
  return createPortal(
    <section className={`border-b px-4 py-4 ${darkMode ? "border-white/10 bg-white/[.025]" : "border-black/8 bg-white/55"}`}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black">Following</h2>
            <p className="mt-0.5 text-[10px] font-semibold opacity-45">Dealerships stay here after a status expires · live updates are highlighted</p>
          </div>
        </div>
        <LoadLinkDealerUpdateRail20260822 darkMode={darkMode} />
      </div>
    </section>,
    host,
  );
}
