export type TripInputs = {
  loadedKm: number;
  emptyKm: number;
  litresPer100Km: number;
  dieselRandPerLitre: number;
  tolls: number;
  driverExpenses: number;
  maintenanceRandPerKm: number;
  otherCosts: number;
  offeredRevenue: number;
  targetMarginPercent: number;
};
export type TripEstimate = {
  totalKm: number;
  fuelLitres: number;
  fuelCost: number;
  maintenanceCost: number;
  totalCost: number;
  profit: number;
  marginPercent: number | null;
  breakEvenRate: number;
  suggestedRate: number;
};
function finiteNonNegative(n: number): boolean {
  return Number.isFinite(n) && n >= 0;
}
function roundMoney(n: number): number { return Math.round((n + Number.EPSILON) * 100) / 100; }
export function estimateTrip(input: TripInputs): TripEstimate | null {
  const entries = Object.values(input);
  if (!entries.every(finiteNonNegative) || input.loadedKm <= 0 || input.litresPer100Km <= 0 ||
      input.dieselRandPerLitre <= 0 || input.targetMarginPercent > 95 ||
      input.loadedKm > 1_000_000 || input.emptyKm > 1_000_000 ||
      input.litresPer100Km > 150 || input.dieselRandPerLitre > 200) return null;
  const totalKm = input.loadedKm + input.emptyKm;
  if (!Number.isFinite(totalKm) || totalKm > 2_000_000) return null;
  const fuelLitres = totalKm * input.litresPer100Km / 100;
  const fuelCost = fuelLitres * input.dieselRandPerLitre;
  const maintenanceCost = totalKm * input.maintenanceRandPerKm;
  const totalCost = roundMoney(fuelCost + maintenanceCost + input.tolls +
    input.driverExpenses + input.otherCosts);
  const suggestedRate = roundMoney(totalCost / (1 - input.targetMarginPercent / 100));
  if (![fuelLitres, fuelCost, maintenanceCost, totalCost, suggestedRate].every(Number.isFinite) ||
      suggestedRate > Number.MAX_SAFE_INTEGER / 100) return null;
  const profit = roundMoney(input.offeredRevenue - totalCost);
  const marginPercent = input.offeredRevenue > 0 ? profit / input.offeredRevenue * 100 : null;
  return {
    totalKm: roundMoney(totalKm),
    fuelLitres: roundMoney(fuelLitres),
    fuelCost: roundMoney(fuelCost),
    maintenanceCost: roundMoney(maintenanceCost),
    totalCost,
    profit,
    marginPercent,
    breakEvenRate: totalCost,
    suggestedRate,
  };
}
/**
 * A contract projection multiplies checked per-trip costs by user-entered
 * frequency and duration, never estimated market demand.
 */
export function estimateContractSpend(ratePerTrip: number, tripsPerMonth: number, months: number):
  { monthly: number; contractTotal: number } | null {
  if (![ratePerTrip,tripsPerMonth,months].every(Number.isFinite) ||
      ratePerTrip < 0 || !Number.isInteger(tripsPerMonth) || !Number.isInteger(months) ||
      tripsPerMonth < 1 || tripsPerMonth > 10000 || months < 1 || months > 240) return null;
  const monthly = roundMoney(ratePerTrip * tripsPerMonth);
  const contractTotal = roundMoney(monthly * months);
  if (!Number.isFinite(contractTotal) || contractTotal > Number.MAX_SAFE_INTEGER / 100) return null;
  return { monthly, contractTotal };
}
export function formatZar(n: number): string {
  return new Intl.NumberFormat("en-ZA",{style:"currency",currency:"ZAR"}).format(n);
}
