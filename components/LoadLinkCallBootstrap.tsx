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
    if (pathname !== "/messages") return;
    bridgeMessageThreadForCalls();
    const beforeCallChoice = () => bridgeMessageThreadForCalls();
    document.addEventListener("click", beforeCallChoice, true);
    return () => document.removeEventListener("click", beforeCallChoice, true);
  }, [pathname]);

  useEffect(() => {
    // Keep the lightweight call listener available across LoadLink so an incoming
    // accepted-chat call can ring even when the recipient is browsing another page.
    const start = () => setEnabled(true);
    const idleWindow = window as IdleWindow;
    if (typeof idleWindow.requestIdleCallback === "function") {
      const id = idleWindow.requestIdleCallback(start, { timeout: 900 });
      return () => idleWindow.cancelIdleCallback?.(id);
    }
    const timer = globalThis.setTimeout(start, 220);
    return () => globalThis.clearTimeout(timer);
  }, []);

  return enabled ? <Suspense fallback={null}><LoadLinkCallLayer key={pathname} /></Suspense> : null;
}
