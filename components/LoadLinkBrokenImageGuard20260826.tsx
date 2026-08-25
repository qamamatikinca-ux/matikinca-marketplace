"use client";

import { useEffect } from "react";

export default function LoadLinkBrokenImageGuard20260826() {
  useEffect(() => {
    function handleImageError(event: Event) {
      const image = event.target;
      if (!(image instanceof HTMLImageElement)) return;
      if (image.dataset.loadlinkBrokenGuard === "1") {
        image.style.display = "none";
        return;
      }

      image.dataset.loadlinkBrokenGuard = "1";
      const rect = image.getBoundingClientRect();
      const tiny = rect.width <= 72 && rect.height <= 72;
      const label = `${image.alt || ""} ${image.className || ""}`.toLowerCase();
      const branding = /logo|icon|badge|avatar|profile/.test(label);

      if (tiny || branding) {
        image.style.display = "none";
        image.setAttribute("aria-hidden", "true");
        return;
      }

      image.src = "/images/truck-1.jpg";
    }

    document.addEventListener("error", handleImageError, true);
    return () => document.removeEventListener("error", handleImageError, true);
  }, []);

  return null;
}
