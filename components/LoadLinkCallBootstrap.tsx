"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const LoadLinkCallLayer = lazy(() => import("@/components/LoadLinkCallLayer"));

type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (id: number) => void;
};

function bridgeMessageThreadForCalls() {
  if (window.location.pathname !== "/messages") return;
  const url = new URL(window.location.href);
  const thread = url.searchParams.get("thread");
  if (!thread || url.searchParams.get("conversation") === thread) return;
  url.searchParams.set("conversation", thread);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export default function LoadLinkCallBootstrap() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (pathname === "/messages") {
      bridgeMessageThreadForCalls();
      const beforeCallChoice = (event: MouseEvent) => {
        const target = event.target;
        if (!(target instanceof Element) || !target.closest('a[href^="tel:"]')) return;
        bridgeMessageThreadForCalls();
      };
      document.addEventListener("click", beforeCallChoice, true);
      return () => document.removeEventListener("click", beforeCallChoice, true);
    }
  }, [pathname]);

  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (!standalone && pathname !== "/messages") { setEnabled(false); return; }

    const start = () => setEnabled(true);
    const idleWindow = window as IdleWindow;
    if (typeof idleWindow.requestIdleCallback === "function") {
      const id = idleWindow.requestIdleCallback(start, { timeout: 1200 });
      return () => idleWindow.cancelIdleCallback?.(id);
    }

    const timer = globalThis.setTimeout(start, 300);
    return () => globalThis.clearTimeout(timer);
  }, [pathname]);

  return enabled ? <Suspense fallback={null}><LoadLinkCallLayer /></Suspense> : null;
}
