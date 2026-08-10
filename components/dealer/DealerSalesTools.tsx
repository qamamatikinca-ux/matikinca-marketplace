"use client";

import { useEffect, useMemo, useState } from "react";
import { dealerFetch, formatZar } from "@/lib/dealer/client";
import type { DealerAppointment, DealerInventoryItem, DealerLead, DealerQuote, DealerTradeIn } from "@/lib/dealer/types";
import { EmptyState, Input, Modal, PrimaryButton, SectionHeading, Select, SecondaryButton, Surface, Textarea } from "./ui";

const FINANCE = [
  ["not_required", "Not required"], ["documents_needed", "Documents needed"], ["submitted", "Submitted"], ["under_review", "Under review"], ["approved", "Approved"], ["declined", "Declined"],
] as const;

export default function DealerSalesTools({ darkMode, selectedLead, inventory }: { darkMode: boolean; selectedLead?: DealerLead | null; inventory: DealerInventoryItem[] }) {
  const [quotes, setQuotes] = useState<DealerQuote[]>([]);
  const [appointments, setAppointments] = useState<DealerAppointment[]>([]);
  const [tradeIns, setTradeIns] = useState<DealerTradeIn[]>([]);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [quoteForm, setQuoteForm] = useState({ listing_id: selectedLead?.listing_id || "", vehicle_price: "", fees: "0", extras: "0", trade_in: "0", expires_at: "", notes: "" });
  const [appointmentForm, setAppointmentForm] = useState({ listing_id: selectedLead?.listing_id || "", starts_at: "", ends_at: "", location: "", notes: "" });
  const [tradeForm, setTradeForm] = useState({ make: "", model: "", vehicle_year: "", mileage_km: "", condition: "", expected_amount: "", registration_number: "", notes: "" });

  async function load() {
    try {
      const suffix = selectedLead?.id ? `?lead_id=${selectedLead.id}` : "";
      const [q, a, t] = await Promise.all([
        dealerFetch<{ items: DealerQuote[] }>(`/api/dealer/quotes${suffix}`),
        dealerFetch<{ items: DealerAppointment[] }>(`/api/dealer/appointments${suffix}`),
        dealerFetch<{ items: DealerTradeIn[] }>(`/api/dealer/trade-ins${suffix}`),
      ]);
      setQuotes(q.items || []); setAppointments(a.items || []); setTradeIns(t.items || []);
    } catch { /* The lead remains usable if one sales helper is unavailable. */ }
  }
  useEffect(() => { void load(); }, [selectedLead?.id]);
  useEffect(() => {
    setQuoteForm((v) => ({ ...v, listing_id: selectedLead?.listing_id || v.listing_id }));
    setAppointmentForm((v) => ({ ...v, listing_id: selectedLead?.listing_id || v.listing_id }));
  }, [selectedLead?.listing_id]);

  const selectedVehicle = useMemo(() => inventory.find((item) => item.id === quoteForm.listing_id), [inventory, quoteForm.listing_id]);
  useEffect(() => { if (selectedVehicle?.price_amount && !quoteForm.vehicle_price) setQuoteForm((v) => ({ ...v, vehicle_price: String(selectedVehicle.price_amount) })); }, [selectedVehicle?.id]);

  async function createQuote() {
    if (!selectedLead) return; setMessage("");
    try { await dealerFetch("/api/dealer/quotes", { method: "POST", body: JSON.stringify({ action: "create", lead_id: selectedLead.id, ...quoteForm }) }); setQuoteOpen(false); await load(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Quote could not be created."); }
  }
  async function createAppointment() {
    if (!selectedLead || !appointmentForm.starts_at) return; setMessage("");
    try { await dealerFetch("/api/dealer/appointments", { method: "POST", body: JSON.stringify({ action: "create", lead_id: selectedLead.id, ...appointmentForm }) }); setAppointmentOpen(false); await load(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Viewing could not be scheduled."); }
  }
  async function createTradeIn() {
    if (!selectedLead || !tradeForm.make.trim() || !tradeForm.model.trim()) return; setMessage("");
    try { await dealerFetch("/api/dealer/trade-ins", { method: "POST", body: JSON.stringify({ action: "create", lead_id: selectedLead.id, ...tradeForm }) }); setTradeOpen(false); await load(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Trade-in could not be saved."); }
  }
  async function finance(value: string) {
    if (!selectedLead) return; setMessage("");
    try { await dealerFetch("/api/dealer/leads", { method: "POST", body: JSON.stringify({ action: "finance", lead_id: selectedLead.id, finance_status: value }) }); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Finance status could not be updated."); }
  }
  async function markQuoteSent(id: string) { await dealerFetch("/api/dealer/quotes", { method: "POST", body: JSON.stringify({ action: "mark_sent", quote_id: id }) }); await load(); }
  async function quoteStatus(id: string, status: "accepted" | "declined" | "cancelled") { await dealerFetch("/api/dealer/quotes", { method: "POST", body: JSON.stringify({ action: "status", quote_id: id, status }) }); await load(); }
  async function appointmentStatus(id: string, status: "scheduled" | "completed" | "cancelled" | "no_show") { await dealerFetch("/api/dealer/appointments", { method: "POST", body: JSON.stringify({ action: "status", appointment_id: id, status }) }); await load(); }
  async function tradeInStatus(id: string, status: DealerTradeIn["status"]) { await dealerFetch("/api/dealer/trade-ins", { method: "POST", body: JSON.stringify({ action: "status", trade_in_id: id, status }) }); await load(); }
  async function shareQuote(id: string) {
    setMessage("");
    try {
      const result = await dealerFetch<{ share_token: string }>("/api/dealer/quotes", { method: "POST", body: JSON.stringify({ action: "share", quote_id: id }) });
      const url = `${window.location.origin}/dealer/quote/share/${result.share_token}`;
      if (navigator.share) { try { await navigator.share({ title: "LoadLink vehicle quote", url }); await load(); return; } catch {} }
      await navigator.clipboard.writeText(url); setMessage("Quote link copied."); await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Quote link could not be created."); }
  }

  if (!selectedLead) return <Surface darkMode={darkMode} className="overflow-hidden"><EmptyState title="Select a lead" detail="Quotes, viewings, trade-ins and sales actions appear here when you open a lead." /></Surface>;

  return <div className="grid gap-4">
    <Surface darkMode={darkMode} className="p-4 sm:p-5">
      <SectionHeading title={selectedLead.customer_name || "Lead"} detail={`${selectedLead.listing_title || "No vehicle selected"} · ${selectedLead.source}`} />
      <div className="mt-4 flex flex-wrap gap-2"><PrimaryButton type="button" onClick={() => setQuoteOpen(true)}>Create quote</PrimaryButton><SecondaryButton darkMode={darkMode} type="button" onClick={() => setAppointmentOpen(true)}>Book viewing</SecondaryButton><SecondaryButton darkMode={darkMode} type="button" onClick={() => setTradeOpen(true)}>Capture trade-in</SecondaryButton>{selectedLead.customer_phone ? <a className={`flex min-h-11 items-center rounded-xl border px-4 text-sm font-black ${darkMode ? "border-white/14" : "border-black/10"}`} href={`tel:${selectedLead.customer_phone}`}>Call</a> : null}{selectedLead.customer_phone ? <a className={`flex min-h-11 items-center rounded-xl border px-4 text-sm font-black ${darkMode ? "border-white/14" : "border-black/10"}`} href={`https://wa.me/${selectedLead.customer_phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">WhatsApp</a> : null}</div>
      <div className="mt-4 max-w-sm"><label className="text-xs font-black">Finance<Select darkMode={darkMode} className="mt-1" value={selectedLead.finance_status || (selectedLead.finance_required ? "documents_needed" : "not_required")} onChange={(e) => void finance(e.target.value)}>{FINANCE.map(([value,label]) => <option value={value} key={value}>{label}</option>)}</Select></label></div>
      <SalesTemplates lead={selectedLead} inventory={inventory} darkMode={darkMode} />
      {message ? <p className="mt-3 text-sm font-bold text-red-500">{message}</p> : null}
    </Surface>

    <Surface darkMode={darkMode} className="overflow-hidden"><div className="border-b border-current/10 px-4 py-3"><SectionHeading title="Quotes" /></div>{quotes.length ? <div className="divide-y divide-current/10">{quotes.slice(0, 5).map((q) => <div key={q.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div><div className="text-sm font-black">{q.quote_number}</div><div className="mt-1 text-xs opacity-50">{formatZar(q.total_amount)} · {q.status}</div></div><div className="flex flex-wrap items-center gap-3">{q.status === "draft" ? <button type="button" onClick={() => void markQuoteSent(q.id)} className="text-xs font-black">Mark sent</button> : null}{q.status === "sent" ? <button type="button" onClick={() => void quoteStatus(q.id, "accepted")} className="text-xs font-black">Accepted</button> : null}{q.status === "sent" ? <button type="button" onClick={() => void quoteStatus(q.id, "declined")} className="text-xs font-black opacity-65">Declined</button> : null}{["draft","sent"].includes(q.status) ? <button type="button" onClick={() => void quoteStatus(q.id, "cancelled")} className="text-xs font-black opacity-50">Cancel</button> : null}<button type="button" onClick={() => void shareQuote(q.id)} className="text-xs font-black">Share quote</button><a href={`/dealer/quote/${q.id}`} target="_blank" className="text-xs font-black">Open →</a></div></div>)}</div> : <EmptyState title="No quotes yet" detail="Create a clean LoadLink quote that can be printed or shared outside the platform." />}</Surface>

    <div className="grid gap-4 xl:grid-cols-2"><Surface darkMode={darkMode} className="overflow-hidden"><div className="border-b border-current/10 px-4 py-3"><SectionHeading title="Viewings" /></div>{appointments.length ? <div className="divide-y divide-current/10">{appointments.slice(0, 4).map((a) => <div key={a.id} className="px-4 py-3"><div className="text-sm font-black">{new Date(a.starts_at).toLocaleString("en-ZA", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div><div className="mt-1 text-xs opacity-50">{a.location || "Dealership"} · {a.status.replace("_", " ")}</div>{a.status === "scheduled" ? <div className="mt-2 flex flex-wrap gap-3"><button type="button" className="text-xs font-black" onClick={() => void appointmentStatus(a.id, "completed")}>Completed</button><button type="button" className="text-xs font-black opacity-65" onClick={() => void appointmentStatus(a.id, "no_show")}>No-show</button><button type="button" className="text-xs font-black opacity-50" onClick={() => void appointmentStatus(a.id, "cancelled")}>Cancel</button></div> : null}</div>)}</div> : <EmptyState title="No viewing booked" detail="Schedule a customer viewing without leaving the lead." />}</Surface><Surface darkMode={darkMode} className="overflow-hidden"><div className="border-b border-current/10 px-4 py-3"><SectionHeading title="Trade-in" /></div>{tradeIns.length ? <div className="divide-y divide-current/10">{tradeIns.slice(0, 3).map((t) => <div key={t.id} className="px-4 py-3"><div className="text-sm font-black">{[t.vehicle_year,t.make,t.model].filter(Boolean).join(" ")}</div><div className="mt-1 text-xs opacity-50">{t.mileage_km ? `${Number(t.mileage_km).toLocaleString()} km · ` : ""}{t.expected_amount ? `${formatZar(t.expected_amount)} · ` : ""}{t.status}</div><div className="mt-2 max-w-[190px]"><Select darkMode={darkMode} value={t.status} onChange={(e) => void tradeInStatus(t.id, e.target.value as DealerTradeIn["status"])}><option value="captured">Captured</option><option value="reviewing">Reviewing</option><option value="valued">Valued</option><option value="accepted">Accepted</option><option value="declined">Declined</option></Select></div></div>)}</div> : <EmptyState title="No trade-in captured" detail="Record the customer's current vehicle and expected allowance." />}</Surface></div>

    <Modal open={quoteOpen} onClose={() => setQuoteOpen(false)} darkMode={darkMode} title="Create quote"><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-black">Vehicle<Select darkMode={darkMode} className="mt-1" value={quoteForm.listing_id} onChange={(e) => setQuoteForm({ ...quoteForm, listing_id: e.target.value, vehicle_price: String(inventory.find((i) => i.id === e.target.value)?.price_amount || "") })}><option value="">Choose vehicle</option>{inventory.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</Select></label><label className="text-xs font-black">Vehicle price<Input darkMode={darkMode} className="mt-1" inputMode="decimal" value={quoteForm.vehicle_price} onChange={(e) => setQuoteForm({ ...quoteForm, vehicle_price: e.target.value })} /></label><label className="text-xs font-black">Fees<Input darkMode={darkMode} className="mt-1" inputMode="decimal" value={quoteForm.fees} onChange={(e) => setQuoteForm({ ...quoteForm, fees: e.target.value })} /></label><label className="text-xs font-black">Extras<Input darkMode={darkMode} className="mt-1" inputMode="decimal" value={quoteForm.extras} onChange={(e) => setQuoteForm({ ...quoteForm, extras: e.target.value })} /></label><label className="text-xs font-black">Trade-in allowance<Input darkMode={darkMode} className="mt-1" inputMode="decimal" value={quoteForm.trade_in} onChange={(e) => setQuoteForm({ ...quoteForm, trade_in: e.target.value })} /></label><label className="text-xs font-black">Valid until<Input darkMode={darkMode} className="mt-1" type="date" value={quoteForm.expires_at} onChange={(e) => setQuoteForm({ ...quoteForm, expires_at: e.target.value })} /></label></div><label className="mt-3 block text-xs font-black">Notes<Textarea darkMode={darkMode} className="mt-1" value={quoteForm.notes} onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })} /></label><div className="mt-5 flex justify-end"><PrimaryButton type="button" onClick={createQuote}>Save quote</PrimaryButton></div></Modal>

    <Modal open={appointmentOpen} onClose={() => setAppointmentOpen(false)} darkMode={darkMode} title="Book viewing"><div className="grid gap-3"><label className="text-xs font-black">Vehicle<Select darkMode={darkMode} className="mt-1" value={appointmentForm.listing_id} onChange={(e) => setAppointmentForm({ ...appointmentForm, listing_id: e.target.value })}><option value="">Choose vehicle</option>{inventory.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</Select></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-black">Starts<Input darkMode={darkMode} className="mt-1" type="datetime-local" value={appointmentForm.starts_at} onChange={(e) => setAppointmentForm({ ...appointmentForm, starts_at: e.target.value })} /></label><label className="text-xs font-black">Ends<Input darkMode={darkMode} className="mt-1" type="datetime-local" value={appointmentForm.ends_at} onChange={(e) => setAppointmentForm({ ...appointmentForm, ends_at: e.target.value })} /></label></div><label className="text-xs font-black">Location<Input darkMode={darkMode} className="mt-1" value={appointmentForm.location} onChange={(e) => setAppointmentForm({ ...appointmentForm, location: e.target.value })} /></label><label className="text-xs font-black">Notes<Textarea darkMode={darkMode} className="mt-1" value={appointmentForm.notes} onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })} /></label></div><div className="mt-5 flex justify-end"><PrimaryButton type="button" onClick={createAppointment}>Book viewing</PrimaryButton></div></Modal>

    <Modal open={tradeOpen} onClose={() => setTradeOpen(false)} darkMode={darkMode} title="Capture trade-in"><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-black">Make<Input darkMode={darkMode} className="mt-1" value={tradeForm.make} onChange={(e) => setTradeForm({ ...tradeForm, make: e.target.value })} /></label><label className="text-xs font-black">Model<Input darkMode={darkMode} className="mt-1" value={tradeForm.model} onChange={(e) => setTradeForm({ ...tradeForm, model: e.target.value })} /></label><label className="text-xs font-black">Year<Input darkMode={darkMode} className="mt-1" type="number" min={1980} max={new Date().getFullYear()+1} value={tradeForm.vehicle_year} onChange={(e) => setTradeForm({ ...tradeForm, vehicle_year: e.target.value })} /></label><label className="text-xs font-black">Mileage<Input darkMode={darkMode} className="mt-1" type="number" min={0} value={tradeForm.mileage_km} onChange={(e) => setTradeForm({ ...tradeForm, mileage_km: e.target.value })} /></label><label className="text-xs font-black">Condition<Input darkMode={darkMode} className="mt-1" value={tradeForm.condition} onChange={(e) => setTradeForm({ ...tradeForm, condition: e.target.value })} /></label><label className="text-xs font-black">Customer expectation<Input darkMode={darkMode} className="mt-1" inputMode="decimal" value={tradeForm.expected_amount} onChange={(e) => setTradeForm({ ...tradeForm, expected_amount: e.target.value })} /></label><label className="text-xs font-black sm:col-span-2">Registration<Input darkMode={darkMode} className="mt-1" value={tradeForm.registration_number} onChange={(e) => setTradeForm({ ...tradeForm, registration_number: e.target.value })} /></label></div><label className="mt-3 block text-xs font-black">Notes<Textarea darkMode={darkMode} className="mt-1" value={tradeForm.notes} onChange={(e) => setTradeForm({ ...tradeForm, notes: e.target.value })} /></label><div className="mt-5 flex justify-end"><PrimaryButton type="button" onClick={createTradeIn}>Save trade-in</PrimaryButton></div></Modal>
  </div>;
}


function SalesTemplates({ lead, inventory, darkMode }: { lead: DealerLead; inventory: DealerInventoryItem[]; darkMode: boolean }) {
  const vehicle = inventory.find((item) => item.id === lead.listing_id);
  const firstName = (lead.customer_name || "there").trim().split(/\s+/)[0];
  const vehicleName = lead.listing_title || vehicle?.title || "the vehicle";
  const link = typeof window !== "undefined" && lead.listing_id ? `${window.location.origin}/vehicles/${lead.listing_id}` : "";
  const templates = [
    `Hi ${firstName}. ${vehicleName} is currently available. I can send the full specifications or arrange a viewing if that suits you.`,
    `Hi ${firstName}. I’m following up regarding ${vehicleName}. Let me know if you would like to continue with a viewing, quote or finance discussion.`,
    link ? `Here is the LoadLink vehicle page for ${vehicleName}: ${link}` : `I can send you the full vehicle details for ${vehicleName}.`,
  ];
  return <div className={`mt-4 border-t pt-4 ${darkMode ? "border-white/10" : "border-black/10"}`}><div className="mb-2 text-[10px] font-black uppercase tracking-[.1em] opacity-40">Quick replies</div><div className="grid gap-2">{templates.map((text,index)=><button key={index} type="button" onClick={()=>navigator.clipboard?.writeText(text)} className={`w-full border p-3 text-left text-xs font-semibold leading-5 transition hover:border-current/35 ${darkMode?"border-white/10":"border-black/10"}`}><span className="line-clamp-2">{text}</span><span className="mt-1 block text-[10px] font-black opacity-45">Copy</span></button>)}</div></div>;
}
