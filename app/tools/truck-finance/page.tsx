"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LoadLinkImage from "@/components/LoadLinkImage";
import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { advertisedSalePrice } from "@/lib/vehicleMarketGuide";
import { paymentForLoan, buyingPowerForBudget } from "@/lib/financeMath";
import styles from "./FinanceCalculator.module.css";

type VehicleRow = {
  id: string; title?: string | null; city?: string | null; vehicle_group?: string | null;
  rate?: string | null; description?: string | null; photos?: string[] | null;
  listing_kind?: string | null;
};
type FinanceMatch = VehicleRow & { price: number; monthly: number };
const TERMS = [12, 24, 36, 48, 60, 72, 84];

function numeric(value: string) {
  const clean = value.replace(/[,\s]/g, "").replace(/[^0-9.]/g, "");
  const n = clean && /^\d+(?:\.\d{0,2})?$/.test(clean) ? Number(clean) : NaN;
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}
function money(value: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency", currency: "ZAR", maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? Math.max(0, value) : 0).replace(/\u00a0/g, " ");
}
function isVehicle(row: VehicleRow) {
  const kind = String(row.listing_kind || "").toLowerCase();
  return ["vehicle", "asset", "truck_sale", "vehicle_listing"].includes(kind)
    || /^Listing type:\s*(Truck|Bakkie|Van|Trailer|Mobile Unit)/im.test(row.description || "");
}

export default function TruckFinanceCalculatorPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [budget, setBudget] = useState("0");
  const [term, setTerm] = useState(72);
  const [tradeIn, setTradeIn] = useState("0");
  const [deposit, setDeposit] = useState("35000");
  const [interest, setInterest] = useState("10.5");
  const [balloonPercent, setBalloonPercent] = useState("0");
  const [fees, setFees] = useState("0");
  const [rows, setRows] = useState<VehicleRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vehicle = params.get("vehicle") || "";
    setSelectedId(vehicle);
    let active = true;
    fetch("/api/job-listings", { cache: "no-store" })
      .then((res) => { if (!res.ok) throw Error("Unable to load vehicles"); return res.json(); })
      .then((data) => { if (active) setRows(((data.rows || []) as VehicleRow[]).filter(isVehicle)); })
      .catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const monthly = numeric(budget);
  const annualRate = Math.min(100, numeric(interest));
  const balloonRatio = Math.min(40, numeric(balloonPercent)) / 100;
  const upfront = numeric(deposit) + numeric(tradeIn);
  const financedFees = numeric(fees);
  const buyingPower = useMemo(
    () => buyingPowerForBudget(monthly, annualRate, term, upfront, financedFees, balloonRatio),
    [monthly, annualRate, term, upfront, financedFees, balloonRatio],
  );
  const selected = rows.find((row) => row.id === selectedId);
  const selectedPrice = selected ? advertisedSalePrice(selected) || 0 : 0;
  const selectedMonthly = selectedPrice > 0
    ? paymentForLoan(Math.max(0, selectedPrice - upfront + financedFees), annualRate, term, selectedPrice * balloonRatio)
    : 0;

  const matches = useMemo<FinanceMatch[]>(() => rows
    .map((row) => {
      const price = advertisedSalePrice(row) || 0;
      if (price <= 0 || price > buyingPower + 1) return null;
      const repayment = paymentForLoan(Math.max(0, price - upfront + financedFees), annualRate, term, price * balloonRatio);
      if (repayment > monthly + 1) return null;
      return { ...row, price, monthly: repayment } as FinanceMatch;
    })
    .filter((row): row is FinanceMatch => Boolean(row))
    .sort((a, b) => Math.abs(buyingPower - a.price) - Math.abs(buyingPower - b.price))
    .slice(0, 6), [rows, buyingPower, annualRate, term, upfront, financedFees, balloonRatio, monthly]);

  const surface = darkMode ? "#111311" : "#ffffff";
  return (
    <main className={styles.page} data-theme={darkMode ? "dark" : "light"} data-loadlink-finance="20261102-refined">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />
      <div className={styles.container}>
        <header className={styles.heading}>
          <Link href="/tools" className={styles.back}>‹ All tools</Link>
          <h1>Truck finance calculator</h1>
          <p>Tell us your monthly budget. We’ll show your estimated buying power and suitable commercial vehicles listed on LoadLink.</p>
        </header>

        <section className={styles.calculator} aria-label="Truck finance estimate">
          <div className={styles.visual}>
            <LoadLinkImage
              src="/images/loadlink-finance-truck.webp"
              alt="Illustrative commercial delivery truck"
              className={styles.truckImage}
            />
          </div>
          <div className={styles.estimate} aria-live="polite">
            <strong>{money(buyingPower)}</strong>
            <span>Estimated buying power</span>
            <small>Based on {annualRate}% nominal annual interest over {term} months</small>
          </div>

          <div className={styles.form} style={{ backgroundColor: surface }}>
            <div className={styles.fields}>
              <FinanceField label="Monthly budget">
                <MoneyInput value={budget} onChange={setBudget} />
              </FinanceField>
              <FinanceField label="Loan term">
                <select value={term} onChange={(e) => setTerm(Number(e.target.value))} aria-label="Loan term">
                  {TERMS.map((n) => <option key={n} value={n}>{n} months</option>)}
                </select>
              </FinanceField>
              <FinanceField label="Trade-in amount">
                <MoneyInput value={tradeIn} onChange={setTradeIn} />
              </FinanceField>
              <FinanceField label="Deposit amount">
                <MoneyInput value={deposit} onChange={setDeposit} />
              </FinanceField>
              <div className={styles.fullWidth}>
                <FinanceField label="Interest rate">
                  <NumberInput value={interest} onChange={setInterest} suffix="%" />
                </FinanceField>
              </div>
            </div>
            <details className={styles.advanced}>
              <summary>Additional options <span>Balloon and fees</span></summary>
              <div className={styles.fields}>
                <FinanceField label="Balloon (max 40%)">
                  <NumberInput value={balloonPercent} onChange={setBalloonPercent} suffix="%" />
                </FinanceField>
                <FinanceField label="Financed fees">
                  <MoneyInput value={fees} onChange={setFees} />
                </FinanceField>
              </div>
              <p>Balloon payments leave an amount due at the end of the loan. Any lender fees or other charges can change the result.</p>
            </details>

          </div>
          <p className={styles.disclaimer}>
            Estimates only, not a finance quotation or approval. Insurance, VAT differences and lender costs may change affordability.
          </p>
        </section>

        {selectedPrice > 0 ? (
          <section className={styles.selected} aria-label="Selected vehicle repayment">
            <div>
              <p className={styles.eyebrow}>Selected vehicle</p>
              <strong>{selected?.title || "Commercial vehicle"}</strong>
              <span>Advertised price: {money(selectedPrice)}</span>
            </div>
            <div>
              <strong>{money(selectedMonthly)} / month</strong>
              <Link href={"/vehicles/" + encodeURIComponent(selectedId)}>View vehicle ›</Link>
            </div>
          </section>
        ) : null}

        <section id="truck-finance-matches" className={styles.matches}>
          <div className={styles.matchHeading}>
            <div><h2>Vehicles within your budget</h2><p className={styles.matchSubhead}>Current LoadLink asking prices · Estimates only</p></div>
          </div>
          {loading ? <p role="status" className={styles.empty}>Checking current LoadLink listings…</p>
            : loadError ? <p role="alert" className={styles.empty}>Vehicle listings could not be loaded. Your calculator still works; try reloading to see matches.</p>
            : monthly <= 0 ? <p className={styles.empty}>"Enter a monthly budget above R0 to see matching vehicles."</p>
            : matches.length ? (
              <div className={styles.matchGrid}>
                {matches.map((row) => (
                  <Link key={row.id} href={"/vehicles/" + encodeURIComponent(row.id)} className={styles.matchCard}>
                    <div className={styles.matchImage}>
                      {row.photos?.[0]
                        ? <LoadLinkImage src={row.photos[0]} alt={row.title || "Vehicle listing"} className={styles.listingImage} />
                        : <span>Photo unavailable</span>}
                    </div>
                    <div className={styles.matchInfo}>
                      <span>{row.city || "South Africa"}</span>
                      <strong>{row.title || "Commercial vehicle"}</strong>
                      <b>{money(row.price)}</b>
                      <small>{money(row.monthly)} estimated / month</small>
                    </div>
                  </Link>
                ))}
              </div>
            ) : <p className={styles.empty}>No current listings within this budget. Adjust your figures or browse all vehicles.</p>}
        </section>
      </div>
    </main>
  );
}

function FinanceField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className={styles.field}><span className={styles.fieldLabel}>{label}</span><span className={styles.fieldValue}>{children}</span></label>;
}
function MoneyInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <><span className={styles.unit}>R</span><input aria-label="Amount in rand" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} onFocus={(e) => e.currentTarget.select()} /></>;
}
function NumberInput({ value, onChange, suffix }: { value: string; onChange: (value: string) => void; suffix: string }) {
  return <><input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} onFocus={(e) => e.currentTarget.select()} /><span className={styles.unit}>{suffix}</span></>;
}
