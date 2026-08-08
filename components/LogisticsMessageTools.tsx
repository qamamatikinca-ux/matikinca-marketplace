"use client";

import { useEffect, useMemo, useState } from "react";

type DealStage =
  | "Enquiry"
  | "Quoting"
  | "Booked"
  | "At collection"
  | "In transit"
  | "Delivered"
  | "Payment pending"
  | "Closed";

type Props = {
  threadId: string;
  listingTitle: string;
  role: "buyer" | "owner";
  darkMode: boolean;
  disabled?: boolean;
  onInsert: (message: string) => void;
};

const STAGES: DealStage[] = [
  "Enquiry",
  "Quoting",
  "Booked",
  "At collection",
  "In transit",
  "Delivered",
  "Payment pending",
  "Closed",
];

const STATUS_MESSAGES = [
  ["Arrived", "Driver has arrived at the collection point. Please confirm the loading contact and bay instructions."],
  ["Loaded", "The vehicle is loaded and the cargo has been checked. Please confirm the delivery contact and any site instructions."],
  ["Departed", "The vehicle has departed collection. I will share an updated ETA if road conditions change."],
  ["Delay", "Delay update: the vehicle has been delayed. Please confirm whether the receiving site can accommodate a revised ETA."],
  ["At delivery", "The vehicle has arrived at the delivery point. Please confirm the receiving contact and offloading instructions."],
  ["Delivered", "Delivery is complete. Please confirm that the POD was signed and advise where the invoice should be submitted."],
  ["Breakdown", "Operational update: the vehicle has a mechanical issue. Recovery is being arranged. I will confirm the revised ETA and replacement-vehicle plan as soon as available."],
  ["POD sent", "POD update: the signed proof of delivery has been sent. Please confirm receipt and the invoice/payment reference to use."],
] as const;

function stageKey(threadId: string) {
  return `loadlink-logistics-stage:${threadId}`;
}

function clean(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export default function LogisticsMessageTools({
  threadId,
  listingTitle,
  role,
  darkMode,
  disabled = false,
  onInsert,
}: Props) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<DealStage>("Enquiry");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("total");
  const [vehicle, setVehicle] = useState("");
  const [available, setAvailable] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(stageKey(threadId)) as DealStage | null;
      setStage(stored && STAGES.includes(stored) ? stored : "Enquiry");
    } catch {
      setStage("Enquiry");
    }
  }, [threadId]);

  const templates = useMemo(() => {
    const title = clean(listingTitle) || "this listing";
    if (role === "owner") {
      return [
        ["Confirm vehicle", `Please confirm the vehicle type, payload capacity, current location and earliest availability for ${title}.`],
        ["Request documents", "Please send the required vehicle details and documents. Do not send passwords, PINs, OTPs or banking login information."],
        ["Collection details", "Collection details required: exact address, contact person, loading time, cargo description, weight and loading equipment available."],
        ["Delivery details", "Please confirm the delivery address, receiving contact, delivery window, offloading requirements and POD procedure."],
        ["Payment terms", "Please confirm the agreed rate, VAT position, payment method, payment period and documents required before payment."],
        ["Booking confirmation", "Before dispatch, please confirm the final rate in writing, vehicle registration, driver name and number, collection slot, delivery slot and cancellation terms."],
        ["Waiting time", "Please confirm the free loading/offloading time and the detention or standing-time rate that applies after the free period."],
        ["Compliance", "Please confirm the required permits, insurance, load restraints, PPE, induction and any site-specific safety documents before dispatch."],
        ["Cancellation", "Please confirm the cancellation and no-show terms, including any call-out or repositioning charge once a vehicle has been dispatched."],
      ] as const;
    }
    return [
      ["Availability", `Is ${title} still available? Please confirm collection date, pickup location, delivery location, cargo weight and required vehicle type.`],
      ["Offer vehicle", "I have a suitable vehicle available. Please confirm the route, cargo details, loading time, required documents and payment terms."],
      ["Rate request", "Please confirm the offered rate, whether tolls and fuel are included, whether VAT applies, and the expected payment date."],
      ["Site access", "Please confirm site access requirements, PPE, induction, loading/offloading equipment and the correct contact person."],
      ["POD and payment", "Please confirm the POD format, invoice submission details, payment reference process and expected payment timeline."],
      ["Book vehicle", "I am ready to book. Please send the final rate, vehicle registration, driver contact, collection ETA and written cancellation terms before dispatch."],
      ["Waiting time", "What free loading/offloading time is included, and what detention or standing-time rate applies after that period?"],
      ["Compliance", "Please confirm the vehicle is roadworthy and has the required insurance, permits, load restraints, PPE and site-compliance documents."],
      ["Cancellation", "Please confirm the cancellation or no-show fee and when it becomes payable after a vehicle is allocated or dispatched."],
    ] as const;
  }, [listingTitle, role]);

  function selectStage(next: DealStage) {
    setStage(next);
    try {
      window.localStorage.setItem(stageKey(threadId), next);
    } catch {
      // Local stage labels are optional and must never block messaging.
    }
  }

  function insertQuote() {
    const safeAmount = clean(amount);
    const safeVehicle = clean(vehicle);
    const safeAvailable = clean(available);
    if (!safeAmount) return;
    const unitText = unit === "total" ? "total trip" : unit === "km" ? "per km" : unit === "ton" ? "per ton" : "per day";
    onInsert(
      [
        "LOADLINK RATE QUOTE",
        `Listing: ${clean(listingTitle) || "Current listing"}`,
        `Rate: R${safeAmount} ${unitText}`,
        safeVehicle ? `Vehicle: ${safeVehicle}` : "",
        safeAvailable ? `Available: ${safeAvailable}` : "",
        "Please confirm the route, cargo weight, toll/fuel terms, VAT position, payment period and cancellation terms before booking.",
      ].filter(Boolean).join("\n"),
    );
    setQuoteOpen(false);
  }

  const panel = darkMode
    ? "border-white/10 bg-[#0c0c0c] text-white"
    : "border-black/10 bg-[#fffaf0] text-black";
  const muted = darkMode ? "text-white/55" : "text-black/55";
  const control = darkMode
    ? "border-white/15 bg-white/[0.05] text-white"
    : "border-black/10 bg-white text-black";

  return (
    <section className={`border-t ${panel}`} aria-label="Logistics messaging tools">
      <div className="mx-auto max-w-3xl px-3 py-2.5 sm:px-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex min-w-0 items-center gap-2 text-left"
            aria-expanded={open}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f6b800] text-black" aria-hidden="true">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M3 7h11v9H3V7Zm11 3h3.4L21 13.6V16h-7v-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <circle cx="7" cy="17.5" r="1.7" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="17.5" cy="17.5" r="1.7" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </span>
            <span className="min-w-0">
              <strong className="block truncate text-xs font-black uppercase tracking-[0.12em]">Logistics actions</strong>
              <span className={`block truncate text-[10px] font-semibold ${muted}`}>Quick replies, load stage, rate quote and route updates</span>
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full border border-[#f6b800]/50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-[#b88900]">{stage}</span>
            <button type="button" onClick={() => setOpen((current) => !current)} className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm ${control}`} aria-label={open ? "Close logistics tools" : "Open logistics tools"}>{open ? "−" : "+"}</button>
          </div>
        </div>

        {open ? (
          <div className="mt-3 space-y-3">
            <div>
              <p className={`mb-2 text-[9px] font-black uppercase tracking-[0.16em] ${muted}`}>Deal stage</p>
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {STAGES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => selectStage(item)}
                    className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-black ${stage === item ? "border-[#f6b800] bg-[#f6b800] text-black" : control}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className={`mb-2 text-[9px] font-black uppercase tracking-[0.16em] ${muted}`}>Professional replies</p>
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {templates.map(([label, message]) => (
                  <button key={label} type="button" disabled={disabled} onClick={() => onInsert(message)} className={`shrink-0 rounded-xl border px-3 py-2.5 text-left text-[10px] font-black disabled:opacity-40 ${control}`}>{label}</button>
                ))}
              </div>
            </div>

            <div>
              <p className={`mb-2 text-[9px] font-black uppercase tracking-[0.16em] ${muted}`}>Trip updates</p>
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {STATUS_MESSAGES.map(([label, message]) => (
                  <button key={label} type="button" disabled={disabled} onClick={() => onInsert(`LOAD STATUS — ${label.toUpperCase()}\n${message}`)} className={`shrink-0 rounded-xl border px-3 py-2.5 text-left text-[10px] font-black disabled:opacity-40 ${control}`}>{label}</button>
                ))}
                <button type="button" disabled={disabled} onClick={() => setQuoteOpen((current) => !current)} className="shrink-0 rounded-xl border border-[#f6b800] bg-[#f6b800] px-3 py-2.5 text-left text-[10px] font-black text-black disabled:opacity-40">Rate quote</button>
              </div>
            </div>

            {quoteOpen ? (
              <div className={`grid gap-2 rounded-xl border p-3 sm:grid-cols-2 ${control}`}>
                <label className="text-[10px] font-black">Rate (R)<input value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="18500" className={`mt-1 h-10 w-full rounded-lg border px-3 text-sm font-semibold outline-none focus:border-[#f6b800] ${control}`} /></label>
                <label className="text-[10px] font-black">Rate unit<select value={unit} onChange={(event) => setUnit(event.target.value)} className={`mt-1 h-10 w-full rounded-lg border px-3 text-sm font-semibold outline-none focus:border-[#f6b800] ${control}`}><option value="total">Total trip</option><option value="km">Per km</option><option value="ton">Per ton</option><option value="day">Per day</option></select></label>
                <label className="text-[10px] font-black">Vehicle<input value={vehicle} onChange={(event) => setVehicle(event.target.value)} placeholder="34-ton side tipper" className={`mt-1 h-10 w-full rounded-lg border px-3 text-sm font-semibold outline-none focus:border-[#f6b800] ${control}`} /></label>
                <label className="text-[10px] font-black">Availability<input value={available} onChange={(event) => setAvailable(event.target.value)} placeholder="Available Monday, Gauteng" className={`mt-1 h-10 w-full rounded-lg border px-3 text-sm font-semibold outline-none focus:border-[#f6b800] ${control}`} /></label>
                <button type="button" disabled={!amount.trim() || disabled} onClick={insertQuote} className="h-10 rounded-lg bg-[#f6b800] text-[10px] font-black uppercase tracking-wide text-black disabled:opacity-40 sm:col-span-2">Insert professional quote</button>
              </div>
            ) : null}

            <p className={`text-[10px] font-semibold leading-4 ${muted}`}>Templates are logistics-specific and are inserted for review. Nothing is sent automatically.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
