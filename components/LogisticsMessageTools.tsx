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

export type StructuredQuote = {
  amount: string;
  unit: "total" | "km" | "ton" | "day";
  vehicle: string;
  route: string;
  availability: string;
  vat: "included" | "excluded" | "not_applicable";
  terms: string;
};

type Props = {
  threadId: string;
  listingTitle: string;
  role: "buyer" | "owner";
  darkMode: boolean;
  disabled?: boolean;
  onInsert: (message: string) => void;
  onSendQuote?: (quote: StructuredQuote) => Promise<void> | void;
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
  onSendQuote,
}: Props) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<DealStage>("Enquiry");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<StructuredQuote["unit"]>("total");
  const [vehicle, setVehicle] = useState("");
  const [route, setRoute] = useState("");
  const [availability, setAvailability] = useState("");
  const [vat, setVat] = useState<StructuredQuote["vat"]>("included");
  const [terms, setTerms] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(stageKey(threadId)) as DealStage | null;
      setStage(stored && STAGES.includes(stored) ? stored : "Enquiry");
    } catch {
      setStage("Enquiry");
    }
    setOpen(false);
    setQuoteOpen(false);
  }, [threadId]);

  const templates = useMemo(() => {
    const title = clean(listingTitle) || "this listing";
    if (role === "owner") {
      return [
        ["Confirm vehicle", `Please confirm the vehicle type, payload capacity, current location and earliest availability for ${title}.`],
        ["Request documents", "Please send the required vehicle details and documents. Do not send passwords, PINs, OTPs or banking login information."],
        ["Collection details", "Please confirm the exact collection address, contact person, loading time, cargo description, weight and loading equipment available."],
        ["Delivery details", "Please confirm the delivery address, receiving contact, delivery window, offloading requirements and POD procedure."],
        ["Payment terms", "Please confirm the agreed rate, VAT position, payment method, payment period and documents required before payment."],
        ["Booking confirmation", "Before dispatch, please confirm the final rate in writing, vehicle registration, driver name and number, collection slot, delivery slot and cancellation terms."],
        ["Waiting time", "Please confirm the free loading/offloading time and the detention or standing-time rate that applies after the free period."],
        ["Compliance", "Please confirm the required permits, insurance, load restraints, PPE, induction and any site-specific safety documents before dispatch."],
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
    ] as const;
  }, [listingTitle, role]);


  function openPanel() {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setOpen(true);
  }

  function selectStage(next: DealStage) {
    setStage(next);
    try {
      window.localStorage.setItem(stageKey(threadId), next);
    } catch {
      // Optional local label only.
    }
  }

  async function submitQuote() {
    if (!amount.trim() || disabled || quoteBusy) return;
    setQuoteBusy(true);
    try {
      const quote: StructuredQuote = {
        amount: clean(amount),
        unit,
        vehicle: clean(vehicle),
        route: clean(route),
        availability: clean(availability),
        vat,
        terms: clean(terms),
      };
      if (onSendQuote) {
        await onSendQuote(quote);
      } else {
        const unitText = unit === "total" ? "total trip" : unit === "km" ? "per km" : unit === "ton" ? "per ton" : "per day";
        onInsert([
          "RATE QUOTE",
          `Rate: R${quote.amount} ${unitText}`,
          quote.vehicle ? `Vehicle: ${quote.vehicle}` : "",
          quote.route ? `Route: ${quote.route}` : "",
          quote.availability ? `Availability: ${quote.availability}` : "",
          `VAT: ${quote.vat.replace("_", " ")}`,
          quote.terms ? `Terms: ${quote.terms}` : "",
        ].filter(Boolean).join("\n"));
      }
      setStage("Quoting");
      setQuoteOpen(false);
      setOpen(false);
    } finally {
      setQuoteBusy(false);
    }
  }

  const panel = darkMode ? "border-white/10 bg-[#0b0b0b] text-white" : "border-black/10 bg-white text-black";
  const muted = darkMode ? "text-white/52" : "text-black/52";
  const control = darkMode ? "border-white/15 bg-[#151515] text-white" : "border-black/10 bg-[#fbfaf7] text-black";

  return (
    <>
      <section className={`loadlink-logistics-bar border-t ${panel}`} aria-label="Logistics messaging tools">
        <div className="mx-auto flex min-h-[58px] max-w-3xl items-center justify-between gap-3 px-3 py-2 sm:px-4">
          <button type="button" onClick={openPanel} className="flex min-w-0 items-center gap-2 text-left" aria-expanded={open}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f6b800] text-black" aria-hidden="true">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M3 7h11v9H3V7Zm11 3h3.4L21 13.6V16h-7v-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="7" cy="17.5" r="1.7" stroke="currentColor" strokeWidth="1.8" /><circle cx="17.5" cy="17.5" r="1.7" stroke="currentColor" strokeWidth="1.8" /></svg>
            </span>
            <span className="min-w-0">
              <strong className="block truncate text-xs font-black uppercase tracking-[0.12em]">Logistics actions</strong>
              <span className={`block truncate text-[10px] font-semibold ${muted}`}>Replies, trip stages and structured quotes</span>
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${darkMode ? "border-white/15 text-white/65" : "border-black/15 text-black/60"}`}>{stage}</span>
            <button type="button" onClick={openPanel} className={`flex h-8 w-8 items-center justify-center rounded-full border text-lg ${control}`} aria-label="Open logistics tools">+</button>
          </div>
        </div>
      </section>

      {open ? (
        <section className={`loadlink-logistics-sheet fixed inset-x-0 bottom-0 z-[90] max-h-[72dvh] overflow-y-auto border-t shadow-[0_-18px_50px_rgba(0,0,0,.24)] ${panel}`} aria-label="Logistics actions panel">
          <div className="mx-auto max-w-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="text-lg font-black">Logistics actions</h2><p className={`mt-1 text-xs font-semibold ${muted}`}>Choose a stage, insert a professional reply or send a quote.</p></div>
              <button type="button" onClick={() => setOpen(false)} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xl ${control}`} aria-label="Close logistics actions">×</button>
            </div>

            <div className="mt-5">
              <p className={`mb-2 text-[9px] font-black uppercase tracking-[0.16em] ${muted}`}>Deal stage</p>
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">{STAGES.map((item) => <button key={item} type="button" onClick={() => selectStage(item)} className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-black ${stage === item ? "border-[#f6b800] bg-[#f6b800] text-black" : control}`}>{item}</button>)}</div>
            </div>

            <div className="mt-5">
              <p className={`mb-2 text-[9px] font-black uppercase tracking-[0.16em] ${muted}`}>Professional replies</p>
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">{templates.map(([label, message]) => <button key={label} type="button" disabled={disabled} onClick={() => { onInsert(message); setOpen(false); }} className={`shrink-0 rounded-xl border px-3 py-2.5 text-left text-[10px] font-black disabled:opacity-40 ${control}`}>{label}</button>)}</div>
            </div>

            <div className="mt-5">
              <p className={`mb-2 text-[9px] font-black uppercase tracking-[0.16em] ${muted}`}>Trip updates</p>
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">{STATUS_MESSAGES.map(([label, message]) => <button key={label} type="button" disabled={disabled} onClick={() => { onInsert(`LOAD STATUS — ${label.toUpperCase()}\n${message}`); setOpen(false); }} className={`shrink-0 rounded-xl border px-3 py-2.5 text-left text-[10px] font-black disabled:opacity-40 ${control}`}>{label}</button>)}<button type="button" disabled={disabled} onClick={() => setQuoteOpen((current) => !current)} className="shrink-0 rounded-xl bg-[#f6b800] px-4 py-2.5 text-[10px] font-black text-black disabled:opacity-40">Structured quote</button></div>
            </div>

            {quoteOpen ? (
              <div className={`mt-5 grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 ${control}`}>
                <label className="text-[10px] font-black">Rate (R)<input value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="18500" className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm font-semibold outline-none focus:border-[#f6b800] ${control}`} /></label>
                <label className="text-[10px] font-black">Rate unit<select value={unit} onChange={(event) => setUnit(event.target.value as StructuredQuote["unit"])} className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm font-semibold outline-none focus:border-[#f6b800] ${control}`}><option value="total">Total trip</option><option value="km">Per km</option><option value="ton">Per ton</option><option value="day">Per day</option></select></label>
                <label className="text-[10px] font-black">Vehicle<input value={vehicle} onChange={(event) => setVehicle(event.target.value)} placeholder="34-ton side tipper" className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm font-semibold outline-none focus:border-[#f6b800] ${control}`} /></label>
                <label className="text-[10px] font-black">Route<input value={route} onChange={(event) => setRoute(event.target.value)} placeholder="Pretoria → Durban" className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm font-semibold outline-none focus:border-[#f6b800] ${control}`} /></label>
                <label className="text-[10px] font-black">Availability<input value={availability} onChange={(event) => setAvailability(event.target.value)} placeholder="Monday, Gauteng" className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm font-semibold outline-none focus:border-[#f6b800] ${control}`} /></label>
                <label className="text-[10px] font-black">VAT<select value={vat} onChange={(event) => setVat(event.target.value as StructuredQuote["vat"])} className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm font-semibold outline-none focus:border-[#f6b800] ${control}`}><option value="included">Included</option><option value="excluded">Excluded</option><option value="not_applicable">Not applicable</option></select></label>
                <label className="text-[10px] font-black sm:col-span-2">Terms<input value={terms} onChange={(event) => setTerms(event.target.value)} placeholder="Payment within 7 days of signed POD" className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm font-semibold outline-none focus:border-[#f6b800] ${control}`} /></label>
                <button type="button" disabled={!amount.trim() || disabled || quoteBusy} onClick={() => void submitQuote()} className="h-11 rounded-xl bg-[#f6b800] text-[10px] font-black uppercase tracking-wide text-black disabled:opacity-40 sm:col-span-2">{quoteBusy ? "Sending quote…" : "Send structured quote"}</button>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  );
}
