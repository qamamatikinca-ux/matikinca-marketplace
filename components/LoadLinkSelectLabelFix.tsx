"use client";

import { useEffect } from "react";

function cleanLabelText(select: HTMLSelectElement) {
  if (select.getAttribute("aria-label")?.trim()) return;

  const label = select.labels?.[0] || select.closest("label");
  if (!label) return;

  const clone = label.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll("select,input,textarea,button,datalist,option,svg,[aria-hidden='true']")
    .forEach((node) => node.remove());

  const text = (clone.textContent || "").replace(/\s+/g, " ").trim();
  if (text) select.setAttribute("aria-label", text);
}

function repairSelectLabels(root: ParentNode = document) {
  root.querySelectorAll<HTMLSelectElement>("select").forEach(cleanLabelText);
}

export default function LoadLinkSelectLabelFix() {
  useEffect(() => {
    repairSelectLabels();

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type !== "childList") continue;
        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node instanceof HTMLSelectElement) cleanLabelText(node);
          repairSelectLabels(node);
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
