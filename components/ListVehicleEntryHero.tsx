"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type ListingRoute = "vehicle" | "mobile_unit";

export default function ListVehicleEntryHero() {
  const pathname = usePathname();
  const [dealerRoute, setDealerRoute] = useState(false);
  const [starting, setStarting] = useState<ListingRoute | null>(null);

  useEffect(() => {
    if (pathname !== "/list-your-vehicle") return;
    const params = new URLSearchParams(window.location.search);
    setDealerRoute(Boolean(params.get("dealership")));
  }, [pathname]);

  if (pathname !== "/list-your-vehicle" || dealerRoute) return null;

  function beginListing(route: ListingRoute) {
    if (starting) return;
    setStarting(route);

    const legacyHero = document.querySelector<HTMLElement>("[data-loadlink-vehicle-entry] + section");
    const openListingButton = Array.from(legacyHero?.querySelectorAll<HTMLButtonElement>("button") || []).find((button) =>
      button.textContent?.trim().toLowerCase().includes("list your vehicle"),
    );

    if (!openListingButton) {
      setStarting(null);
      return;
    }

    openListingButton.click();

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const choice = document.getElementById("vehicle-listing-choice");
      const wanted = route === "vehicle" ? "truck" : "mobile unit";
      const choiceButton = Array.from(choice?.querySelectorAll<HTMLButtonElement>("button") || []).find(
        (button) => button.textContent?.trim().toLowerCase().startsWith(wanted),
      );

      if (choiceButton) {
        window.clearInterval(timer);
        choiceButton.click();
        setStarting(null);
        window.setTimeout(() => {
          document.getElementById("vehicle-listing-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
        return;
      }

      if (attempts >= 25) {
        window.clearInterval(timer);
        setStarting(null);
      }
    }, 40);
  }

  return (
    <section
      data-loadlink-vehicle-entry
      data-loadlink-vehicle-entry-version="drivers-layout-v1"
      className="relative flex min-h-[690px] w-full items-end overflow-hidden bg-black text-white md:min-h-[620px]"
      aria-labelledby="loadlink-vehicle-entry-title"
    >
      <img
        src="/images/jobs/jobs-hero-fleet.jpg"
        alt="LoadLink commercial truck available for vehicle listings"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/48 to-black/95" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-5 pb-8 pt-20 text-center sm:px-6 md:pb-12">
        <h1
          id="loadlink-vehicle-entry-title"
          className="mx-auto max-w-4xl text-[clamp(3rem,12.5vw,5.8rem)] font-black leading-[.94] tracking-[-.055em] text-white"
        >
          List a vehicle or explore available units
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-[15px] font-semibold leading-7 text-white/78 md:text-base">
          Browse approved vehicles and mobile units or create your own professional LoadLink listing.
        </p>

        <div className="mx-auto mt-7 grid w-full max-w-[640px] gap-3">
          <a
            href="#vehicle-marketplace"
            className="flex min-h-[58px] items-center justify-center rounded-full border border-[#f6b800] bg-[#f6b800] px-6 text-center text-[13px] font-black uppercase tracking-[.08em] text-black shadow-[0_14px_34px_rgba(0,0,0,.32)] transition active:scale-[.99] md:text-sm"
          >
            View available vehicles &amp; units
          </a>
          <button
            type="button"
            onClick={() => beginListing("vehicle")}
            disabled={Boolean(starting)}
            className="flex min-h-[58px] items-center justify-center rounded-full border border-white/65 bg-black/78 px-6 text-center text-[13px] font-black uppercase tracking-[.08em] text-white shadow-[0_14px_34px_rgba(0,0,0,.28)] backdrop-blur-sm transition active:scale-[.99] disabled:opacity-60 md:text-sm"
          >
            {starting === "vehicle" ? "Opening vehicle listing…" : "List vehicle"}
          </button>
          <button
            type="button"
            onClick={() => beginListing("mobile_unit")}
            disabled={Boolean(starting)}
            className="flex min-h-[58px] items-center justify-center rounded-full border border-white/65 bg-black/78 px-6 text-center text-[13px] font-black uppercase tracking-[.08em] text-white shadow-[0_14px_34px_rgba(0,0,0,.28)] backdrop-blur-sm transition active:scale-[.99] disabled:opacity-60 md:text-sm"
          >
            {starting === "mobile_unit" ? "Opening mobile unit listing…" : "List mobile unit"}
          </button>
        </div>
      </div>

      <style>{`
        [data-loadlink-vehicle-entry] + section {
          display: none !important;
        }
        #vehicle-listing-choice {
          display: none !important;
        }
      `}</style>
    </section>
  );
}
