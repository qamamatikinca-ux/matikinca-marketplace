"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type VehicleRow = { id: string; title?: string | null; city?: string | null; vehicle_group?: string | null; rate?: string | null; description?: string | null; photos?: string[] | null; listing_kind?: string | null; created_at?: string | null };
type FinanceMatch = VehicleRow & { price: number; monthly: number };

const TERMS = [12, 24, 36, 48, 60, 72, 84];
const TRUCK_IMAGE = "/images/loadlink-finance-truck.webp";

function numeric(value: string) { const parsed = Number(String(value).replace(/[^0-9.]/g, "")); return Number.isFinite(parsed) ? Math.max(0, parsed) : 0; }
function moneyValue(value: string | null | undefined) { const compact = String(value || "").replace(/\s+/g, "").replace(/,/g, ""); const match = compact.match(/(?:R|ZAR)?([0-9]+(?:\.[0-9]+)?)/i); return match ? numeric(match[1]) : 0; }
function readMeta(description: string | null | undefined, label: string) { return String(description || "").match(new RegExp(`^${label}:\\s*([^\\n]+)`, "im"))?.[1]?.trim() || ""; }
function isVehicleListing(row: VehicleRow) { const kind = String(row.listing_kind || "").toLowerCase(); return ["vehicle", "asset", "truck_sale", "vehicle_listing"].includes(kind) || /^Listing type:\s*(Truck|Trailer|Mobile Unit)/im.test(String(row.description || "")); }
function salePrice(row: VehicleRow) { const explicit = readMeta(row.description, "Sale price"); if (explicit) return moneyValue(explicit); const offer = readMeta(row.description, "Offer").toLowerCase(); if (offer.includes("rental only") || offer.includes("application") || offer.includes("poa")) return 0; return moneyValue(row.rate); }

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  const examplePrincipal = Math.max(0, buyingPower - upfront + financedFees);
  const exampleBalloon = buyingPower * balloonRatio;
  const exampleMonthly = paymentForLoan(examplePrincipal, annualRate, term, exampleBalloon);
  const instalmentsTotal = exampleMonthly * term;
  const totalRepayable = instalmentsTotal + exampleBalloon;
  const estimatedInterestAndFees = Math.max(0, totalRepayable - examplePrincipal);

  const matches = useMemo<FinanceMatch[]>(() => rows.map((row) => {
    const price = salePrice(row); if (!price) return null;
    const principal = Math.max(0, price - upfront + financedFees);
    const balloon = price * balloonRatio;
    const estimatedMonthly = paymentForLoan(principal, annualRate, term, balloon);
    if (monthly <= 0 || price > buyingPower + 1 || estimatedMonthly > monthly + 1) return null;
    return { ...row, price, monthly: estimatedMonthly } as FinanceMatch;
  }).filter((row): row is FinanceMatch => Boolean(row)).sort((a, b) => Math.abs(buyingPower - b.price) - Math.abs(buyingPower - a.price)).slice(0, 8), [annualRate, balloonRatio, buyingPower, financedFees, monthly, rows, term, upfront]);

  const page = darkMode ? "bg-black text-white" : "bg-[#f5efe1] text-black";
  const card = darkMode ? "border-[#f6b800]/20 bg-white/[.045] backdrop-blur-2xl" : "border-[#f6b800]/28 bg-white/76 backdrop-blur-2xl";
  const muted = darkMode ? "text-white/52" : "text-black/52";
  const field = darkMode ? "border-white/12 bg-white/[.035] text-white" : "border-black/10 bg-white/80 text-black";

  return (
    <main className={`min-h-screen ${page}`} data-loadlink-finance="20260823-polish">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-7 sm:px-6 sm:pt-10">
        <div className="max-w-3xl"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#b78300]">LoadLink finance tool</p><h1 className="mt-2 text-[38px] font-black tracking-[-.055em] sm:text-[52px]">Truck finance calculator</h1><p className={`mt-3 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>Estimate buying power and monthly repayments using deposit, trade-in, interest, financed fees and an optional balloon. Figures are estimates, not finance approval.</p></div>

        <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
          <section className={`rounded-[28px] border p-5 shadow-[0_22px_60px_rgba(246,184,0,.08)] sm:p-7 ${card}`}>
            <div className="grid grid-cols-2 gap-3">
              <FinanceField label="Monthly budget" fieldClass={field}><MoneyInput value={monthlyBudget} onChange={setMonthlyBudget} /></FinanceField>
              <FinanceField label="Loan term" fieldClass={field}><select value={term} onChange={(event) => setTerm(Number(event.target.value))} className="mt-2 w-full bg-transparent text-xl font-black outline-none">{TERMS.map((months) => <option key={months} value={months} className="text-black">{months} months</option>)}</select></FinanceField>
              <FinanceField label="Deposit" fieldClass={field}><MoneyInput value={deposit} onChange={setDeposit} /></FinanceField>
              <FinanceField label="Trade-in" fieldClass={field}><MoneyInput value={tradeIn} onChange={setTradeIn} /></FinanceField>
              <FinanceField label="Interest rate" fieldClass={field}><NumberInput value={interestRate} onChange={setInterestRate} suffix="%" /></FinanceField>
              <FinanceField label="Balloon" fieldClass={field}><NumberInput value={balloonPercent} onChange={setBalloonPercent} suffix="%" /></FinanceField>
              <div className="col-span-2"><FinanceField label="Financed fees — optional" fieldClass={field}><MoneyInput value={fees} onChange={setFees} /></FinanceField></div>
            </div>
            <p className={`mt-4 text-[10px] font-semibold leading-5 ${muted}`}>Balloon is capped at 40% in this estimator. A balloon lowers monthly instalments but leaves a final amount due. Finance-provider fees and rules can differ.</p>
          </section>

          <section className={`overflow-hidden rounded-[28px] border shadow-[0_22px_70px_rgba(246,184,0,.10)] ${card}`}>
            <div className="relative h-44 overflow-hidden border-b border-[#f6b800]/15"><img src={TRUCK_IMAGE} alt="Commercial truck" className="h-full w-full object-contain p-3" /><div className="pointer-events-none absolute inset-x-12 bottom-4 h-7 rounded-[50%] bg-[#f6b800]/15 blur-2xl" /></div>
            <div className="p-5 sm:p-6"><p className={`text-[10px] font-black uppercase tracking-[.13em] ${muted}`}>Estimated buying power</p><p className="mt-2 text-[42px] font-black leading-none tracking-[-.06em]">{rand(buyingPower)}</p><div className={`mt-5 divide-y rounded-2xl border ${darkMode ? "divide-white/10 border-white/10" : "divide-black/8 border-black/8"}`}><Result label="Estimated monthly" value={rand(exampleMonthly)} /><Result label="Balloon at end" value={rand(exampleBalloon)} /><Result label="Total instalments" value={rand(instalmentsTotal)} /><Result label="Interest + financed fees" value={rand(estimatedInterestAndFees)} /><Result label="Total repayable" value={rand(totalRepayable)} /></div><a href="#truck-finance-matches" className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-[#f6b800] px-4 text-sm font-black text-black shadow-[0_10px_26px_rgba(246,184,0,.18)]">See matching trucks</a></div>
          </section>
        </div>

        <section id="truck-finance-matches" className="scroll-mt-24 pt-10">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-3xl font-black tracking-[-.04em]">Trucks within your estimate</h2><p className={`mt-2 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>Matches use advertised prices and your calculator inputs. Confirm the listing and lender terms before making a decision.</p></div><Link href="/list-your-vehicle#vehicle-marketplace-vehicles" className="rounded-full border border-[#f6b800]/55 px-4 py-2 text-xs font-black">Browse all trucks</Link></div>
          {loading ? <div className="mt-5 grid gap-4 sm:grid-cols-2">{[0,1].map((item)=><div key={item} className={`h-64 animate-pulse rounded-[24px] border ${card}`} />)}</div> : monthly <= 0 ? <EmptyState darkMode={darkMode} title="Enter a monthly budget" text="LoadLink will calculate a buying range and show matching vehicle listings." /> : matches.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2">{matches.map((row)=><Link key={row.id} href={`/listing/${row.id}`} className={`overflow-hidden rounded-[24px] border ${card}`}><div className="aspect-[16/10] overflow-hidden bg-black/[.04]"><img src={row.photos?.[0] || TRUCK_IMAGE} alt={row.title || "Commercial truck"} className="h-full w-full object-cover" /></div><div className="p-5"><p className={`text-[10px] font-black uppercase tracking-[.12em] ${muted}`}>{row.city || "South Africa"}</p><h3 className="mt-2 text-xl font-black tracking-[-.03em]">{row.title || "Commercial truck"}</h3><p className="mt-3 text-2xl font-black">{rand(row.price)}</p><p className={`mt-1 text-xs font-bold ${muted}`}>Estimated {rand(row.monthly)} / month</p><span className="mt-4 inline-flex rounded-full border border-[#f6b800]/50 px-3 py-2 text-[10px] font-black">View listing</span></div></Link>)}</div> : <EmptyState darkMode={darkMode} title="No current matches" text="Try a higher monthly budget, a larger deposit, a longer term or browse all vehicle listings." />}
        </section>

        <p className={`mt-8 text-[10px] font-semibold leading-5 ${muted}`}>Calculation method: monthly rate = annual interest ÷ 12. With a balloon, the present value of the final balloon is removed from the amortised principal before calculating instalments. At 0% interest, repayment is (principal − balloon) ÷ months.</p>
      </section>
    </main>
  );
}

function FinanceField({ label, fieldClass, children }: { label: string; fieldClass: string; children: React.ReactNode }) { return <label className={`block rounded-[17px] border px-4 py-3 ${fieldClass}`}><span className="block text-[10px] font-black uppercase tracking-[.09em] opacity-45">{label}</span>{children}</label>; }
function MoneyInput({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <div className="mt-2 flex items-center gap-1 text-xl font-black"><span>R</span><input inputMode="decimal" value={value} onFocus={(event)=>event.currentTarget.select()} onChange={(event)=>onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent text-xl font-black outline-none" /></div>; }
function NumberInput({ value, onChange, suffix }: { value: string; onChange: (value: string) => void; suffix: string }) { return <div className="mt-2 flex items-center gap-1 text-xl font-black"><input inputMode="decimal" value={value} onFocus={(event)=>event.currentTarget.select()} onChange={(event)=>onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent text-xl font-black outline-none" /><span>{suffix}</span></div>; }
function Result({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 px-3 py-3 text-xs"><span className="font-semibold opacity-50">{label}</span><strong className="text-right font-black">{value}</strong></div>; }
function EmptyState({ darkMode, title, text }: { darkMode: boolean; title: string; text: string }) { return <div className={`mt-5 rounded-[24px] border p-8 text-center ${darkMode ? "border-white/10 bg-white/[.035]" : "border-black/10 bg-white/70"}`}><h3 className="text-xl font-black">{title}</h3><p className={`mx-auto mt-2 max-w-md text-sm leading-6 ${darkMode ? "text-white/50" : "text-black/50"}`}>{text}</p></div>; }
