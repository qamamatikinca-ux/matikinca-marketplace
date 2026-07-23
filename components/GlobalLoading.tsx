"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import LoadLinkLoading from "@/components/LoadLinkLoading";

const MINIMUM_LOADING_TIME = 1500;
const SAFETY_MAXIMUM_LOADING_TIME = 18000;

function isInternalLink(link: HTMLAnchorElement) {
  const href = link.getAttribute("href");

  if (!href) return false;
  if (href.startsWith("#")) return false;
  if (href.startsWith("mailto:")) return false;
  if (href.startsWith("tel:")) return false;
  if (href.startsWith("javascript:")) return false;
  if (link.target && link.target !== "_self") return false;

  try {
    const url = new URL(href, window.location.origin);
    return url.origin === window.location.origin;
  } catch {
    return href.startsWith("/");
  }
}

export default function GlobalLoading() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const startedAtRef = useRef(0);
  const minTimerRef = useRef<number | null>(null);
  const safetyTimerRef = useRef<number | null>(null);
  const routeArrivedRef = useRef(false);

  function clearTimers() {
    if (minTimerRef.current) window.clearTimeout(minTimerRef.current);
    if (safetyTimerRef.current) window.clearTimeout(safetyTimerRef.current);
  }

  function startLoading() {
    clearTimers();
    routeArrivedRef.current = false;
    startedAtRef.current = Date.now();
    setLoading(true);

    safetyTimerRef.current = window.setTimeout(() => {
      setLoading(false);
      clearTimers();
    }, SAFETY_MAXIMUM_LOADING_TIME);
  }

  function finishAfterMinimum() {
    if (!startedAtRef.current) return;

    routeArrivedRef.current = true;

    const elapsed = Date.now() - startedAtRef.current;
    const remaining = Math.max(0, MINIMUM_LOADING_TIME - elapsed);

    if (minTimerRef.current) window.clearTimeout(minTimerRef.current);

    minTimerRef.current = window.setTimeout(() => {
      if (routeArrivedRef.current) {
        setLoading(false);
        clearTimers();
      }
    }, remaining);
  }

  useEffect(() => {
    finishAfterMinimum();

    return () => {
      clearTimers();
    };
  }, [pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const link = target?.closest("a") as HTMLAnchorElement | null;

      if (!link) return;
      if (!isInternalLink(link)) return;

      const href = link.getAttribute("href") || "";
      const nextUrl = new URL(href, window.location.origin);

      if (nextUrl.pathname === window.location.pathname && nextUrl.search === window.location.search) {
        return;
      }

      startLoading();
    }

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
      clearTimers();
    };
  }, []);

  return loading ? <LoadLinkLoading /> : null;
}
