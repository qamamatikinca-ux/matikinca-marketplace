"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import { formatListingRate } from "@/lib/formatCurrency";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type CreditProfile = "excellent" | "good" | "building" | "custom";
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

const PRIME_REFERENCE = 10.5;
const SARB_POLICY_REFERENCE = 7.0;
const MARKET_REFERENCE_DATE = "15 August 2026";
const PROFILE_RATES: Record<Exclude<CreditProfile, "custom">, number> = {
  excellent: 11.0,
  good: 12.5,
  building: 15.0,
};

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

function principalFromPayment(monthlyPayment: number, annualPct: number, months: number, balloonAmount: number) {
  if (monthlyPayment <= 0 || months <= 0) return 0;
  const rate = Math.max(0, annualPct) / 100 / 12;
  const residualPv = rate === 0 ? Math.max(0, balloonAmount) : Math.max(0, balloonAmount) / Math.pow(1 + rate, months);
  return monthlyPayment * annuityFactor(annualPct, months) + residualPv;
}

function paymentForPrincipal(principal: number, annualPct: number, months: number, balloonAmount: number) {
  if (principal <= 0 || months <= 0) return 0;
  const rate = Math.max(0, annualPct) / 100 / 12;
  const balloon = Math.min(Math.max(0, balloonAmount), principal * 0.9);
  if (rate === 0) return Math.max(0, principal - balloon) / months;
  const balloonPv = balloon / Math.pow(1 + rate, months);
  return Math.max(0, principal - balloonPv) / annuityFactor(annualPct, months);
}

function rand(value: number) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(Math.max(0, value)).replace(/\u00a0/g, " ");
}

export default function TruckFinanceCalculatorPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [monthlyBudget, setMonthlyBudget] = useState(30000);
  const [term, setTerm] = useState(72);
  const [deposit, setDeposit] = useState(35000);
  const [tradeIn, setTradeIn] = useState(0);
  const [balloon, setBalloon] = useState(0);
  const [profile, setProfile] = useState<CreditProfile>("good");
  const [annualRate, setAnnualRate] = useState(PROFILE_RATES.good);
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
    () => principalFromPayment(monthlyBudget, annualRate, term, balloon),
    [annualRate, balloon, monthlyBudget, term],
  );
  const buyingPower = financedPrincipal + Math.max(0, deposit) + Math.max(0, tradeIn);
  const estimatedInterest = Math.max(0, monthlyBudget * term + Math.max(0, balloon) - financedPrincipal);

  const financeMatches = useMemo<FinanceMatch[]>(() => {
    const contribution = Math.max(0, deposit) + Math.max(0, tradeIn);
    return rows
      .map((row) => {
        const price = salePrice(row);
        if (!price) return null;
        const principal = Math.max(0, price - contribution);
        const monthly = paymentForPrincipal(principal, annualRate, term, balloon);
        if (price > buyingPower + 1 || monthly > monthlyBudget + 1) return null;
        return { ...row, price, monthly } as FinanceMatch;
      })
      .filter((row): row is FinanceMatch => Boolean(row))
      .sort((first, second) => Math.abs(buyingPower - first.price) - Math.abs(buyingPower - second.price))
      .slice(0, 8);
  }, [annualRate, balloon, buyingPower, deposit, monthlyBudget, rows, term, tradeIn]);

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
    if (monthlyBudget <= 0) return "Set a realistic monthly vehicle budget first. LDAI will calculate the finance window from that amount.";
    if (annualRate >= PRIME_REFERENCE + 5) return "Your planning rate is materially above prime. A stronger deposit, smaller vehicle price or improved credit pricing can reduce repayment pressure.";
    if (term >= 72) return "The longer term improves monthly affordability, but it normally increases total interest paid. Compare a shorter term before committing.";
    if (deposit + tradeIn < buyingPower * 0.05) return "Your upfront contribution is small relative to the calculated purchase window. Increasing it reduces the amount financed and monthly interest exposure.";
    return "This budget has a balanced repayment structure for planning. Compare the matched stock below and keep room for insurance, operating costs and lender fees.";
  }, [buyingPower, deposit, monthlyBudget, annualRate, term, tradeIn]);

  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const glass = darkMode ? "border-white/12 bg-black/62" : "border-white/80 bg-white/72";
  const muted = darkMode ? "text-white/52" : "text-black/52";
  const input = `h-14 w-full rounded-[17px] border px-4 text-base font-black outline-none backdrop-blur-xl focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-white/[.055] text-white" : "border-black/8 bg-white/80 text-black"}`;

  function chooseProfile(next: CreditProfile) {
    setProfile(next);
    if (next !== "custom") setAnnualRate(PROFILE_RATES[next]);
  }

  return (
    <main className={`min-h-screen ${page}`}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="relative min-h-[360px] overflow-hidden bg-black text-white md:min-h-[430px]">
        <img src="/images/jobs/jobs-hero-fleet.jpg" alt="Commercial truck finance planning" className="absolute inset-0 h-full w-full object-cover opacity-72" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/78 to-black/24" />
        <div className="relative mx-auto flex min-h-[360px] max-w-6xl flex-col justify-end px-5 pb-9 pt-20 md:min-h-[430px] md:px-7 md:pb-12">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#f6b800]">LoadLink finance planning</p>
          <h1 className="mt-3 max-w-4xl text-5xl font-black leading-[.94] tracking-[-.055em] md:text-7xl">Truck finance calculator</h1>
          <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/72 md:text-base">Calculate a lender-style repayment window, then compare it with approved LoadLink trucks, trailers and commercial units actually available on the marketplace.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 md:px-7 md:py-12">
        <div className={`loadlink-glass overflow-hidden rounded-[30px] border shadow-[0_24px_70px_rgba(0,0,0,.08)] ${glass}`}>
          <div className="grid gap-0 lg:grid-cols-[1.05fr_.95fr]">
            <div className="p-5 md:p-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-black uppercase tracking-[.09em]">Monthly vehicle budget<input type="number" min="0" step="500" value={monthlyBudget} onChange={(event) => setMonthlyBudget(Number(event.target.value || 0))} className={`mt-2 ${input}`} /></label>
                <label className="text-xs font-black uppercase tracking-[.09em]">Finance term<select value={term} onChange={(event) => setTerm(Number(event.target.value))} className={`mt-2 ${input}`}><option value={36}>36 months</option><option value={48}>48 months</option><option value={60}>60 months</option><option value={72}>72 months</option><option value={84}>84 months</option></select></label>
                <label className="text-xs font-black uppercase tracking-[.09em]">Deposit<input type="number" min="0" step="5000" value={deposit} onChange={(event) => setDeposit(Number(event.target.value || 0))} className={`mt-2 ${input}`} /></label>
                <label className="text-xs font-black uppercase tracking-[.09em]">Trade-in value<input type="number" min="0" step="5000" value={tradeIn} onChange={(event) => setTradeIn(Number(event.target.value || 0))} className={`mt-2 ${input}`} /></label>
                <label className="text-xs font-black uppercase tracking-[.09em]">Optional balloon / residual<input type="number" min="0" step="5000" value={balloon} onChange={(event) => setBalloon(Number(event.target.value || 0))} className={`mt-2 ${input}`} /></label>
                <label className="text-xs font-black uppercase tracking-[.09em]">Credit planning profile<select value={profile} onChange={(event) => chooseProfile(event.target.value as CreditProfile)} className={`mt-2 ${input}`}><option value="excellent">Strong credit planning</option><option value="good">Good credit planning</option><option value="building">Building credit planning</option><option value="custom">Custom rate</option></select></label>
                <label className="text-xs font-black uppercase tracking-[.09em] sm:col-span-2">Interest rate used<input type="number" min="0" max="40" step="0.1" value={annualRate} onChange={(event) => { setAnnualRate(Number(event.target.value || 0)); setProfile("custom"); }} className={`mt-2 ${input}`} /><span className={`mt-2 block text-[11px] normal-case tracking-normal ${muted}`}>Editable planning rate. This is not a lender quote or approval.</span></label>
              </div>
            </div>

            <div className="border-t border-current/10 bg-black p-5 text-white lg:border-l lg:border-t-0 md:p-7">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#f6b800]">Estimated buying power</p>
              <p className="mt-3 text-5xl font-black tracking-[-.055em]">{rand(buyingPower)}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Metric label="Finance principal" value={rand(financedPrincipal)} />
                <Metric label="Monthly budget" value={rand(monthlyBudget)} />
                <Metric label="Planning rate" value={`${annualRate.toFixed(2)}%`} />
                <Metric label="Interest over term*" value={rand(estimatedInterest)} />
              </div>
              <div className="mt-5 rounded-2xl border border-[#f6b800]/30 bg-[#f6b800]/8 p-4">
                <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#f6b800]">LDAI · budget guidance</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/72">{advice}</p>
              </div>
            </div>
          </div>
        </div>

        <div className={`loadlink-glass mt-5 rounded-[24px] border p-5 ${glass}`}>
          <p className="text-xs font-black">South African market reference · {MARKET_REFERENCE_DATE}</p>
          <p className={`mt-2 text-sm font-semibold leading-6 ${muted}`}>Prime reference: {PRIME_REFERENCE.toFixed(2)}% · SARB policy rate: {SARB_POLICY_REFERENCE.toFixed(2)}%. The calculator uses the rate you enter, not these references automatically. Actual commercial-vehicle pricing depends on the lender, applicant, vehicle, security and deal structure.</p>
          <p className={`mt-2 text-xs font-semibold leading-5 ${muted}`}>*Planning estimate only. It does not include lender initiation or monthly service fees, insurance, tracking, VAT treatment, licensing, warranties or other transaction costs. A balloon creates a final amount still payable at the end of the term.</p>
        </div>

        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#b88900]">Live LoadLink stock</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em]">Vehicles within your finance window</h2><p className={`mt-2 text-sm font-semibold ${muted}`}>Only approved listings that fit the calculated payment outcome are shown.</p></div>
            <Link href="/jobs?portal=asset" className="text-xs font-black underline underline-offset-4">Browse all vehicles</Link>
          </div>

          {loading ? <div className="mt-5 h-40 animate-pulse rounded-[24px] bg-current/5" /> : financeMatches.length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {financeMatches.map((row) => <VehicleMatchCard key={row.id} row={row} darkMode={darkMode} secondary={`Est. ${rand(row.monthly)} / month`} />)}
            </div>
          ) : (
            <div className={`loadlink-glass mt-5 rounded-[24px] border p-7 text-center ${glass}`}>
              <h3 className="text-xl font-black">No current LoadLink vehicle matches this finance window</h3>
              <p className={`mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 ${muted}`}>Increase the deposit or monthly budget, adjust the term or rate, or browse rental stock instead. LoadLink will not show a vehicle here unless its advertised price fits the calculated outcome.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => setTerm((current) => Math.min(84, current + 12))} className="rounded-xl bg-[#f6b800] px-4 py-3 text-xs font-black text-black">Try a longer term</button><Link href="/jobs?portal=asset" className={`rounded-xl border px-4 py-3 text-xs font-black ${darkMode ? "border-white/15" : "border-black/10"}`}>View all stock</Link></div>
            </div>
          )}
        </section>

        <section className="mt-10">
          <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#b88900]">Operating alternatives</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em]">Rental units within your monthly budget</h2><p className={`mt-2 text-sm font-semibold ${muted}`}>Monthly rental listings are compared directly with the monthly vehicle budget above. Daily and weekly rates are not converted or guessed.</p></div>
          {rentalMatches.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rentalMatches.map((row) => <VehicleMatchCard key={row.id} row={row} darkMode={darkMode} secondary={`${rand(row.rental)} / ${row.period}`} />)}</div> : <div className={`loadlink-glass mt-5 rounded-[24px] border p-6 ${glass}`}><p className="font-black">No monthly rental listing currently fits this budget.</p><p className={`mt-2 text-sm font-semibold ${muted}`}>Try the vehicle marketplace for sale, rental and POA stock as new approved listings are added.</p></div>}
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
