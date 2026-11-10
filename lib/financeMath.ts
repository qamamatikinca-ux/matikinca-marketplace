/**
 * LoadLink finance estimates. Amounts are ZAR; display rounding is separate from
 * calculation precision. Estimates are not lender offers or a payment ledger.
 */
const validAmount = (value: number) => Number.isFinite(value) && value >= 0;
const validTerm = (months: number) => Number.isSafeInteger(months) && months > 0 && months <= 600;
const validRate = (rate: number) => Number.isFinite(rate) && rate >= 0 && rate <= 1000;

export function paymentForLoan(principal: number, annualRate: number, months: number, balloonAmount = 0): number {
  if (!validAmount(principal) || !validAmount(balloonAmount) || !validTerm(months) || !validRate(annualRate)) return NaN;
  if (principal === 0) return balloonAmount === 0 ? 0 : NaN;
  if (balloonAmount > principal) return NaN;
  const r = annualRate / 1200;
  if (r === 0) return (principal - balloonAmount) / months;
  const growth = Math.pow(1 + r, -months);
  return (principal - balloonAmount * growth) * r / (1 - growth);
}

/** Solve monthly loan budget for a vehicle price, using a balloon based on price. */
export function buyingPowerForBudget(monthly: number, annualRate: number, months: number, upfront: number, financedFees: number, balloonRatio: number): number {
  if (![monthly, upfront, financedFees].every(validAmount) || !validTerm(months) || !validRate(annualRate)
    || !Number.isFinite(balloonRatio) || balloonRatio < 0 || balloonRatio > 0.4) return NaN;
  if (monthly === 0) return 0;
  const r = annualRate / 1200;
  const annuityFactor = r === 0 ? months : -Math.expm1(-months * Math.log1p(r)) / r;
  const discountedBalloonRatio = balloonRatio * (r === 0 ? 1 : Math.pow(1 + r, -months));
  const price = (monthly * annuityFactor + upfront - financedFees) / (1 - discountedBalloonRatio);
  return Number.isFinite(price) ? Math.max(0, price) : NaN;
}
