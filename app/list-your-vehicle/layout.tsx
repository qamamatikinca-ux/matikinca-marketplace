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

  if (privateSellerButton && !privateSellerButton.disabled) privateSellerButton.click();

  section.dataset.loadlinkLegacyDealershipGate = "hidden";
  section.style.setProperty("display", "none", "important");
  return true;
}

function advancePastLegacyPlanGuide() {
  const plans = document.getElementById("plans") as HTMLElement | null;
  if (!plans) return false;

  plans.dataset.loadlinkLegacyPlanGuide = "hidden";
  plans.style.setProperty("display", "none", "important");

  let preferred = "pro";
  try {
    preferred = localStorage.getItem("loadlink-vehicle-render-plan") === "dealer" ? "dealer" : "pro";
  } catch {
    preferred = "pro";
  }

  const button = buttonWithText(plans, preferred === "dealer" ? "dealer" : "pro");
  if (!button || button.disabled) return false;
  button.click();
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

    let flowObserver: MutationObserver | null = null;
    if (!isDealershipInventoryRoute) {
      const repairLegacyGates = () => {
        removeLegacyDealershipGate();
        advancePastLegacyPlanGuide();
      };
      repairLegacyGates();
      flowObserver = new MutationObserver(repairLegacyGates);
      flowObserver.observe(document.body, { childList: true, subtree: true });
    }

    if (!mode) {
      return () => flowObserver?.disconnect();
    }

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;

      advancePastLegacyPlanGuide();

      const listingChoice = document.getElementById("vehicle-listing-choice");
      if (!listingChoice) {
        const startButton = buttonWithText(document, "list your vehicle");
        if (startButton && !startButton.disabled) startButton.click();
      }

      const refreshedChoice = document.getElementById("vehicle-listing-choice");
      if (mode === "mobile-unit" && refreshedChoice) {
        const mobileButton = buttonWithText(refreshedChoice, "mobile unit");
        if (mobileButton && !mobileButton.disabled) {
          mobileButton.click();
          window.setTimeout(() => {
            removeLegacyDealershipGate();
            advancePastLegacyPlanGuide();
            document.getElementById("vehicle-listing-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 80);
          window.clearInterval(timer);
          return;
        }
      }

      if (mode === "vehicle" && refreshedChoice) {
        refreshedChoice.scrollIntoView({ behavior: "smooth", block: "start" });
        window.clearInterval(timer);
        return;
      }

      if (document.getElementById("vehicle-listing-form")) {
        window.clearInterval(timer);
        return;
      }

      if (attempts >= 50) window.clearInterval(timer);
    }, 80);

    return () => {
      window.clearInterval(timer);
      flowObserver?.disconnect();
    };
  }, []);

  return (
    <div data-loadlink-listing-entry={entryMode || undefined} data-loadlink-listing-entry-version="no-plan-guide-v2">
      {children}
      <style jsx global>{`
        [data-loadlink-legacy-dealership-gate="hidden"],
        [data-loadlink-legacy-plan-guide="hidden"],
        [data-loadlink-listing-entry] #plans {
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
