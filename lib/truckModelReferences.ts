import catalog from "@/data/truck-model-catalog.json";
export type TruckModelReference = (typeof catalog)[number];
export const truckModelReferences = catalog;
export function findTruckReference(brand: string, model: string) {
  return catalog.find(row => row.brand === brand && row.model === model) || null;
}
export function referencePhotoMatchesYear(row: TruckModelReference, year: number) {
  return !!row.photo_url && (row.photo_from_year != null || row.photo_to_year != null) && (!row.photo_from_year || year >= row.photo_from_year) && (!row.photo_to_year || year <= row.photo_to_year);
}
export function truckReferenceResponse(row: TruckModelReference, year: number) {
  const photo = referencePhotoMatchesYear(row, year);
  return { catalogId: row.id, brand: row.brand, model: row.model, imageUrl: photo ? row.photo_url?.startsWith("/") ? row.photo_url : `/api/truck-model-photo/${row.id}` : null,
    title: row.photo_label || `${row.brand} ${row.model}`, exactMatch: false, matchConfidence: "reference",
    sourceUrl: photo ? row.photo_source_url : null, credit: photo ? row.photo_credit : null, license: photo ? row.photo_license : null,
    verifiedFuel: row.verified_fuel, verifiedTransmission: row.verified_transmission, specSourceUrl: row.spec_source_url,
    fuelOptions: row.fuel_options, transmissionOptions: row.transmission_options, axleOptions: row.axle_options };
}
