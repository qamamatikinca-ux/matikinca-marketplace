import { truckCatalog, type TruckBrand, type TruckModel } from "@/lib/truckCatalog";

export function normaliseTruckName(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(trucks|motors)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function findCatalogBrand(make: string): TruckBrand | null {
  const key = normaliseTruckName(make);
  if (!key) return null;
  return truckCatalog.find((brand) => normaliseTruckName(brand.name) === key) || null;
}

export function findCatalogModel(make: string, model: string, year?: number): { brand: TruckBrand; model: TruckModel } | null {
  const brand = findCatalogBrand(make);
  if (!brand) return null;
  const key = normaliseTruckName(model);
  if (!key) return null;
  const match = brand.models.find((entry) =>
    normaliseTruckName(entry.name) === key &&
    (!year || (year >= entry.from && year <= entry.to)),
  );
  return match ? { brand, model: match } : null;
}
