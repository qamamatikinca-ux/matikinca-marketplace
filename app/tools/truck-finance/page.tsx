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
      .catch(() => {
        if (active) setRows([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
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

  const advice = useMemo(() => {
    if (monthlyBudget <= 0) return "Enter the amount you can comfortably spend each month to see a realistic purchase window.";
    if (annualRate <= 0) return "Check the interest rate you entered. Use the rate offered by your lender for the closest estimate.";
    if (financeMatches.length) {
      const closest = financeMatches[0];
      return `${financeMatches.length} approved LoadLink ${financeMatches.length === 1 ? "listing fits" : "listings fit"} this budget. The closest match is ${closest.title || "an available vehicle"} at an estimated ${rand(closest.monthly)} per month before lender fees and insurance.`;
    }
    if (upfront < buyingPower * 0.05) return "No approved listing currently fits this outcome. A larger deposit or trade-in can increase your purchase range without increasing the monthly budget.";
    return "No approved listing currently fits this outcome. Try a lower vehicle price, a larger deposit, or compare the rental options below.";
  }, [annualRate, buyingPower, financeMatches, monthlyBudget, upfront]);

  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const glass = darkMode ? "border-white/12 bg-black/62" : "border-white/80 bg-white/72";
  const muted = darkMode ? "text-white/52" : "text-black/52";
  const input = `h-14 w-full rounded-[17px] border px-4 text-base font-black outline-none backdrop-blur-xl focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.055] text-white" : "border-black/8 bg-white/80 text-black"}`;

  return (
    <main className={`min-h-screen ${page}`}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="relative min-h-[360px] overflow-hidden bg-black text-white md:min-h-[430px]">
        <img src="/images/jobs/jobs-hero-fleet.jpg" alt="Commercial truck" className="absolute inset-0 h-full w-full object-cover opacity-76" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/76 to-black/22" />
        <div className="relative mx-auto flex min-h-[360px] max-w-6xl flex-col justify-end px-5 pb-9 pt-20 md:min-h-[430px] md:px-7 md:pb-12">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#f6b800]">LoadLink tools</p>
          <h1 className="mt-3 max-w-4xl text-5xl font-black leading-[.94] tracking-[-.055em] md:text-7xl">Calculator</h1>
          <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/72 md:text-base">Set the figures that matter, estimate your buying power, then see approved LoadLink vehicles and units that actually fit the result.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 md:px-7 md:py-12">
        <div className={`loadlink-glass overflow-hidden rounded-[30px] border shadow-[0_24px_70px_rgba(0,0,0,.08)] ${glass}`}>
          <div className="grid gap-0 lg:grid-cols-[1.05fr_.95fr]">
            <div className="p-5 md:p-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-black uppercase tracking-[.09em]">Monthly budget<input type="number" min="0" step="500" value={monthlyBudget} onChange={(event) => setMonthlyBudget(Number(event.target.value || 0))} className={`mt-2 ${input}`} /></label>
                <label className="text-xs font-black uppercase tracking-[.09em]">Loan term<select value={term} onChange={(event) => setTerm(Number(event.target.value))} className={`mt-2 ${input}`}><option value={36}>36 months</option><option value={48}>48 months</option><option value={60}>60 months</option><option value={72}>72 months</option><option value={84}>84 months</option></select></label>
                <label className="text-xs font-black uppercase tracking-[.09em]">Trade-in amount<input type="number" min="0" step="5000" value={tradeIn} onChange={(event) => setTradeIn(Number(event.target.value || 0))} className={`mt-2 ${input}`} /></label>
                <label className="text-xs font-black uppercase tracking-[.09em]">Deposit amount<input type="number" min="0" step="5000" value={deposit} onChange={(event) => setDeposit(Number(event.target.value || 0))} className={`mt-2 ${input}`} /></label>
                <label className="text-xs font-black uppercase tracking-[.09em] sm:col-span-2">Interest rate<input type="number" min="0" max="40" step="0.1" value={annualRate} onChange={(event) => setAnnualRate(Number(event.target.value || 0))} className={`mt-2 ${input}`} /><span className={`mt-2 block text-[11px] normal-case tracking-normal ${muted}`}>Use the rate quoted to you for the closest estimate.</span></label>
              </div>
            </div>

            <div className="border-t border-current/10 bg-black p-5 text-white lg:border-l lg:border-t-0 md:p-7">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#f6b800]">Estimated buying power</p>
              <p className="mt-3 text-5xl font-black tracking-[-.055em]">{rand(buyingPower)}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <Metric label="Monthly budget" value={rand(monthlyBudget)} />
                <Metric label="Term" value={`${term} months`} />
                <Metric label="Interest rate" value={`${annualRate.toFixed(2)}%`} />
              </div>
              <div className="mt-5 rounded-2xl border border-[#f6b800]/30 bg-[#f6b800]/8 p-4">
                <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#f6b800]">LDAI guidance</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/72">{advice}</p>
              </div>
            </div>
          </div>
        </div>

        <p className={`mx-auto mt-4 max-w-4xl text-center text-xs font-semibold leading-5 ${muted}`}>Planning estimate based on the figures you enter and current approved LoadLink listing prices. It is not finance approval. Lender fees, insurance, taxes and the final rate offered to you can change the result.</p>

        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#b88900]">Approved LoadLink stock</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-.04em]">Vehicles your budget can finance</h2>
              <p className={`mt-2 text-sm font-semibold ${muted}`}>Only approved listings whose advertised price and estimated repayment fit your figures are shown.</p>
            </div>
            <Link href="/list-your-vehicle#vehicle-marketplace" className="text-xs font-black underline underline-offset-4">Browse all vehicles</Link>
          </div>

          {loading ? <div className="mt-5 h-40 animate-pulse rounded-[24px] bg-current/5" /> : financeMatches.length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {financeMatches.map((row) => <VehicleMatchCard key={row.id} row={row} darkMode={darkMode} secondary={`Est. ${rand(row.monthly)} / month`} />)}
            </div>
          ) : (
            <div className={`loadlink-glass mt-5 rounded-[24px] border p-7 text-center ${glass}`}>
              <h3 className="text-xl font-black">No approved vehicle currently matches this budget</h3>
              <p className={`mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 ${muted}`}>Adjust the monthly budget, deposit, trade-in, term or interest rate, or browse all approved stock.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => setDeposit((current) => current + 25000)} className="rounded-xl bg-[#f6b800] px-4 py-3 text-xs font-black text-black">Add R25 000 deposit</button>
                <Link href="/list-your-vehicle#vehicle-marketplace" className={`rounded-xl border px-4 py-3 text-xs font-black ${darkMode ? "border-white/15" : "border-black/10"}`}>Browse approved stock</Link>
              </div>
            </div>
          )}
        </section>

        <section className="mt-10">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#b88900]">Budget alternatives</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-.04em]">Units available within your monthly budget</h2>
            <p className={`mt-2 text-sm font-semibold ${muted}`}>Monthly rental listings are shown only when the advertised monthly rate fits the budget above.</p>
          </div>
          {rentalMatches.length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rentalMatches.map((row) => <VehicleMatchCard key={row.id} row={row} darkMode={darkMode} secondary={`${rand(row.rental)} / ${row.period}`} />)}
            </div>
          ) : (
            <div className={`loadlink-glass mt-5 rounded-[24px] border p-6 ${glass}`}>
              <p className="font-black">No approved monthly rental unit matches this budget yet.</p>
              <p className={`mt-2 text-sm font-semibold ${muted}`}>Browse approved listings or check again as new rental stock is added.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><p className="text-[9px] font-black uppercase tracking-[.12em] text-white/42">{label}</p><p className="mt-2 text-lg font-black">{value}</p></div>;
}

function VehicleMatchCard({ row, darkMode, secondary }: { row: VehicleRow; darkMode: boolean; secondary: string }) {
  const surface = darkMode ? "border-white/10 bg-white/[.04]" : "border-black/8 bg-white";
  const muted = darkMode ? "text-white/50" : "text-black/50";
  return (
    <Link href={`/jobs?portal=asset&search=${encodeURIComponent(row.title || "vehicle")}#job-${row.id}`} className={`overflow-hidden rounded-[22px] border ${surface}`}>
      <div className="aspect-[16/10] overflow-hidden bg-black/10">{row.photos?.[0] ? <img src={row.photos[0]} alt={row.title || "LoadLink vehicle"} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs font-black opacity-30">LoadLink</div>}</div>
      <div className="p-4"><p className={`text-[10px] font-black uppercase tracking-[.1em] ${muted}`}>{row.city || "South Africa"} · {readMeta(row.description, "Vehicle subtype") || row.vehicle_group || "Commercial vehicle"}</p><h3 className="mt-2 text-lg font-black">{row.title || "Commercial vehicle"}</h3><p className="mt-3 text-xl font-black text-[#b88900]">{formatListingRate(row.rate)}</p><p className={`mt-1 text-xs font-black ${muted}`}>{secondary}</p></div>
    </Link>
  );
}
