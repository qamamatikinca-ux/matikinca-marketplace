"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import LoadLinkLoading from "@/components/LoadLinkLoading";

const INITIAL_LOADING_TIME = 420;
const INITIAL_LOADING_FALLBACK = 900;

export default function GlobalLoading() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let minimumTimer = 0;
    let fallbackTimer = 0;
    let released = false;

    const release = () => {
      if (released) return;
      released = true;
      minimumTimer = window.setTimeout(
        () => setLoading(false),
        pathname === "/messages" ? 140 : INITIAL_LOADING_TIME,
      );
    };

    if (document.readyState === "complete") {
      window.requestAnimationFrame(release);
    } else {
      window.addEventListener("load", release, { once: true });
      fallbackTimer = window.setTimeout(release, INITIAL_LOADING_FALLBACK);
    }

    return () => {
      window.removeEventListener("load", release);
      window.clearTimeout(minimumTimer);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  const skipOverlay = pathname === "/messages" || pathname.startsWith("/list-your-vehicle") || pathname.startsWith("/list-your-truck");
  return loading && !skipOverlay ? <LoadLinkLoading /> : null;
}
