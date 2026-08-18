"use client";

import { useEffect } from "react";
import { downloadLoadLinkPdf } from "@/components/LoadLinkDocumentPreview";

const LOGO_STORAGE_KEY = "loadlink-business-logo-clean-v1";

export default function LogisticsToolsFinalEnhancer() {
  useEffect(() => {
    const enhance = () => {
      if (!document.body.dataset.loadlinkLogisticsOpen) return;
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
      for (const useButton of buttons) {
        if (useButton.textContent?.trim() !== "Use in chat") continue;
        const actionRow = useButton.parentElement;
        if (!actionRow || actionRow.querySelector("[data-loadlink-tool-pdf-export]")) continue;
        const editor = useButton.closest("div.rounded-2xl") || useButton.parentElement?.parentElement;
        const textarea = editor?.querySelector<HTMLTextAreaElement>("textarea");
        const title = editor?.querySelector("h3")?.textContent?.trim() || "Logistics document";
        if (!textarea) continue;

        const pdfButton = document.createElement("button");
        pdfButton.type = "button";
        pdfButton.dataset.loadlinkToolPdfExport = "true";
        pdfButton.textContent = "Download PDF";
        pdfButton.className = "h-10 shrink-0 rounded-xl border border-current/15 px-4 text-[10px] font-bold";
        pdfButton.addEventListener("click", async () => {
          const original = pdfButton.textContent;
          pdfButton.disabled = true;
          pdfButton.textContent = "Building PDF…";
          try {
            let businessLogo = "";
            try { businessLogo = localStorage.getItem(LOGO_STORAGE_KEY) || ""; } catch { /* optional */ }
            await downloadLoadLinkPdf({ documentType: title, terms: textarea.value, businessLogo });
          } finally {
            pdfButton.disabled = false;
            pdfButton.textContent = original;
          }
        });
        actionRow.insertBefore(pdfButton, useButton);
      }
    };

    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-loadlink-logistics-open"] });
    enhance();
    return () => observer.disconnect();
  }, []);

  return null;
}
