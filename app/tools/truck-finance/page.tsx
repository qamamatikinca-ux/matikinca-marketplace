"use client";

import LoadLinkImage from "@/components/LoadLinkImage";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { advertisedSalePrice } from "@/lib/vehicleMarketGuide";

type VehicleRow = { id: string; title?: string | null; city?: string | null; vehicle_group?: string | null; rate?: string | null; description?: string | null; photos?: string[] | null; listing_kind?: string | null; created_at?: string | null };
type FinanceMatch = VehicleRow & { price: number; monthly: number };

const TERMS = [12, 24, 36, 48, 60, 72, 84];

function numeric(value: string) { const parsed = Number(String(value).replace(/[^0-9.]/g, "")); return Number.isFinite(parsed) ? Math.max(0, parsed) : 0; }
function isVehicleListing(row: VehicleRow) {
  const kind = String(row.listing_kind || "").toLowerCase();
  return ["vehicle", "asset", "truck_sale", "vehicle_listing"].includes(kind)
    || /^Listing type:\s*(Truck|Bakkie|Van|Trailer|Mobile Unit)/im.test(String(row.description || ""));
}
function salePrice(row: VehicleRow) {
  // Only a seller-entered sale price is a reliable basis for a vehicle loan estimate.
  return advertisedSalePrice(row) || 0;
}

function paymentForLoan(principal: number, annualRate: number, months: number, balloonAmount: number) {
  if (principal <= 0 || months <= 0) return 0;
  const balloon = Math.min(Math.max(0, balloonAmount), principal);
  const r = Math.max(0, annualRate) / 100 / 12;
  if (r === 0) return Math.max(0, principal - balloon) / months;
  const discountedBalloon = balloon / Math.pow(1 + r, months);
  return Math.max(0, principal - discountedBalloon) * r / (1 - Math.pow(1 + r, -months));
}

function principalFromPayment(monthlyPayment: number, annualRate: number, months: number, balloonAmount: number) {
  if (monthlyPayment <= 0 || months <= 0) return 0;
  const r = Math.max(0, annualRate) / 100 / 12;
  if (r === 0) return monthlyPayment * months + Math.max(0, balloonAmount);
  const annuityPrincipal = monthlyPayment * (1 - Math.pow(1 + r, -months)) / r;
  const discountedBalloon = Math.max(0, balloonAmount) / Math.pow(1 + r, months);
  return annuityPrincipal + discountedBalloon;
}

function rand(value: number) { return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(Number.isFinite(value) ? Math.max(0, value) : 0).replace(/\u00a0/g, " "); }

export default function TruckFinanceCalculatorPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [monthlyBudget, setMonthlyBudget] = useState("12000");
  const [term, setTerm] = useState(72);
  const [tradeIn, setTradeIn] = useState("0");
  const [deposit, setDeposit] = useState("35000");
  const [fees, setFees] = useState("0");
  const [interestRate, setInterestRate] = useState("10.5");
  const [balloonPercent, setBalloonPercent] = useState("0");
  const [rows, setRows] = useState<VehicleRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSelectedId(new URLSearchParams(window.location.search).get("vehicle") || "");
    let active = true;
    fetch(`/api/job-listings?t=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => { if (active) setRows(((payload.rows || []) as VehicleRow[]).filter(isVehicleListing)); })
      .catch(() => active && setRows([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const monthly = numeric(monthlyBudget);
  const annualRate = numeric(interestRate);
  const upfront = numeric(deposit) + numeric(tradeIn);
  const financedFees = numeric(fees);
  const balloonRatio = Math.min(40, numeric(balloonPercent)) / 100;

  const buyingPower = useMemo(() => {
    if (monthly <= 0) return 0;
    if (balloonRatio <= 0) return Math.max(0, principalFromPayment(monthly, annualRate, term, 0) + upfront - financedFees);
    const r = Math.max(0, annualRate) / 100 / 12;
    if (r === 0) return Math.max(0, (monthly * term + upfront - financedFees) / Math.max(0.01, 1 - balloonRatio));
    const annuityFactor = (1 - Math.pow(1 + r, -term)) / r;
    const balloonDiscount = balloonRatio / Math.pow(1 + r, term);
    const financedVehicleAmount = monthly * annuityFactor / Math.max(0.01, 1 - balloonDiscount);
    return Math.max(0, financedVehicleAmount + upfront - financedFees);
  }, [annualRate, balloonRatio, financedFees, monthly, term, upfront]);

  const selectedRow = rows.find((row) => row.id === selectedId);
  const selectedPrice = selectedRow ? salePrice(selectedRow) : 0;
  const selectedPrincipal = Math.max(0, selectedPrice - upfront + financedFees);
  const selectedMonthly = selectedPrice > 0
    ? paymentForLoan(selectedPrincipal, annualRate, term, selectedPrice * balloonRatio)
    : 0;
  const matches = useMemo<FinanceMatch[]>(() => rows.map((row) => {
    const price = salePrice(row); if (!price) return null;
    const principal = Math.max(0, price - upfront + financedFees);
    const balloon = price * balloonRatio;
    const estimatedMonthly = paymentForLoan(principal, annualRate, term, balloon);
    if (monthly <= 0 || price > buyingPower + 1 || estimatedMonthly > monthly + 1) return null;
    return { ...row, price, monthly: estimatedMonthly } as FinanceMatch;
  }).filter((row): row is FinanceMatch => Boolean(row)).sort((a, b) => Math.abs(buyingPower - a.price) - Math.abs(buyingPower - b.price)).slice(0, 4), [annualRate, balloonRatio, buyingPower, financedFees, monthly, rows, term, upfront]);


  const page = darkMode ? "bg-[#080908] text-[#f7f7f5]" : "bg-[#f7f6f2] text-[#171817]";
  const card = darkMode ? "border-[#363a35] bg-[#141614]" : "border-[#e0e2dc] bg-white";
  const muted = darkMode ? "text-[#a9ada8]" : "text-[#626761]";
  const field = darkMode
    ? "border-[#414540] bg-[#1f211f] text-[#fafbf7] [&_input]:text-[#fafbf7] [&_select]:text-[#fafbf7]"
    : "border-[#dcdfd7] bg-[#fbfbf9] text-[#191c18] [&_input]:text-[#191c18] [&_select]:text-[#191c18]";

  return (
    <main className={page + " min-h-screen"} data-loadlink-finance="20261102-minimal">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <div className="mx-auto max-w-4xl px-4 pb-24 pt-7 sm:px-6 sm:pt-10">
        <header className="mb-6 grid grid-cols-[minmax(0,1fr)_110px] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_190px] sm:gap-8">
          <div className="min-w-0">
            <p className={`text-[11px] font-bold uppercase tracking-[.11em] ${darkMode ? "text-[#f6b800]" : "text-[#906800]"}`}>Vehicle finance</p>
            <h1 className="mt-2 text-[clamp(26px,5vw,39px)] font-bold leading-[1.15] tracking-[-.035em]">Truck finance calculator</h1>
            <p className={muted + " mt-2 text-sm leading-6"}>Explore a realistic budget before you shop.</p>
          </div>
          <div className={`relative flex h-[104px] items-center justify-center overflow-hidden rounded-xl sm:h-[148px] ${darkMode ? "bg-[#151715]" : "bg-[#eeeee9]"}`}>
            <LoadLinkImage src="/images/loadlink-finance-truck.webp" alt="Commercial truck" className="h-full w-full object-contain p-2" />
          </div>
        </header>

        <section className={card + " overflow-hidden rounded-2xl border"} aria-label="Finance estimate">
          <div className="border-b border-current/10 px-4 py-5 sm:px-6">
            <p className={muted + " text-xs font-medium"}>Estimated buying power</p>
            <p className="mt-1 break-words text-[clamp(30px,7vw,42px)] font-bold leading-tight tracking-[-.035em]" aria-live="polite">{rand(buyingPower)}</p>
            <p className={muted + " mt-2 text-xs leading-5"}>
              Based on {rand(monthly)} per month over {term} months at {annualRate}% interest.
            </p>
          </div>

          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-base font-bold">Your figures</h2>
            <p className={muted + " mt-1 text-xs leading-5"}>Change any number to recalculate instantly.</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
              <FinanceField label="Monthly budget" fieldClass={field}>
                <MoneyInput value={monthlyBudget} onChange={setMonthlyBudget} />
              </FinanceField>
              <FinanceField label="Loan term" fieldClass={field}>
                <select
                  value={term}
                  onChange={(event) => setTerm(Number(event.target.value))}
                  className="mt-1 w-full min-w-0 bg-transparent py-1 text-base font-semibold outline-none"
                >
                  {TERMS.map((months) => (
                    <option key={months} value={months} className="text-black">{months} months</option>
                  ))}
                </select>
              </FinanceField>
              <FinanceField label="Deposit" fieldClass={field}>
                <MoneyInput value={deposit} onChange={setDeposit} />
              </FinanceField>
              <FinanceField label="Interest rate" fieldClass={field}>
                <NumberInput value={interestRate} onChange={setInterestRate} suffix="%" />
              </FinanceField>
            </div>

            <details className={(darkMode ? "border-[#3b3e39]" : "border-[#e2e4de]") + " group mt-4 overflow-hidden rounded-xl border"}>
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-xs font-semibold marker:hidden">
                <span>More options</span>
                <span className={muted + " text-[11px] font-medium"}>Trade-in, balloon and fees</span>
              </summary>
              <div className="grid grid-cols-2 gap-3 border-t border-current/10 p-3 sm:p-4">
                <FinanceField label="Trade-in" fieldClass={field}>
                  <MoneyInput value={tradeIn} onChange={setTradeIn} />
                </FinanceField>
                <FinanceField label="Balloon" fieldClass={field}>
                  <NumberInput value={balloonPercent} onChange={setBalloonPercent} suffix="%" />
                </FinanceField>
                <div className="col-span-2">
                  <FinanceField label="Financed fees" fieldClass={field}>
                    <MoneyInput value={fees} onChange={setFees} />
                  </FinanceField>
                </div>
              </div>
            </details>

            {balloonRatio > 0 ? (
              <p className={muted + " mt-3 text-xs leading-5"}>
                A balloon of up to 40% leaves a final amount due at the end of the loan.
              </p>
            ) : null}

            <div className="mt-5">
              <a href="#truck-finance-matches" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#f6b800] px-5 text-sm font-semibold text-[#141414] sm:w-auto">
                Find vehicles in your budget
              </a>
            </div>
            <p className={muted + " mt-3 text-xs leading-5"}>
              Estimates only, not a finance offer or approval. Final repayments depend on a lender's terms.
            </p>
          </div>
        </section>

        {selectedPrice > 0 ? (
          <section className={card + " mt-4 rounded-2xl border p-5 sm:p-6"} aria-label="Selected vehicle finance estimate">
            <p className={muted + " text-xs font-medium"}>Selected LoadLink vehicle</p>
            <h2 className="mt-1 text-base font-bold">{selectedRow?.title || "Commercial vehicle"}</h2>
            <p className="mt-2 text-2xl font-bold">{rand(selectedMonthly)} <span className={muted + " text-xs font-medium"}>/ month estimated</span></p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
              <span className={muted}>Asking price: {rand(selectedPrice)}</span>
              <Link href={"/vehicles/" + encodeURIComponent(selectedId)} className="font-semibold underline underline-offset-4">View vehicle</Link>
            </div>
          </section>
        ) : null}

        <section id="truck-finance-matches" className="scroll-mt-24 pt-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold tracking-[-.025em] sm:text-2xl">Vehicles in your budget</h2>
            <Link href="/list-your-vehicle#vehicle-marketplace-vehicles" className="text-xs font-semibold underline underline-offset-4">Browse all vehicles</Link>
          </div>
          <p className={muted + " mt-2 text-xs leading-5"}>
            Based on current advertised prices, not pre-approved finance.
          </p>

          {loading ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2" role="status" aria-label="Loading vehicles">
              {[0, 1].map((item) => <div key={item} className={card + " h-52 animate-pulse rounded-xl border"} />)}
            </div>
          ) : monthly <= 0 ? (
            <EmptyState darkMode={darkMode} title="Set a monthly budget" text="Enter an amount above to see matching vehicles." />
          ) : matches.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {matches.map((row) => (
                <Link key={row.id} href={"/vehicles/" + encodeURIComponent(row.id)} className={card + " flex min-w-0 overflow-hidden rounded-xl border no-underline"}>
                  <div className="h-28 w-28 shrink-0 overflow-hidden bg-black/10 sm:h-32 sm:w-32">
                    {row.photos?.[0] ? (
                      <LoadLinkImage src={row.photos[0]} alt={row.title || "Commercial vehicle"} className="h-full w-full object-cover" />
                    ) : (
                      <div className={muted + " flex h-full items-center justify-center px-2 text-center text-[11px]"}>Photo unavailable</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 p-3 sm:p-4">
                    <p className={muted + " truncate text-[11px]"}>{row.city || "South Africa"}</p>
                    <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-5">{row.title || "Commercial vehicle"}</h3>
                    <p className="mt-2 text-base font-bold">{rand(row.price)}</p>
                    <p className={muted + " mt-1 text-[11px]"}>{rand(row.monthly)} / month estimated</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState darkMode={darkMode} title="No vehicles within this budget" text="You can adjust your budget or browse the vehicle marketplace." />
          )}
        </section>
      </div>
    </main>
  );
}

function FinanceField({ label, fieldClass, children }: { label: string; fieldClass: string; children: React.ReactNode }) {
  return <label className={fieldClass + " block min-w-0 rounded-[12px] border px-3 py-2.5 focus-within:border-[#f6b800]"}>
    <span className="block text-[11px] font-medium opacity-70">{label}</span>
    {children}
  </label>;
}
function MoneyInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="mt-1 flex min-w-0 items-center gap-1 text-base font-semibold">
    <span>R</span>
    <input type="text" inputMode="decimal" autoComplete="off" value={value} onFocus={(event) => event.currentTarget.select()} onChange={(event) => onChange(event.target.value)} placeholder="0" className="w-full min-w-0 bg-transparent py-1 text-base font-semibold text-inherit outline-none" />
  </div>;
}
function NumberInput({ value, onChange, suffix }: { value: string; onChange: (value: string) => void; suffix: string }) {
  return <div className="mt-1 flex min-w-0 items-center gap-1 text-base font-semibold">
    <input type="text" inputMode="decimal" autoComplete="off" value={value} onFocus={(event) => event.currentTarget.select()} onChange={(event) => onChange(event.target.value)} className="w-full min-w-0 bg-transparent py-1 text-base font-semibold text-inherit outline-none" />
    <span>{suffix}</span>
  </div>;
}
function EmptyState({ darkMode, title, text }: { darkMode: boolean; title: string; text: string }) {
  return <div className={(darkMode ? "border-white/12 bg-[#141614] text-white" : "border-black/10 bg-white text-black") + " mt-4 rounded-xl border px-5 py-7"}>
    <h3 className="text-sm font-semibold">{title}</h3>
    <p className={(darkMode ? "text-white/55" : "text-black/55") + " mt-1 text-xs leading-5"}>{text}</p>
  </div>;
}
