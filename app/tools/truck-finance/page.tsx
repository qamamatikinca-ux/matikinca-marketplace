"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
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

const TERMS = [12, 24, 36, 48, 60, 72, 84];
const TRUCK_IMAGE = "/images/loadlink-finance-truck.webp";

function moneyValue(value: string | null | undefined) {
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

function salePrice(row: VehicleRow) {
  const explicit = readMeta(row.description, "Sale price");
  if (explicit) return moneyValue(explicit);
  const offer = readMeta(row.description, "Offer").toLowerCase();
  if (offer.includes("rental only") || offer.includes("application") || offer.includes("poa")) return 0;
  return moneyValue(row.rate);
}

function principalFromPayment(monthlyPayment: number, annualRate: number, months: number) {
  if (monthlyPayment <= 0 || months <= 0) return 0;
  const monthlyRate = Math.max(0, annualRate) / 100 / 12;
  if (monthlyRate === 0) return monthlyPayment * months;
  return monthlyPayment * (1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate;
}

function paymentForPrincipal(principal: number, annualRate: number, months: number) {
  if (principal <= 0 || months <= 0) return 0;
  const monthlyRate = Math.max(0, annualRate) / 100 / 12;
  if (monthlyRate === 0) return principal / months;
  return principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
}

function rand(value: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? Math.max(0, value) : 0).replace(/\u00a0/g, " ");
}

function numeric(value: string) {
  const parsed = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function rateBadge(rate: number) {
  if (rate <= 9) return "Lower rate";
  if (rate <= 12) return "Typical estimate";
  if (rate <= 15) return "Mid-range rate";
  return "Higher rate";
}

export default function TruckFinanceCalculatorPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [monthlyBudget, setMonthlyBudget] = useState("0");
  const [term, setTerm] = useState(72);
  const [tradeIn, setTradeIn] = useState("0");
  const [deposit, setDeposit] = useState("35000");
  const [interestRate, setInterestRate] = useState("10.5");
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

  const monthly = numeric(monthlyBudget);
  const annualRate = numeric(interestRate);
  const upfront = numeric(deposit) + numeric(tradeIn);
  const buyingPower = useMemo(
    () => principalFromPayment(monthly, annualRate, term) + upfront,
    [annualRate, monthly, term, upfront],
  );

  const matches = useMemo<FinanceMatch[]>(() => rows
    .map((row) => {
      const price = salePrice(row);
      if (!price) return null;
      const principal = Math.max(0, price - upfront);
      const estimatedMonthly = paymentForPrincipal(principal, annualRate, term);
      if (monthly <= 0 || price > buyingPower + 1 || estimatedMonthly > monthly + 1) return null;
      return { ...row, price, monthly: estimatedMonthly } as FinanceMatch;
    })
    .filter((row): row is FinanceMatch => Boolean(row))
    .sort((first, second) => Math.abs(buyingPower - first.price) - Math.abs(buyingPower - second.price))
    .slice(0, 8), [annualRate, buyingPower, monthly, rows, term, upfront]);

  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const card = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/[.08] bg-white";
  const muted = darkMode ? "text-white/52" : "text-black/52";
  const field = darkMode ? "border-white/12 bg-[#141414] text-white" : "border-[#d8dee7] bg-white text-[#071124]";

  return (
    <main className={`min-h-screen ${page}`}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="mx-auto max-w-[820px] px-4 pb-16 pt-7 sm:px-6 sm:pt-10">
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#b88700]">LoadLink truck finance</p>
          <h1 className="mt-2 text-[36px] font-black tracking-[-.055em] sm:text-[46px]">What truck can your budget buy?</h1>
          <p className={`mx-auto mt-3 max-w-[620px] text-sm font-semibold leading-6 ${muted}`}>
            Enter the monthly amount you are comfortable with and LoadLink will estimate your buying power, then compare it with approved truck listings.
          </p>
        </div>

        <section className={`mt-7 overflow-hidden rounded-[30px] border shadow-[0_24px_70px_rgba(0,0,0,.08)] ${card}`}>
          <div className={`relative min-h-[315px] overflow-hidden ${darkMode ? "bg-[#101010]" : "bg-white"}`}>
            <div className={`absolute inset-x-0 bottom-0 h-24 ${darkMode ? "bg-gradient-to-t from-black/30 to-transparent" : "bg-gradient-to-t from-black/[.06] to-transparent"}`} aria-hidden="true" />
            <img
              src={TRUCK_IMAGE}
              alt="Real commercial truck"
              className="absolute inset-0 h-full w-full object-contain object-center p-4 sm:p-7"
            />
          </div>

          <div className="px-4 pb-7 pt-7 sm:px-7 sm:pb-9">
            <div className="text-center">
              <p className="text-[46px] font-black leading-none tracking-[-.065em] sm:text-[58px]">{rand(buyingPower)}</p>
              <p className="mt-3 text-xl font-black tracking-[-.025em]">Estimated truck buying power</p>
              <p className={`mt-2 text-sm font-semibold ${muted}`}>Based on {annualRate.toFixed(2)}% interest over {term} months</p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <FinanceField label="Monthly budget" darkMode={darkMode} fieldClass={field}>
                <div className="mt-2 flex items-center gap-1 text-[24px] font-black">
                  <span>R</span>
                  <input
                    inputMode="decimal"
                    value={monthlyBudget}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => setMonthlyBudget(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[24px] font-black outline-none"
                    aria-label="Monthly budget"
                  />
                </div>
              </FinanceField>

              <FinanceField label="Loan term" darkMode={darkMode} fieldClass={field}>
                <select
                  value={term}
                  onChange={(event) => setTerm(Number(event.target.value))}
                  className="mt-2 w-full appearance-none bg-transparent text-[23px] font-black outline-none"
                  aria-label="Loan term"
                >
                  {TERMS.map((months) => <option key={months} value={months} className="text-black">{months} months</option>)}
                </select>
              </FinanceField>

              <FinanceField label="Trade-in amount" darkMode={darkMode} fieldClass={field}>
                <div className="mt-2 flex items-center gap-1 text-[23px] font-black">
                  <span>R</span>
                  <input
                    inputMode="decimal"
                    value={tradeIn}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => setTradeIn(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[23px] font-black outline-none"
                    aria-label="Trade-in amount"
                  />
                </div>
              </FinanceField>

              <FinanceField label="Deposit amount" darkMode={darkMode} fieldClass={field}>
                <div className="mt-2 flex items-center gap-1 text-[23px] font-black">
                  <span>R</span>
                  <input
                    inputMode="decimal"
                    value={deposit}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => setDeposit(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[23px] font-black outline-none"
                    aria-label="Deposit amount"
                  />
                </div>
              </FinanceField>
            </div>

            <Link href="/list-your-vehicle#vehicle-marketplace-vehicles" className="mt-3 inline-flex text-sm font-black underline decoration-[#f6b800] decoration-2 underline-offset-4">
              Browse truck values
            </Link>

            <label className={`mt-6 block rounded-[18px] border px-4 py-4 ${field}`}>
              <span className={`block text-sm font-bold ${muted}`}>Interest rate</span>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-1 text-[25px] font-black">
                  <input
                    inputMode="decimal"
                    value={interestRate}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => setInterestRate(event.target.value)}
                    className="w-[88px] bg-transparent text-[25px] font-black outline-none"
                    aria-label="Interest rate"
                  />
                  <span>%</span>
                </div>
                <span className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black ${annualRate <= 12 ? "bg-emerald-50 text-emerald-700" : darkMode ? "bg-white/10 text-white" : "bg-black/[.05] text-black/70"}`}>
                  {rateBadge(annualRate)}
                </span>
              </div>
            </label>

            <a
              href="#truck-finance-matches"
              className="mt-7 flex min-h-[60px] w-full items-center justify-center rounded-[17px] bg-[#f6b800] px-5 text-base font-black text-black shadow-[0_12px_30px_rgba(246,184,0,.18)] transition active:scale-[.99]"
            >
              See your truck matches
            </a>

            <p className={`mx-auto mt-4 max-w-[590px] text-center text-[11px] font-semibold leading-5 ${muted}`}>
              This is an affordability estimate, not a finance offer. Final rates, repayments and approval depend on the finance provider, truck, deposit, credit profile, fees and lending criteria.
            </p>
          </div>
        </section>

        <section id="truck-finance-matches" className="scroll-mt-24 pt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-[-.04em]">Trucks within your estimated range</h2>
              <p className={`mt-2 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>These matches use the advertised price and your calculator figures. Open any truck to confirm its full listing details.</p>
            </div>
            <Link href="/list-your-vehicle#vehicle-marketplace-vehicles" className="text-sm font-black underline decoration-[#f6b800] decoration-2 underline-offset-4">Browse all trucks</Link>
          </div>

          {loading ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">{[0, 1].map((item) => <div key={item} className="h-72 animate-pulse rounded-[24px] bg-current/[.05]" />)}</div>
          ) : monthly <= 0 ? (
            <EmptyState darkMode={darkMode} title="Enter your monthly budget" text="Your truck matches will appear here once LoadLink can calculate a buying range." />
          ) : matches.length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {matches.map((row) => (
                <Link key={row.id} href={`/listing/${row.id}`} className={`overflow-hidden rounded-[24px] border ${card}`}>
                  <div className="aspect-[16/10] overflow-hidden bg-black/[.05]">
                    <img src={row.photos?.[0] || TRUCK_IMAGE} alt={row.title || "Commercial truck"} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-5">
                    <p className={`text-[10px] font-black uppercase tracking-[.12em] ${muted}`}>{row.city || "South Africa"}</p>
                    <h3 className="mt-2 text-xl font-black tracking-[-.03em]">{row.title || "Commercial truck"}</h3>
                    <p className="mt-3 text-2xl font-black">{rand(row.price)}</p>
                    <p className={`mt-1 text-xs font-bold ${muted}`}>Estimated {rand(row.monthly)} / month</p>
                    <span className="mt-4 inline-flex text-xs font-black underline decoration-[#f6b800] decoration-2 underline-offset-4">View full details</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState darkMode={darkMode} title="No approved truck match yet" text="Try a different monthly budget, term, deposit, trade-in or rate, or browse all approved LoadLink trucks." />
          )}
        </section>
      </section>
    </main>
  );
}

function FinanceField({ label, children, fieldClass, darkMode }: { label: string; children: React.ReactNode; fieldClass: string; darkMode: boolean }) {
  return (
    <label className={`min-w-0 rounded-[18px] border px-4 py-4 ${fieldClass}`}>
      <span className={`block text-sm font-bold ${darkMode ? "text-white/55" : "text-[#43516a]"}`}>{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ darkMode, title, text }: { darkMode: boolean; title: string; text: string }) {
  return (
    <div className={`mt-5 rounded-[24px] border p-8 text-center ${darkMode ? "border-white/10 bg-white/[.035]" : "border-black/[.07] bg-white"}`}>
      <h3 className="text-xl font-black">{title}</h3>
      <p className={`mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 ${darkMode ? "text-white/52" : "text-black/52"}`}>{text}</p>
    </div>
  );
}