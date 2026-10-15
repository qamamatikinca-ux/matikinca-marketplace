"use client";

import { useEffect } from "react";

export default function LoadLinkBrokenImageGuard20260826() {
  useEffect(() => {
    function handleImageError(event: Event) {
      const image = event.target;
      if (!(image instanceof HTMLImageElement)) return;
      if (image.dataset.loadlinkManagedImage === "true") return;
      const original = image.dataset.loadlinkOriginalSrc;
      if (original && image.src.includes("/_next/image") && image.dataset.loadlinkOriginalRetried !== "1") {
        image.dataset.loadlinkOriginalRetried = "1";
        image.removeAttribute("srcset"); image.src = original;
        return;
      }
      if (image.dataset.loadlinkBrokenGuard === "1") return;
      image.dataset.loadlinkBrokenGuard = "1";
      const label = `${image.alt || ""} ${image.className || ""}`.toLowerCase();
      if (/logo|icon|badge|avatar|profile/.test(label)) { image.style.visibility = "hidden"; return; }
      image.removeAttribute("srcset");
      image.src = "/images/image-unavailable.svg";
      image.alt = image.alt ? `${image.alt} — image unavailable` : "Image unavailable";
    }

    document.addEventListener("error", handleImageError, true);
    return () => document.removeEventListener("error", handleImageError, true);
  }, []);

  return null;
}
