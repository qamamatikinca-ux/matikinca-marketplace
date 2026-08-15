"use client";

import { ReactNode, useEffect, useState } from "react";

type EntryMode = "vehicle" | "mobile-unit" | "";

function buttonWithText(root: ParentNode, text: string) {
  return Array.from(root.querySelectorAll("button")).find((button) =>
    button.textContent?.replace(/\s+/g, " ").trim().toLowerCase().includes(text.toLowerCase()),
  ) as HTMLButtonElement | undefined;
}

export default function ListYourVehicleLayout({ children }: { children: ReactNode }) {
  const [entryMode, setEntryMode] = useState<EntryMode>("");

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("entry");
    const mode: EntryMode = requested === "vehicle" || requested === "mobile-unit" ? requested : "";
    setEntryMode(mode);
    if (!mode) return;

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;

      const listingChoice = document.getElementById("vehicle-listing-choice");
      if (!listingChoice) {
        const startButton = buttonWithText(document, "list your vehicle");
        if (startButton) startButton.click();
      }

      const refreshedChoice = document.getElementById("vehicle-listing-choice");
      if (mode === "mobile-unit" && refreshedChoice) {
        const mobileButton = buttonWithText(refreshedChoice, "mobile unit");
        if (mobileButton) {
          mobileButton.click();
          window.clearInterval(timer);
          window.setTimeout(() => document.getElementById("vehicle-listing-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
          return;
        }
      }

      if (mode === "vehicle" && refreshedChoice) {
        refreshedChoice.scrollIntoView({ behavior: "smooth", block: "start" });
        window.clearInterval(timer);
        return;
      }

      if (attempts >= 30) window.clearInterval(timer);
    }, 80);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div data-loadlink-listing-entry={entryMode || undefined}>
      {children}
      <style jsx global>{`
        [data-loadlink-listing-entry="vehicle"] #vehicle-listing-choice .grid > button:nth-child(3) {
          display: none !important;
        }
        @media (min-width: 640px) {
          [data-loadlink-listing-entry="vehicle"] #vehicle-listing-choice .grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            max-width: 42rem !important;
          }
        }
      `}</style>
    </div>
  );
}
