"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const LoadLinkCallLayer = lazy(() => import("@/components/LoadLinkCallLayer"));

type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (id: number) => void;
};

export default function LoadLinkCallBootstrap() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);

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
