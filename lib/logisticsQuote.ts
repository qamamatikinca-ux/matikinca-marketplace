export type RateUnit = "total" | "km" | "ton" | "day";
export function parsePostedRate(value: string | null): { amount: string; unit: RateUnit } | null {
 const match = value?.trim().match(/^(?:R|ZAR)?\s*(\d{1,3}(?:[ ,]\d{3})+(?:\.\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:(?:\/|per\s+)(km|ton(?:ne)?|day|trip)|(?:total|once off))?$/i);
 if (!match) return null;
 const raw = match[1].replaceAll(" ", "");
 const amount = /^\d+,\d{1,2}$/.test(raw) ? raw.replace(",", ".") : raw.replaceAll(",", "");
 if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) return null;
 const suffix = match[2]?.toLowerCase();
 return { amount, unit: suffix === "km" ? "km" : suffix?.startsWith("ton") ? "ton" : suffix === "day" ? "day" : "total" };
}
export const rateUnitLabel = (unit: RateUnit) => unit === "km" ? "per km" : unit === "ton" ? "per ton" : unit === "day" ? "per day" : "total trip";
