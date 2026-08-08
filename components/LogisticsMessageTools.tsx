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

type WorkflowTool = {
  id: string;
  label: string;
  summary: string;
  template: string;
};

type Props = {
  threadId: string;
  listingTitle: string;
  role: "buyer" | "owner";
  darkMode: boolean;
  disabled?: boolean;
  onInsert: (message: string) => void;
  onSendQuote?: (quote: StructuredQuote) => Promise<void> | void;
  trigger?: "bar" | "menu";
  onOpen?: () => void;
  onClose?: () => void;
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
  trigger = "bar",
  onOpen,
  onClose,
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
  const [editorTool, setEditorTool] = useState<WorkflowTool | null>(null);
  const [editorText, setEditorText] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(stageKey(threadId)) as DealStage | null;
      setStage(stored && STAGES.includes(stored) ? stored : "Enquiry");
    } catch {
      setStage("Enquiry");
    }
    setOpen(false);
    setQuoteOpen(false);
    setEditorTool(null);
    setEditorText("");
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

  const workflowTools = useMemo<WorkflowTool[]>(() => {
    const title = clean(listingTitle) || "this listing";
    return [
      { id: "trip-brief", label: "Trip brief", summary: "Collection, delivery, cargo and instructions", template: `TRIP BRIEF — ${title}\n\nCollection\nAddress: [address]\nContact: [name + number]\nTime: [date / time]\n\nDelivery\nAddress: [address]\nContact: [name + number]\nTime: [date / time]\n\nCargo\nDescription: [cargo]\nWeight / quantity: [weight or quantity]\n\nVehicle\nType / registration: [vehicle details]\n\nReferences\nCollection: [reference]\nDelivery: [reference]\n\nSpecial instructions\n[PPE, access, temperature, loading/offloading or other instructions]` },
      { id: "load-checklist", label: "Load checklist", summary: "Review and edit pre-dispatch checks", template: "LOAD CHECKLIST\n\n☐ Vehicle and driver confirmed\n☐ Cargo description and weight confirmed\n☐ Collection contact and reference confirmed\n☐ Delivery contact and reference confirmed\n☐ Load restraints / equipment confirmed\n☐ PPE / induction / site access confirmed\n☐ POD requirements confirmed\n\nNotes: [add anything specific to this load]" },
      { id: "document-request", label: "Document request", summary: "Choose the documents needed for this load", template: "DOCUMENT REQUEST\n\nPlease send the following documents/details required for this load:\n• [vehicle details / permit / insurance]\n• [invoice details]\n• [POD requirements]\n• [other required document]\n\nDo not send passwords, PINs, OTPs or banking login information." },
      { id: "driver-handover", label: "Driver handover", summary: "Driver, vehicle and ETA details", template: "DRIVER HANDOVER\n\nDriver: [name]\nCell: [number]\nVehicle registration: [registration]\nTrailer registration: [registration / N/A]\nCollection ETA: [time]\nDelivery ETA: [time]\nNotes: [site or handover instructions]" },
      { id: "cost-breakdown", label: "Cost breakdown", summary: "Clarify all charges before booking", template: "COST BREAKDOWN REQUEST\n\nBase transport rate: [amount]\nVAT: [included / excluded / N/A]\nTolls: [included / excluded / amount]\nFuel surcharge: [included / excluded / amount]\nWaiting / detention: [free time + rate]\nLoading / offloading: [included / excluded / amount]\nOther charges: [details]\n\nPlease confirm the final total before booking." },
      { id: "payment-terms", label: "Payment terms", summary: "Invoice, POD and payment process", template: "PAYMENT TERMS\n\nPayment period: [e.g. 7 / 14 / 30 days]\nInvoice requirements: [details]\nPOD requirements: [details]\nPayment reference: [reference / process]\nPayment contact: [name / department]\nOther terms: [details]" },
      { id: "pod-request", label: "POD request", summary: "Proof-of-delivery follow-up", template: "POD REQUEST\n\nDelivery reference: [reference]\nDelivery date: [date]\nPlease send the signed proof of delivery and confirm the invoice submission address/reference.\nAdditional requirement: [optional]" },
      { id: "incident-update", label: "Incident update", summary: "Delay, breakdown or site issue", template: "INCIDENT UPDATE\n\nIssue: [breakdown / delay / site problem]\nLocation: [location]\nCurrent status: [status]\nRevised ETA: [time]\nRecovery / replacement plan: [details]\nContact / reference: [optional]" },
      { id: "collection-confirmation", label: "Collection brief", summary: "Confirm pickup details before dispatch", template: "COLLECTION BRIEF\n\nAddress: [collection address]\nDate / time: [slot]\nContact: [name + number]\nCargo / quantity: [details]\nLoading method: [details]\nReference: [reference]\nSite requirements: [PPE / induction / access]" },
      { id: "delivery-confirmation", label: "Delivery brief", summary: "Confirm receiving and offloading details", template: "DELIVERY BRIEF\n\nAddress: [delivery address]\nDate / time: [slot]\nReceiving contact: [name + number]\nOffloading method: [details]\nPOD requirement: [details]\nReference: [reference]\nSite requirements: [PPE / induction / access]" },
      { id: "eta-update", label: "ETA update", summary: "Send a clear revised arrival estimate", template: "ETA UPDATE\n\nCurrent location: [location]\nCurrent ETA: [time]\nReason for change: [traffic / loading / breakdown / weather / other]\nNext update: [time / milestone]" },
    ];
  }, [listingTitle]);

  function openToolEditor(tool: WorkflowTool) {
    setQuoteOpen(false);
    setEditorTool(tool);
    setEditorText(tool.template);
  }

  function useEditedTool() {
    const value = editorText.trim();
    if (!value || disabled) return;
    onInsert(value);
    setEditorTool(null);
    setEditorText("");
    closePanel();
  }


  function openPanel() {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) document.activeElement.blur();
    onOpen?.();
    setOpen(true);
  }

  function closePanel() {
    setOpen(false);
    onClose?.();
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
      closePanel();
    } finally {
      setQuoteBusy(false);
    }
  }

  const panel = darkMode ? "border-white/10 bg-[#0b0b0b] text-white" : "border-black/10 bg-white text-black";
  const muted = darkMode ? "text-white/52" : "text-black/52";
  const control = darkMode ? "border-white/15 bg-[#151515] text-white" : "border-black/10 bg-[#fbfaf7] text-black";

  return (
    <>
      {trigger === "menu" ? (
        <button type="button" onClick={openPanel} disabled={disabled} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold hover:bg-black/[.04] disabled:opacity-40" aria-expanded={open}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f6b800] text-black" aria-hidden="true">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M3 7h11v9H3V7Zm11 3h3.4L21 13.6V16h-7v-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="7" cy="17.5" r="1.7" stroke="currentColor" strokeWidth="1.8" /><circle cx="17.5" cy="17.5" r="1.7" stroke="currentColor" strokeWidth="1.8" /></svg>
          </span>
          <span className="min-w-0 flex-1"><span className="block">Logistics tools</span><span className={`mt-0.5 block truncate text-[9px] font-semibold ${muted}`}>{stage} · tools and updates</span></span>
        </button>
      ) : (
        <button type="button" onClick={openPanel} disabled={disabled} className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black disabled:opacity-40 ${control}`} aria-expanded={open}>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f6b800] text-black" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 7h11v9H3V7Zm11 3h3.4L21 13.6V16h-7v-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="7" cy="17.5" r="1.7" stroke="currentColor" strokeWidth="1.8" /><circle cx="17.5" cy="17.5" r="1.7" stroke="currentColor" strokeWidth="1.8" /></svg>
          </span>
          Logistics
        </button>
      )}

      {open ? (
        <section className={`loadlink-logistics-sheet fixed inset-x-0 bottom-0 z-[90] max-h-[68dvh] overflow-y-auto border-t shadow-[0_-18px_50px_rgba(0,0,0,.24)] ${panel}`} aria-label="Logistics actions panel">
          <div className="mx-auto max-w-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="text-lg font-bold">Logistics actions</h2><p className={`mt-1 text-xs font-medium ${muted}`}>Tools, stages and updates in one place.</p></div>
              <button type="button" onClick={closePanel} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xl ${control}`} aria-label="Close logistics actions">×</button>
            </div>

            <div className="mt-5">
              <p className={`mb-2 text-[9px] font-bold uppercase tracking-[0.14em] ${muted}`}>Deal stage</p>
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">{STAGES.map((item) => <button key={item} type="button" onClick={() => selectStage(item)} className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-bold ${stage === item ? "border-[#f6b800] bg-[#f6b800] text-black" : control}`}>{item}</button>)}</div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-end justify-between gap-3"><p className={`text-[9px] font-bold uppercase tracking-[0.14em] ${muted}`}>Tools</p><span className={`text-[9px] font-medium ${muted}`}>Everything stays here, off the chat screen</span></div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button type="button" disabled={disabled} onClick={() => { setEditorTool(null); setEditorText(""); setQuoteOpen((current) => !current); }} className="min-h-[56px] rounded-xl border border-[#f6b800]/55 bg-[#f6b800] px-3 py-2.5 text-left text-black disabled:opacity-40"><span className="block text-[11px] font-bold">Rate quote</span><span className="mt-0.5 block text-[9px] font-medium text-black/60">Structured quote builder</span></button>
                {workflowTools.map((tool) => <button key={tool.id} type="button" disabled={disabled} onClick={() => openToolEditor(tool)} className={`min-h-[56px] rounded-xl border px-3 py-2.5 text-left disabled:opacity-40 ${control}`}><span className="block text-[11px] font-bold">{tool.label}</span><span className={`mt-0.5 block text-[9px] font-medium leading-4 ${muted}`}>{tool.summary}</span></button>)}
              </div>
            </div>

            {editorTool ? (
              <div className={`mt-4 rounded-2xl border p-4 ${control}`}>
                <div className="flex items-start justify-between gap-3">
                  <div><h3 className="text-sm font-bold">{editorTool.label}</h3><p className={`mt-1 text-[10px] font-medium leading-4 ${muted}`}>Edit the details comfortably here. Nothing is sent automatically.</p></div>
                  <button type="button" onClick={() => { setEditorTool(null); setEditorText(""); }} className={`h-8 shrink-0 rounded-lg border px-2.5 text-[9px] font-bold ${control}`}>Back</button>
                </div>
                <textarea
                  autoFocus
                  value={editorText}
                  onChange={(event) => setEditorText(event.target.value)}
                  rows={12}
                  maxLength={4000}
                  className={`mt-3 min-h-[250px] w-full resize-y rounded-xl border p-3 text-[12px] font-medium leading-5 outline-none focus:border-[#f6b800] ${control}`}
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className={`text-[9px] font-medium ${muted}`}>When done, LoadLink compacts this into your normal message composer so you can review it once more before sending.</p>
                  <button type="button" disabled={!editorText.trim() || disabled} onClick={useEditedTool} className="h-10 shrink-0 rounded-xl bg-[#f6b800] px-4 text-[10px] font-bold text-black disabled:opacity-40">Use in chat</button>
                </div>
              </div>
            ) : null}

            {quoteOpen ? (
              <div className={`mt-4 grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 ${control}`}>
                <div className="sm:col-span-2"><div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-bold">Structured rate quote</h3><p className={`mt-0.5 text-[10px] font-medium ${muted}`}>Build the quote here, then send it as a branded quote card.</p></div><button type="button" onClick={() => setQuoteOpen(false)} className={`h-8 rounded-lg border px-2.5 text-[9px] font-bold ${control}`}>Close</button></div></div>
                <label className="text-[10px] font-semibold">Rate (R)<input value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="18500" className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm font-medium outline-none focus:border-[#f6b800] ${control}`} /></label>
                <label className="text-[10px] font-semibold">Rate unit<select value={unit} onChange={(event) => setUnit(event.target.value as StructuredQuote["unit"])} className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm font-medium outline-none focus:border-[#f6b800] ${control}`}><option value="total">Total trip</option><option value="km">Per km</option><option value="ton">Per ton</option><option value="day">Per day</option></select></label>
                <label className="text-[10px] font-semibold">Vehicle<input value={vehicle} onChange={(event) => setVehicle(event.target.value)} placeholder="34-ton side tipper" className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm font-medium outline-none focus:border-[#f6b800] ${control}`} /></label>
                <label className="text-[10px] font-semibold">Route<input value={route} onChange={(event) => setRoute(event.target.value)} placeholder="Pretoria → Durban" className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm font-medium outline-none focus:border-[#f6b800] ${control}`} /></label>
                <label className="text-[10px] font-semibold">Availability<input value={availability} onChange={(event) => setAvailability(event.target.value)} placeholder="Monday, Gauteng" className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm font-medium outline-none focus:border-[#f6b800] ${control}`} /></label>
                <label className="text-[10px] font-semibold">VAT<select value={vat} onChange={(event) => setVat(event.target.value as StructuredQuote["vat"])} className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm font-medium outline-none focus:border-[#f6b800] ${control}`}><option value="included">Included</option><option value="excluded">Excluded</option><option value="not_applicable">Not applicable</option></select></label>
                <label className="text-[10px] font-semibold sm:col-span-2">Terms<input value={terms} onChange={(event) => setTerms(event.target.value)} placeholder="Payment within 7 days of signed POD" className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm font-medium outline-none focus:border-[#f6b800] ${control}`} /></label>
                <button type="button" disabled={!amount.trim() || disabled || quoteBusy} onClick={() => void submitQuote()} className="h-11 rounded-xl bg-[#f6b800] text-[10px] font-bold uppercase tracking-wide text-black disabled:opacity-40 sm:col-span-2">{quoteBusy ? "Sending quote…" : "Send structured quote"}</button>
              </div>
            ) : null}

            <div className="mt-5">
              <p className={`mb-2 text-[9px] font-bold uppercase tracking-[0.14em] ${muted}`}>Professional replies</p>
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">{templates.map(([label, message]) => <button key={label} type="button" disabled={disabled} onClick={() => { onInsert(message); closePanel(); }} className={`shrink-0 rounded-xl border px-3 py-2.5 text-left text-[10px] font-bold disabled:opacity-40 ${control}`}>{label}</button>)}</div>
            </div>

            <div className="mt-5">
              <p className={`mb-2 text-[9px] font-bold uppercase tracking-[0.14em] ${muted}`}>Trip updates</p>
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">{STATUS_MESSAGES.map(([label, message]) => <button key={label} type="button" disabled={disabled} onClick={() => { onInsert(`LOAD STATUS — ${label.toUpperCase()}\n${message}`); closePanel(); }} className={`shrink-0 rounded-xl border px-3 py-2.5 text-left text-[10px] font-bold disabled:opacity-40 ${control}`}>{label}</button>)}</div>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
