"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

const TERMS = [12, 24, 36, 48, 60, 72, 84];
const TRUCK_IMAGE = "/images/truck-1.jpg";

function money(value: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? Math.max(0, value) : 0);
}

function numeric(value: string) {
  const parsed = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function principalFromPayment(monthlyPayment: number, annualRate: number, months: number) {
  if (monthlyPayment <= 0 || months <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate <= 0) return monthlyPayment * months;
  return monthlyPayment * (1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate;
}

function creditLabel(rate: number) {
  if (rate <= 9) return "Excellent credit";
  if (rate <= 12) return "Good credit";
  if (rate <= 15) return "Average credit";
  return "Higher rate";
}

function FieldShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={`rounded-[18px] border border-black/10 bg-white px-4 py-4 shadow-[0_5px_18px_rgba(0,0,0,.035)] ${wide ? "col-span-2" : ""}`}>{children}</div>;
}

export default function FinanceCalculatorPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [monthlyBudget, setMonthlyBudget] = useState("0");
  const [term, setTerm] = useState(72);
  const [tradeIn, setTradeIn] = useState("0");
  const [deposit, setDeposit] = useState("35000");
  const [interestRate, setInterestRate] = useState("10.5");

  const estimate = useMemo(() => {
    const principal = principalFromPayment(numeric(monthlyBudget), numeric(interestRate), term);
    return principal + numeric(deposit) + numeric(tradeIn);
  }, [deposit, interestRate, monthlyBudget, term, tradeIn]);

  const rate = numeric(interestRate);
  const page = darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black";
  const calculatorSurface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/52" : "text-black/52";
  const field = darkMode ? "border-white/12 bg-[#141414] text-white" : "border-black/10 bg-white text-black";

  return (
    <main className={`min-h-screen ${page}`}>
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="mx-auto max-w-[780px] px-4 pb-16 pt-7 sm:px-6 sm:pt-10">
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#b88700]">Truck finance tool</p>
          <h1 className="mt-2 text-[36px] font-black tracking-[-.055em] sm:text-[46px]">Find your truck buying power</h1>
          <p className={`mx-auto mt-3 max-w-[610px] text-sm font-semibold leading-6 ${muted}`}>
            Tell LoadLink what you can afford each month and we’ll estimate the truck price range that fits your budget.
          </p>
        </div>

        <section className={`mt-7 overflow-hidden rounded-[30px] border ${calculatorSurface}`}>
          <div className={`relative min-h-[300px] overflow-hidden ${darkMode ? "bg-[#101010]" : "bg-[#fbfaf7]"}`}>
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/[.08] to-transparent" aria-hidden="true" />
            <img
              src={TRUCK_IMAGE}
              alt="Commercial truck for LoadLink finance estimate"
              className="absolute inset-0 h-full w-full object-contain object-center p-5 sm:p-7"
            />
          </div>

          <div className="px-4 pb-6 pt-7 sm:px-6 sm:pb-8">
            <div className="text-center">
              <div className="text-[44px] font-black leading-none tracking-[-.06em] sm:text-[54px]">{money(estimate)}</div>
              <p className="mt-3 text-xl font-black tracking-[-.025em]">Estimated truck buying power</p>
              <p className={`mt-2 text-sm font-semibold ${muted}`}>Based on {rate.toFixed(2)}% interest over {term} months</p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <label className={`rounded-[18px] border px-4 py-4 ${field}`}>
                <span className={`block text-sm font-bold ${muted}`}>Monthly budget</span>
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
              </label>

              <label className={`rounded-[18px] border px-4 py-4 ${field}`}>
                <span className={`block text-sm font-bold ${muted}`}>Loan term</span>
                <select
                  value={term}
                  onChange={(event) => setTerm(Number(event.target.value))}
                  className="mt-2 w-full appearance-none bg-transparent text-[23px] font-black outline-none"
                  aria-label="Loan term"
                >
                  {TERMS.map((months) => <option key={months} value={months} className="text-black">{months} months</option>)}
                </select>
              </label>

              <label className={`rounded-[18px] border px-4 py-4 ${field}`}>
                <span className={`block text-sm font-bold ${muted}`}>Trade-in amount</span>
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
              </label>

              <label className={`rounded-[18px] border px-4 py-4 ${field}`}>
                <span className={`block text-sm font-bold ${muted}`}>Deposit amount</span>
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
              </label>
            </div>

            <Link href="/list-your-vehicle#vehicle-marketplace-vehicles" className="mt-3 inline-flex text-sm font-black underline decoration-[#f6b800] decoration-2 underline-offset-4">
              View available trucks
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
                <span className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black ${rate <= 12 ? "bg-emerald-50 text-emerald-700" : darkMode ? "bg-white/10 text-white" : "bg-black/[.05] text-black/70"}`}>
                  {creditLabel(rate)}
                </span>
              </div>
            </label>

            <Link
              href={`/list-your-vehicle#vehicle-marketplace-vehicles`}
              className="mt-7 flex min-h-[58px] w-full items-center justify-center rounded-[17px] bg-[#f6b800] px-5 text-base font-black text-black shadow-[0_12px_30px_rgba(246,184,0,.18)] transition active:scale-[.99]"
            >
              See your truck matches
            </Link>

            <p className={`mx-auto mt-4 max-w-[580px] text-center text-[11px] font-semibold leading-5 ${muted}`}>
              This is an affordability estimate, not a finance offer. Final rates, repayments and approval depend on the finance provider, vehicle, deposit, credit profile and applicable fees.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
