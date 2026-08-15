"use client";

import { ReactNode, useEffect, useState } from "react";

type EntryMode = "vehicle" | "mobile-unit" | "";

function buttonWithText(root: ParentNode, text: string) {
  return Array.from(root.querySelectorAll("button")).find((button) =>
    button.textContent?.replace(/\s+/g, " ").trim().toLowerCase().includes(text.toLowerCase()),
  ) as HTMLButtonElement | undefined;
}

function removeLegacyDealershipGate() {
  const heading = Array.from(document.querySelectorAll("h1, h2, h3")).find(
    (node) => node.textContent?.replace(/\s+/g, " ").trim().toLowerCase() === "are you a dealership?",
  ) as HTMLElement | undefined;

  if (!heading) return false;

  const section = heading.closest("section") as HTMLElement | null;
  if (!section) return false;

  const privateSellerButton =
    buttonWithText(section, "private seller") ||
    Array.from(section.querySelectorAll("button")).find((button) => {
      const text = button.textContent?.replace(/\s+/g, " ").trim().toLowerCase() || "";
      return text === "no" || text.startsWith("no ");
    });

  if (privateSellerButton) privateSellerButton.click();

  section.dataset.loadlinkLegacyDealershipGate = "hidden";
  section.style.setProperty("display", "none", "important");

  window.setTimeout(() => {
    const next = section.nextElementSibling as HTMLElement | null;
    next?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 60);

  return true;
}

export default function ListYourVehicleLayout({ children }: { children: ReactNode }) {
  const [entryMode, setEntryMode] = useState<EntryMode>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("entry");
    const mode: EntryMode = requested === "vehicle" || requested === "mobile-unit" ? requested : "";
    const isDealershipInventoryRoute = Boolean(params.get("dealership"));

    setEntryMode(mode);

    // Normal owners/operators should never be forced through the old dealership question.
    // Dealership inventory routes keep their existing dealer-specific behaviour untouched.
    let gateObserver: MutationObserver | null = null;
    if (!isDealershipInventoryRoute) {
      removeLegacyDealershipGate();
      gateObserver = new MutationObserver(() => {
        removeLegacyDealershipGate();
      });
      gateObserver.observe(document.body, { childList: true, subtree: true });
    }

    if (!mode) {
      return () => gateObserver?.disconnect();
    }

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
          window.setTimeout(() => {
            removeLegacyDealershipGate();
            document.getElementById("vehicle-listing-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 80);
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

    return () => {
      window.clearInterval(timer);
      gateObserver?.disconnect();
    };
  }, []);

  return (
    <div data-loadlink-listing-entry={entryMode || undefined} data-loadlink-listing-entry-version="private-gate-bypass-v1">
      {children}
      <style jsx global>{`
        [data-loadlink-legacy-dealership-gate="hidden"] {
          display: none !important;
        }
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
