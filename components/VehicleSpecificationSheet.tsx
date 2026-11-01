"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import LoadLinkIcon from "@/components/LoadLinkIcon";

type Item = [label: string, value: string];
type Props = { entries: Item[]; darkMode: boolean };
const headingOrder = ["General", "Engine", "Handling", "Comfort", "Technology", "Safety", "Equipment & dimensions"];
const hidden = new Set(["offer", "sale price", "rental rate", "seller", "listing type"]);
const labelGroup: Record<string, string> = {
  "vehicle subtype": "General",
  "year": "General",
  "make": "General",
  "model": "General",
  "condition": "General",
  "mileage": "General",
  "transmission": "General",
  "fuel": "General",
  "service history": "General",
  "previous owners": "General",
  "engine / power": "Engine",
  "engine size": "Engine",
  "power": "Engine",
  "torque": "Engine",
  "horsepower": "Engine",
  "kw": "Engine",
  "axle configuration": "Handling",
  "gvm": "Handling",
  "payload": "Handling",
  "braking / retarder": "Handling",
  "braking system": "Handling",
  "suspension": "Handling",
  "cab configuration": "Comfort",
  "seats": "Comfort",
  "air conditioning": "Comfort",
  "climate control": "Comfort",
  "infotainment": "Technology",
  "navigation": "Technology",
  "gps": "Technology",
  "telematics": "Technology",
  "safety equipment": "Safety",
  "abs": "Safety",
  "airbags": "Safety",
  "stability control": "Safety",
  "body / deck dimensions": "Equipment & dimensions",
  "loading configuration": "Equipment & dimensions",
  "temperature range": "Equipment & dimensions",
  "refrigeration system": "Equipment & dimensions",
  "power supply": "Equipment & dimensions",
  "internal capacity": "Equipment & dimensions",
  "water system": "Equipment & dimensions",
  "included kitchen equipment": "Equipment & dimensions",
  "extraction / ventilation": "Equipment & dimensions",
  "internal dimensions": "Equipment & dimensions",
  "fit-out / equipment": "Equipment & dimensions",
  "operating capability": "Equipment & dimensions",
};

export default function VehicleSpecificationSheet({ entries, darkMode }: Props) {
  const [open, setOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const sections = useMemo(() => {
    const grouped = new Map<string, Item[]>();
    for (const [label, value] of entries) {
      if (!value.trim() || hidden.has(label.toLowerCase())) continue;
      const section = labelGroup[label.toLowerCase()] || "Equipment & dimensions";
      grouped.set(section, [...(grouped.get(section) || []), [label, value]]);
    }
    return headingOrder.map((title) => ({ title, items: grouped.get(title) || [] })).filter((section) => section.items.length > 0);
  }, [entries]);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open]);

  if (!sections.length) return null;
  const relevantItems = sections.flatMap((section) => section.items);
  const first = relevantItems.slice(0, 6);
  const subtle = darkMode ? "text-white/60" : "text-black/60";

  return (
    <div data-loadlink-vehicle-specifications="true">
      <dl className="grid grid-cols-2 gap-x-5 gap-y-0 sm:grid-cols-3">
        {first.map(([label, value]) =>
          <div key={label} className="min-w-0 border-b border-current/10 py-3">
            <dd className="break-words text-[15px] font-bold leading-6">{value}</dd>
            <dt className={"mt-1 text-xs leading-5 " + subtle}>{label}</dt>
          </div>
        )}
      </dl>
      <button type="button" onClick={() => setOpen(true)} className="mt-4 inline-flex min-h-11 w-full items-center justify-between gap-4 rounded-xl border border-current/15 px-4 text-left text-sm font-bold sm:w-auto">
        View detailed specifications <LoadLinkIcon name="chevronRight" size={18} />
      </button>

      {open ? (
        <div role="presentation" className={"fixed inset-0 z-[1000] " + (darkMode ? "bg-[#0b0c0b] text-white" : "bg-white text-[#101512]")}>
          <section role="dialog" aria-modal="true" aria-labelledby="loadlink-spec-title" className="mx-auto flex h-full max-w-3xl flex-col">
            <header className={"flex min-h-[76px] items-center justify-between gap-5 border-b px-5 py-3 sm:px-7 " + (darkMode ? "border-white/10" : "border-black/10")}>
              <h2 id="loadlink-spec-title" className="text-xl font-bold tracking-[-.03em] sm:text-2xl">Vehicle specifications</h2>
              <button ref={closeButton} type="button" onClick={() => setOpen(false)} aria-label="Close vehicle specifications" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-current/15"><LoadLinkIcon name="close" size={21} /></button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(30px,env(safe-area-inset-bottom))] sm:px-7">
              {sections.map((section, index) => (
                <details key={section.title} open={index === 0 ? true : undefined} className="group border-b border-current/10">
                  <summary className="flex min-h-[70px] cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-bold marker:hidden [&::-webkit-details-marker]:hidden">
                    <span>{section.title}</span>
                    <span className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform group-open:rotate-180 " + (darkMode ? "bg-white/10" : "bg-black/[.05]")}><LoadLinkIcon name="chevronDown" size={17} /></span>
                  </summary>
                  <dl className="grid grid-cols-1 gap-0 pb-4 sm:grid-cols-2 sm:gap-x-6">
                    {section.items.map(([label, value]) => (
                      <div key={label} className="border-t border-current/10 py-3.5">
                        <dt className={"text-xs " + subtle}>{label}</dt>
                        <dd className="mt-1 break-words text-sm font-semibold leading-6">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              ))}
              <p className={"mt-7 text-xs leading-6 " + subtle}>These details were provided by the seller. They may describe a used vehicle and should be checked against the actual vehicle, registration documents and service records before purchase.</p>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
