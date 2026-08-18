"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const LoadLinkCallLayer = lazy(() => import("@/components/LoadLinkCallLayer"));

export default function LoadLinkCallBootstrap() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (!standalone && pathname !== "/messages") { setEnabled(false); return; }
    const start = () => setEnabled(true);
    if ("requestIdleCallback" in window) {
      const id = (window as Window & { requestIdleCallback: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number; cancelIdleCallback: (id: number) => void }).requestIdleCallback(start, { timeout: 1200 });
      return () => (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id);
    }
    const timer = window.setTimeout(start, 300);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return enabled ? <Suspense fallback={null}><LoadLinkCallLayer /></Suspense> : null;
}
