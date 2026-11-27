"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const LoadLinkCallLayer = lazy(() => import("@/components/LoadLinkCallLayerReliable20260822"));

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
    let layerReady = false;
    let pending: CustomEvent | null = null;
    // The first call tap can happen before a lazy call module has installed
    // its event listener. Queue the request until the call layer is mounted.
    const onCall=(event: Event)=>{
      if (layerReady) return;
      pending = event as CustomEvent;
      setEnabled(true);
    };
    const onReady=()=>{
      layerReady=true;
      if (!pending) return;
      const detail=pending.detail;
      pending=null;
      window.dispatchEvent(new CustomEvent("loadlink-start-chat-call",{detail}));
    };
    window.addEventListener("loadlink-start-chat-call",onCall);
    window.addEventListener("loadlink-call-layer-ready",onReady);
    return ()=>{
      window.removeEventListener("loadlink-start-chat-call",onCall);
      window.removeEventListener("loadlink-call-layer-ready",onReady);
    };
  }, []);

  useEffect(() => {
    if (pathname !== "/messages") return;
    const eager = window.setTimeout(() => setEnabled(true), 0);
    bridgeMessageThreadForCalls();
    const beforeCallChoice = () => bridgeMessageThreadForCalls();
    document.addEventListener("click", beforeCallChoice, true);
    return () => { window.clearTimeout(eager); document.removeEventListener("click", beforeCallChoice, true); };
  }, [pathname]);

  useEffect(() => {
    const start = () => setEnabled(true);
    const idleWindow = window as IdleWindow;
    if (typeof idleWindow.requestIdleCallback === "function") {
      const id = idleWindow.requestIdleCallback(start, { timeout: 900 });
      return () => idleWindow.cancelIdleCallback?.(id);
    }
    const timer = globalThis.setTimeout(start, 220);
    return () => globalThis.clearTimeout(timer);
  }, []);

  return enabled ? <Suspense fallback={null}><LoadLinkCallLayer /></Suspense> : null;
}
