"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

function findScroller() {
  const viewport = document.querySelector<HTMLElement>(".loadlink-message-viewport");
  if (!viewport) return null;
  const candidates = [viewport, ...Array.from(viewport.querySelectorAll<HTMLElement>("div"))];
  return candidates
    .filter((node) => node.scrollHeight - node.clientHeight > 80)
    .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0] || viewport;
}

export default function LoadLinkChatJumpToLatest20260823() {
  const pathname = usePathname();
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ right: 18, bottom: 98 });

  useEffect(() => {
    if (!pathname.startsWith("/messages")) { setScroller(null); setVisible(false); return; }
    let active = true;
    let frame = 0;
    const bind = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!active) return;
        const next = findScroller();
        setScroller((current) => current === next ? current : next);
      });
    };
    bind();
    const observer = new MutationObserver(bind);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { active = false; cancelAnimationFrame(frame); observer.disconnect(); };
  }, [pathname]);

  useEffect(() => {
    if (!scroller) return;
    const update = () => {
      const distanceFromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
      setVisible(distanceFromBottom > 140);
      const viewport = document.querySelector<HTMLElement>(".loadlink-message-viewport");
      const rect = (viewport || scroller).getBoundingClientRect();
      setPosition({
        right: Math.max(14, window.innerWidth - Math.min(window.innerWidth - 14, rect.right - 14)),
        bottom: Math.max(88, window.innerHeight - rect.bottom + 82),
      });
    };
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    return () => {
      scroller.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [scroller]);

  if (!pathname.startsWith("/messages") || !scroller || !visible || typeof document === "undefined") return null;

  return createPortal(
    <button
      type="button"
      data-loadlink-jump-to-latest="true"
      aria-label="Jump to latest message"
      title="Jump to latest"
      onClick={() => scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" })}
      className="fixed z-[120] flex h-11 w-11 items-center justify-center rounded-full border border-current/10 bg-white text-black shadow-[0_8px_28px_rgba(0,0,0,.18)] transition hover:scale-[1.03] active:scale-95 dark:bg-[#151515] dark:text-white"
      style={{ right: position.right, bottom: position.bottom }}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true"><path d="m6.5 9 5.5 5.5L17.5 9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>,
    document.body,
  );
}
