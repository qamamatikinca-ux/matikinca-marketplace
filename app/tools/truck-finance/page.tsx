"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import { formatListingRate } from "@/lib/formatCurrency";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type VehicleRow = {
  id: string;
  title?: string | null;
  city?: string | null;
  vehicle_group?: string | null;
  rate?: string | null;
  description?: string | null;
  photos?: string[] | null;
  listing_kind?: string | null;
  created_at?: string | null;
};

type FinanceMatch = VehicleRow & { price: number; monthly: number };
type RentalMatch = VehicleRow & { rental: number; period: string };

function money(value: string | null | undefined) {
  const compact = String(value || "").replace(/\s+/g, "").replace(/,/g, "");
  const match = compact.match(/(?:R|ZAR)?([0-9]+(?:\.[0-9]+)?)/i);
  const parsed = match ? Number(match[1]) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function readMeta(description: string | null | undefined, label: string) {
  return String(description || "").match(new RegExp(`^${label}:\\s*([^\\n]+)`, "im"))?.[1]?.trim() || "";
}

function isVehicleListing(row: VehicleRow) {
  const kind = String(row.listing_kind || "").toLowerCase();
  if (["vehicle", "asset", "truck_sale", "vehicle_listing"].includes(kind)) return true;
  return /^Listing type:\s*(Truck|Trailer|Mobile Unit)/im.test(String(row.description || ""));
}

function offerMode(row: VehicleRow) {
  const offer = readMeta(row.description, "Offer").toLowerCase();
  if (offer.includes("rental only")) return "rental";
  if (offer.includes("sale or rental")) return "sale_or_rental";
  if (offer.includes("application") || offer.includes("poa")) return "poa";
  return "sale";
}

function salePrice(row: VehicleRow) {
  const explicit = readMeta(row.description, "Sale price");
  if (explicit) return money(explicit);
  return offerMode(row) === "rental" || offerMode(row) === "poa" ? 0 : money(row.rate);
}

function rentalPrice(row: VehicleRow) {
  const explicit = readMeta(row.description, "Rental rate");
  if (explicit) return money(explicit);
  return offerMode(row) === "rental" ? money(row.rate) : 0;
}

function rentalPeriod(row: VehicleRow) {
  const raw = readMeta(row.description, "Rental rate") || String(row.rate || "");
  if (/\/\s*day|per\s*day/i.test(raw)) return "day";
  if (/\/\s*week|per\s*week/i.test(raw)) return "week";
  return "month";
}

function annuityFactor(annualPct: number, months: number) {
  const rate = Math.max(0, annualPct) / 100 / 12;
  if (months <= 0) return 0;
  if (rate === 0) return months;
  return (1 - Math.pow(1 + rate, -months)) / rate;
}

function principalFromPayment(monthlyPayment: number, annualPct: number, months: number) {
  if (monthlyPayment <= 0 || months <= 0) return 0;
  return monthlyPayment * annuityFactor(annualPct, months);
}

function paymentForPrincipal(principal: number, annualPct: number, months: number) {
  if (principal <= 0 || months <= 0) return 0;
  const factor = annuityFactor(annualPct, months);
  return factor > 0 ? principal / factor : 0;
}

function rand(value: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value)).replace(/\u00a0/g, " ");
}

export default function CalculatorPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [monthlyBudget, setMonthlyBudget] = useState(30000);
  const [term, setTerm] = useState(72);
  const [deposit, setDeposit] = useState(35000);
  const [tradeIn, setTradeIn] = useState(0);
  const [annualRate, setAnnualRate] = useState(10.5);
  const [rows, setRows] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/job-listings?t=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (active) setRows(((payload.rows || []) as VehicleRow[]).filter(isVehicleListing));
      })
      .catch(() => active && setRows([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const financedPrincipal = useMemo(
    () => principalFromPayment(monthlyBudget, annualRate, term),
    [annualRate, monthlyBudget, term],
  );
  const upfront = Math.max(0, deposit) + Math.max(0, tradeIn);
  const buyingPower = financedPrincipal + upfront;

  const financeMatches = useMemo<FinanceMatch[]>(() => rows
    .map((row) => {
      const price = salePrice(row);
      if (!price) return null;
      const principal = Math.max(0, price - upfront);
      const monthly = paymentForPrincipal(principal, annualRate, term);
      if (price > buyingPower + 1 || monthly > monthlyBudget + 1) return null;
      return { ...row, price, monthly } as FinanceMatch;
    })
    .filter((row): row is FinanceMatch => Boolean(row))
    .sort((first, second) => Math.abs(buyingPower - first.price) - Math.abs(buyingPower - second.price))
    .slice(0, 8), [annualRate, buyingPower, monthlyBudget, rows, term, upfront]);

  const rentalMatches = useMemo<RentalMatch[]>(() => rows
    .map((row) => {
      const rental = rentalPrice(row);
      const period = rentalPeriod(row);
      if (!rental || period !== "month" || rental > monthlyBudget) return null;
      return { ...row, rental, period } as RentalMatch;
    })
    .filter((row): row is RentalMatch => Boolean(row))
    .sort((first, second) => second.rental - first.rental)
    .slice(0, 6), [monthlyBudget, rows]);

  const guidance = useMemo(() => {
    if (monthlyBudget <= 0) return "Enter a comfortable monthly budget to calculate a realistic buying range.";
    if (annualRate <= 0) return "Use the interest rate quoted by your lender for a closer estimate.";
    if (financeMatches.length) return `${financeMatches.length} approved LoadLink ${financeMatches.length === 1 ? "vehicle fits" : "vehicles fit"} your current figures. Open a match below to compare its actual listing details.`;
    if (rentalMatches.length) return "No purchase match fits yet, but approved rental units are available within your monthly budget.";
    if (deposit < monthlyBudget) return "A larger deposit can improve the purchase range without increasing the monthly repayment.";
    return "No approved LoadLink stock currently fits these figures. Adjust one value or browse the marketplace for a lower target price.";
  }, [deposit, financeMatches.length, monthlyBudget, rentalMatches.length]);

  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const surface = darkMode ? "border-white/12 bg-[#0b0b0b]" : "border-black/[.08] bg-white";
  const muted = darkMode ? "text-white/52" : "text-black/52";
  const input = `h-16 w-full rounded-[18px] border px-4 text-base font-bold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.055] text-white" : "border-black/[.09] bg-white text-black"}`;

  return (
    <main className={`min-h-screen ${page}`}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="mx-auto max-w-5xl px-4 pb-10 pt-7 md:px-7 md:pt-10">
        <div className={`overflow-hidden rounded-[30px] border shadow-[0_24px_70px_rgba(0,0,0,.10)] ${surface}`}>
          <div className="relative aspect-[16/8.2] min-h-[250px] overflow-hidden bg-black sm:aspect-[16/7]">
            <img src="/images/truck-1.jpg" alt="Commercial truck" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/8 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-8">
              <h1 className="text-4xl font-black tracking-[-.05em] md:text-5xl">Calculator</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/76">Plan a realistic commercial-vehicle budget, then compare it with approved LoadLink vehicles and units.</p>
            </div>
          </div>

          <div className="px-5 pb-6 pt-7 text-center md:px-8 md:pb-8">
            <p className={`text-sm font-semibold ${muted}`}>Estimated buying power</p>
            <p className="mt-2 text-5xl font-black tracking-[-.055em] md:text-6xl">{rand(buyingPower)}</p>
            <p className={`mx-auto mt-3 max-w-xl text-xs font-semibold leading-5 ${muted}`}>Based on the monthly budget, term, deposit, trade-in and interest rate you enter below. This is a planning estimate, not lender approval.</p>
          </div>

          <div className="border-t border-current/10 p-5 md:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Monthly budget"><input type="number" min="0" step="500" value={monthlyBudget} onChange={(event) => setMonthlyBudget(Number(event.target.value || 0))} className={input} /></Field>
              <Field label="Loan term"><select value={term} onChange={(event) => setTerm(Number(event.target.value))} className={`${input} appearance-none`}><option value={36}>36 months</option><option value={48}>48 months</option><option value={60}>60 months</option><option value={72}>72 months</option><option value={84}>84 months</option></select></Field>
              <Field label="Trade-in amount"><input type="number" min="0" step="5000" value={tradeIn} onChange={(event) => setTradeIn(Number(event.target.value || 0))} className={input} /></Field>
              <Field label="Deposit amount"><input type="number" min="0" step="5000" value={deposit} onChange={(event) => setDeposit(Number(event.target.value || 0))} className={input} /></Field>
              <div className="sm:col-span-2"><Field label="Interest rate"><input type="number" min="0" max="40" step="0.1" value={annualRate} onChange={(event) => setAnnualRate(Number(event.target.value || 0))} className={input} /></Field><p className={`mt-2 text-xs font-semibold ${muted}`}>Use your lender’s quoted rate where possible.</p></div>
            </div>

            <div className={`mt-5 rounded-[20px] border p-4 ${darkMode ? "border-white/10 bg-white/[.035]" : "border-black/[.06] bg-black/[.025]"}`}>
              <p className="text-sm font-black">Best next step</p>
              <p className={`mt-1 text-sm font-semibold leading-6 ${muted}`}>{guidance}</p>
            </div>

            <a href="#calculator-matches" className="mt-5 flex min-h-16 w-full items-center justify-center rounded-[18px] bg-[#f6b800] px-6 text-base font-black text-black transition active:scale-[.99]">See matching LoadLink vehicles</a>
          </div>
        </div>

        <section id="calculator-matches" className="scroll-mt-24 pt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-[-.04em]">Vehicles within your buying range</h2>
              <p className={`mt-2 max-w-2xl text-sm font-semibold ${muted}`}>Only approved LoadLink listings whose advertised price and estimated repayment fit your figures are shown.</p>
            </div>
            <Link href="/list-your-vehicle#vehicle-marketplace" className="text-sm font-black underline underline-offset-4">Browse all</Link>
          </div>

          {loading ? <div className="mt-5 h-40 animate-pulse rounded-[24px] bg-current/5" /> : financeMatches.length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {financeMatches.map((row) => <VehicleMatchCard key={row.id} row={row} darkMode={darkMode} secondary={`Est. ${rand(row.monthly)} / month`} />)}
            </div>
          ) : (
            <EmptyState darkMode={darkMode} title="No approved vehicle matches these figures yet" text="Adjust your monthly budget, deposit, trade-in, term or interest rate, or browse approved stock." />
          )}
        </section>

        <section className="pt-10">
          <h2 className="text-3xl font-black tracking-[-.04em]">Units available within your rental budget</h2>
          <p className={`mt-2 max-w-2xl text-sm font-semibold ${muted}`}>Only approved listings with an actual monthly rental rate at or below your entered monthly budget are shown.</p>
          {rentalMatches.length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rentalMatches.map((row) => <VehicleMatchCard key={row.id} row={row} darkMode={darkMode} secondary={`${rand(row.rental)} / ${row.period}`} />)}
            </div>
          ) : (
            <EmptyState darkMode={darkMode} title="No monthly rental match yet" text="Browse approved stock or check again as new rental units are added." />
          )}
        </section>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold">{label}</span>{children}</label>;
}

function EmptyState({ darkMode, title, text }: { darkMode: boolean; title: string; text: string }) {
  return <div className={`mt-5 rounded-[24px] border p-7 text-center ${darkMode ? "border-white/10 bg-white/[.035]" : "border-black/[.07] bg-white"}`}><h3 className="text-lg font-black">{title}</h3><p className={`mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 ${darkMode ? "text-white/52" : "text-black/52"}`}>{text}</p></div>;
}

function VehicleMatchCard({ row, darkMode, secondary }: { row: VehicleRow; darkMode: boolean; secondary: string }) {
  const surface = darkMode ? "border-white/10 bg-white/[.04]" : "border-black/[.08] bg-white";
  const muted = darkMode ? "text-white/50" : "text-black/50";
  return (
    <Link href={`/jobs?portal=asset&search=${encodeURIComponent(row.title || "vehicle")}#job-${row.id}`} className={`overflow-hidden rounded-[22px] border ${surface}`}>
      <div className="aspect-[16/10] overflow-hidden bg-black/10">{row.photos?.[0] ? <img src={row.photos[0]} alt={row.title || "LoadLink vehicle"} className="h-full w-full object-cover" /> : <img src="/images/truck-1.jpg" alt="Commercial truck" className="h-full w-full object-cover" />}</div>
      <div className="p-4"><p className={`text-[10px] font-bold uppercase tracking-[.08em] ${muted}`}>{row.city || "South Africa"} · {readMeta(row.description, "Vehicle subtype") || row.vehicle_group || "Commercial vehicle"}</p><h3 className="mt-2 text-lg font-black">{row.title || "Commercial vehicle"}</h3><p className="mt-3 text-xl font-black">{formatListingRate(row.rate)}</p><p className={`mt-1 text-xs font-black ${muted}`}>{secondary}</p></div>
    </Link>
  );
}
