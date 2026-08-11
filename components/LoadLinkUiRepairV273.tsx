"use client";

import { useEffect } from "react";

function repairContractLinks() {
  document.querySelectorAll<HTMLAnchorElement>('a[href*="/jobs/list?mode=contract"]').forEach((link) => {
    link.href = link.href.replace("mode=contract", "type=contract");
  });
}

function ensureStyles() {
  if (document.getElementById("loadlink-v274-ui-repair")) return;
  const style = document.createElement("style");
  style.id = "loadlink-v274-ui-repair";
  style.textContent = `
.loadlink-chat-header button[aria-label="View latest dealer update"] {
  padding: 0 !important;
  background: transparent !important;
  overflow: visible !important;
}
.loadlink-chat-header button[aria-label="View latest dealer update"] > span {
  width: 100% !important;
  height: 100% !important;
  padding: 0 !important;
  background: transparent !important;
  border-radius: 999px !important;
}
.loadlink-chat-header button[aria-label="View latest dealer update"] [aria-label$="profile picture"] {
  width: 100% !important;
  height: 100% !important;
}
[aria-label$="profile picture"] > span:has(img) {
  background: transparent !important;
}
`;
  document.head.appendChild(style);
}

export default function LoadLinkUiRepairV273() {
  useEffect(() => {
    ensureStyles();
    repairContractLinks();
    const observer = new MutationObserver(repairContractLinks);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href"],
    });
    return () => observer.disconnect();
  }, []);
  return null;
}
