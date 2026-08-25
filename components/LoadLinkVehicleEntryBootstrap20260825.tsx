"use client";

import { useEffect } from "react";

type Mode = "vehicle" | "mobile-unit";

function buttonByText(root: Element, text: string) {
  const needle = text.trim().toLowerCase();
  return Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.textContent?.trim().toLowerCase() === needle) || null;
}

export default function LoadLinkVehicleEntryBootstrap20260825({ mode }: { mode: Mode }) {
  useEffect(() => {
    let stopped = false;
    let attempts = 0;
    let timer = 0;

    const sync = () => {
      if (stopped) return;
      attempts += 1;
      const root = document.querySelector("#listing-form > main");
      if (!root) {
        if (attempts < 80) timer = window.setTimeout(sync, 80);
        return;
      }

      const form = root.querySelector("#vehicle-listing-form");
      if (form) return;

      const choiceHeading = Array.from(root.querySelectorAll("h2")).find((heading) => /what do you want to list/i.test(heading.textContent || ""));
      if (!choiceHeading) {
        const openButton = buttonByText(root, "List your vehicle");
        if (openButton) openButton.click();
        if (attempts < 80) timer = window.setTimeout(sync, 90);
        return;
      }

      if (mode === "mobile-unit") {
        const mobileButton = buttonByText(root, "Mobile Unit");
        if (mobileButton) {
          mobileButton.click();
          if (attempts < 80) timer = window.setTimeout(sync, 90);
          return;
        }
      }

      // Vehicle mode intentionally stops at the Truck / Trailer choice so the user
      // chooses the correct vehicle type. Mobile-unit mode enters that choice directly.
    };

    timer = window.setTimeout(sync, 60);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [mode]);

  return null;
}
