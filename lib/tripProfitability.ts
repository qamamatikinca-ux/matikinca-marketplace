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
      input.dieselRandPerLitre <= 0 || input.targetMarginPercent >= 100) return null;
  const totalKm = input.loadedKm + input.emptyKm;
  const fuelLitres = totalKm * input.litresPer100Km / 100;
  const fuelCost = fuelLitres * input.dieselRandPerLitre;
  const maintenanceCost = totalKm * input.maintenanceRandPerKm;
  const totalCost = roundMoney(fuelCost + maintenanceCost + input.tolls +
    input.driverExpenses + input.otherCosts);
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
    suggestedRate: roundMoney(totalCost / (1 - input.targetMarginPercent / 100)),
  };
}
export function formatZar(n: number): string {
  return new Intl.NumberFormat("en-ZA",{style:"currency",currency:"ZAR"}).format(n);
}
