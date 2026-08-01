"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import LoadLinkLoading from "@/components/LoadLinkLoading";

const MINIMUM_LOADING_TIME = 320;
const SAFETY_MAXIMUM_LOADING_TIME = 5000;

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
  const [loading, setLoading] = useState(false);
  const startedAtRef = useRef(0);
  const minTimerRef = useRef<number | null>(null);
  const safetyTimerRef = useRef<number | null>(null);

  function clearTimers() {
    if (minTimerRef.current !== null) window.clearTimeout(minTimerRef.current);
    if (safetyTimerRef.current !== null) window.clearTimeout(safetyTimerRef.current);
    minTimerRef.current = null;
    safetyTimerRef.current = null;
  }

  function stopLoading() {
    const elapsed = Date.now() - startedAtRef.current;
    const remaining = Math.max(0, MINIMUM_LOADING_TIME - elapsed);
    if (minTimerRef.current !== null) window.clearTimeout(minTimerRef.current);
    minTimerRef.current = window.setTimeout(() => {
      setLoading(false);
      clearTimers();
    }, remaining);
  }

  function startLoading() {
    clearTimers();
    startedAtRef.current = Date.now();
    setLoading(true);
    safetyTimerRef.current = window.setTimeout(() => {
      setLoading(false);
      clearTimers();
    }, SAFETY_MAXIMUM_LOADING_TIME);
  }

  useEffect(() => {
    stopLoading();
  }, [routeKey]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as HTMLElement | null)?.closest("a") as HTMLAnchorElement | null;
      if (!link || !isInternalLink(link)) return;
      const nextUrl = new URL(link.href, window.location.origin);
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const next = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      if (current === next) return;
      startLoading();
    }

    const release = () => stopLoading();
    document.addEventListener("click", handleClick);
    window.addEventListener("pageshow", release);
    window.addEventListener("popstate", release);
    window.addEventListener("load", release);
    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("pageshow", release);
      window.removeEventListener("popstate", release);
      window.removeEventListener("load", release);
      clearTimers();
    };
  }, []);

  return loading ? <LoadLinkLoading /> : null;
}
