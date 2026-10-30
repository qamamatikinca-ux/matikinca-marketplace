"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Chat actions are rendered by React in ConversationDetails.
// This component only tags the native call controls for the site-wide call UI.
export default function LoadLinkChatInfoCompletion20260823() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname !== "/messages") return;
    const markCalls = () => {
      document.querySelectorAll<HTMLElement>('.loadlink-chat-header a[href^="tel:"],.loadlink-chat-header button[aria-label*="call" i]').forEach((node) => {
        node.dataset.loadlinkCallUiReady = "true";
      });
    };
    markCalls();
    const observer = new MutationObserver(markCalls);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}
