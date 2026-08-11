"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import LoadLinkLoading from "@/components/LoadLinkLoading";

const INITIAL_MINIMUM_LOADING_TIME = 850;
const ROUTE_MINIMUM_LOADING_TIME = 320;
const SAFETY_MAXIMUM_LOADING_TIME = 4500;

function isInternalLink(link: HTMLAnchorElement) {
  const href = link.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return false;
  if (link.target && link.target !== "_self") return false;
  try {
    return new URL(href, window.location.origin).origin === window.location.origin;
  } catch {
    return href.startsWith("/");
  }
}

export default function GlobalLoading() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [loading, setLoading] = useState(true);
  const startedAtRef = useRef(Date.now());
  const minimumRef = useRef(INITIAL_MINIMUM_LOADING_TIME);
  const minTimerRef = useRef<number | null>(null);
  const safetyTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (minTimerRef.current !== null) window.clearTimeout(minTimerRef.current);
    if (safetyTimerRef.current !== null) window.clearTimeout(safetyTimerRef.current);
    minTimerRef.current = null;
    safetyTimerRef.current = null;
  }, []);

  const stopLoading = useCallback(() => {
    const elapsed = Date.now() - startedAtRef.current;
    const remaining = Math.max(0, minimumRef.current - elapsed);
    if (minTimerRef.current !== null) window.clearTimeout(minTimerRef.current);
    minTimerRef.current = window.setTimeout(() => {
      setLoading(false);
      clearTimers();
    }, remaining);
  }, [clearTimers]);

  const startLoading = useCallback((minimum = ROUTE_MINIMUM_LOADING_TIME) => {
    clearTimers();
    minimumRef.current = minimum;
    startedAtRef.current = Date.now();
    setLoading(true);
    safetyTimerRef.current = window.setTimeout(() => {
      setLoading(false);
      clearTimers();
    }, SAFETY_MAXIMUM_LOADING_TIME);
  }, [clearTimers]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      startLoading(pathname === "/messages" ? 220 : INITIAL_MINIMUM_LOADING_TIME);
      const releaseInitial = () => stopLoading();
      if (document.readyState === "complete") requestAnimationFrame(releaseInitial);
      else window.addEventListener("load", releaseInitial, { once: true });
      const fallback = window.setTimeout(releaseInitial, 1200);
      return () => {
        window.removeEventListener("load", releaseInitial);
        window.clearTimeout(fallback);
      };
    }
    stopLoading();
  }, [routeKey, startLoading, stopLoading]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as HTMLElement | null)?.closest("a") as HTMLAnchorElement | null;
      if (!link || !isInternalLink(link)) return;
      const nextUrl = new URL(link.href, window.location.origin);
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const next = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      if (current === next) return;
      startLoading(nextUrl.pathname === "/messages" ? 160 : ROUTE_MINIMUM_LOADING_TIME);
    }

    const release = () => stopLoading();
    document.addEventListener("click", handleClick);
    window.addEventListener("pageshow", release);
    window.addEventListener("popstate", release);
    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("pageshow", release);
      window.removeEventListener("popstate", release);
      clearTimers();
    };
  }, [clearTimers, startLoading, stopLoading]);

  return loading ? <LoadLinkLoading /> : null;
}
