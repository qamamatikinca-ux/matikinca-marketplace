export const MANUAL_DAILY_PRICE_CENTS = 1400;
export const MANUAL_DAILY_UNAVAILABLE = "Daily vehicle billing is being updated. New Manual payments are temporarily unavailable.";
export function isManualDailyProduct(product: unknown): boolean {
  if (!product || typeof product !== "object") return false;
  const row = product as Record<string, unknown>;
  return row.code === "manual_listing_credit" && Number(row.unit_price_cents) === MANUAL_DAILY_PRICE_CENTS
    && Number(row.duration_days) === 1 && String(row.currency).toUpperCase() === "ZAR";
}
