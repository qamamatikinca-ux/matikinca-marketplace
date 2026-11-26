/**
 * A comparable sale listing can only be checked after the owner has supplied
 * the vehicle identity and actual usage. A model name never proves condition
 * or the asking price, and total odometer km is not annual mileage.
 */
export type VehiclePricingReadiness = {
  make: string; model: string; year: number; condition: string; mileage: string;
  offerMode: string; detailsComplete: boolean;
};
export function canAutoDetermineVehiclePrice(input: VehiclePricingReadiness): boolean {
  const saleMode = ["sale", "sale_or_rental", "poa"].includes(input.offerMode);
  const odometer = input.mileage.trim() ? Number(input.mileage) : NaN;
  return saleMode && input.detailsComplete &&
    input.make.trim().length >= 2 && input.model.trim().length >= 2 &&
    Number.isInteger(input.year) && input.year >= 1970 &&
    input.year <= new Date().getFullYear() + 1 &&
    input.condition.trim().length > 0 && Number.isSafeInteger(odometer) &&
    odometer >= 0 && odometer <= 10_000_000;
}
