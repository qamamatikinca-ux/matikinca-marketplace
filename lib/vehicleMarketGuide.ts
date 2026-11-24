import { normaliseTruckName } from "@/lib/truckCatalogLookup";
/**
 * Comparison uses advertised asking prices posted on LoadLink.
 * It is not an appraisal, completed-sale report, or loan approval.
 */
export type VehicleMarketRow = {
  id: string;
  title?: string | null;
  description?: string | null;
  vehicle_group?: string | null;
  rate?: string | null;
  listing_kind?: string | null;
  stock_status?: string | null;
  city?: string | null;
  photos?: string[] | null;
};

export function fieldFromDescription(description: string | null | undefined, label: string): string {
  const cleanLabel = label.replace(/[^a-z0-9 /-]/gi, "");
  const found = String(description || "").match(new RegExp("^" + cleanLabel + ":\\s*([^\\n\\r]+)", "im"));
  return found?.[1]?.trim() || "";
}

export function amountFromListingText(value: string | null | undefined): number | null {
  const original = String(value || "").trim();
  if (!original || /(poa|price on application|negotiable only|enquire|contact for price)/i.test(original)) return null;
  if (/\b(per|\/)\s*(day|week|month|km|ton|hour)\b/i.test(original)) return null;
  const match = original.replace(/\s/g, "").match(/^(?:R|ZAR)?([0-9][0-9,.]*)$/i);
  if (!match) return null;
  const number = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(number) && number > 0 && number <= 500000000 ? number : null;
}

export function isCommercialVehicle(row: VehicleMarketRow): boolean {
  const kind = String(row.listing_kind || "").toLowerCase();
  if (["vehicle", "asset", "truck_sale", "vehicle_listing"].includes(kind)) return true;
  return /^Listing type:\s*(Truck|Bakkie|Van|Trailer|Mobile Unit)/im.test(String(row.description || ""));
}

export function advertisedSalePrice(row: VehicleMarketRow): number | null {
  const offer = fieldFromDescription(row.description, "Offer").toLowerCase();
  if (/rental only|for rent only|hire only|not for sale/.test(offer)) return null;
  // Generic "rate" can mean a rental. Require an explicitly entered sale price.
  return amountFromListingText(fieldFromDescription(row.description, "Sale price"));
}

export function vehicleMatchFields(row: VehicleMarketRow) {
  const desc = row.description;
  const yearText = fieldFromDescription(desc, "Year");
  const year = Number(yearText);
  return {
    make: fieldFromDescription(desc, "Make").toLowerCase(),
    model: fieldFromDescription(desc, "Model").toLowerCase(),
    year: Number.isInteger(year) && year >= 1970 && year <= new Date().getFullYear() + 1 ? year : null,
  };
}

export type ComparableResult = {
  sampleSize: number;
  low: number;
  median: number;
  high: number;
  listings: Array<VehicleMarketRow & { askingPrice: number }>;
};

export function comparableAskingPrices(
  rows: VehicleMarketRow[],
  makeText: string,
  modelText: string,
  year: string,
  excludedId?: string
): ComparableResult | null {
  const make = normaliseTruckName(makeText);
  const model = normaliseTruckName(modelText);
  if (make.length < 2 || model.length < 2) return null;
  const requestedYear = year ? Number(year) : null;
  if (requestedYear !== null && (!Number.isInteger(requestedYear) || requestedYear < 1970 || requestedYear > new Date().getFullYear() + 1)) return null;
  const matches = rows.flatMap((row) => {
    if (row.id === excludedId || !isCommercialVehicle(row)) return [];
    if (row.stock_status && !["available", "in_stock"].includes(row.stock_status.toLowerCase())) return [];
    const spec = vehicleMatchFields(row);
    if (normaliseTruckName(spec.make) !== make || normaliseTruckName(spec.model) !== model) return [];
    if (requestedYear !== null && (spec.year === null || Math.abs(spec.year - requestedYear) > 2)) return [];
    const price = advertisedSalePrice(row);
    if (price === null) return [];
    return [{ ...row, askingPrice: price }];
  });
  // At least three like-for-like active asking prices required.
  if (matches.length < 3) return null;
  const sorted = [...matches].sort((a, b) => a.askingPrice - b.askingPrice);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid].askingPrice : (sorted[mid - 1].askingPrice + sorted[mid].askingPrice) / 2;
  return { sampleSize: matches.length, low: sorted[0].askingPrice, median, high: sorted[sorted.length - 1].askingPrice, listings: sorted.slice(0, 10) };
}

export function formatZar(value: number): string {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(value).replace(/\u00a0/g, " ");
}

/** Uses only matching, publicly advertised LoadLink vehicle prices. No valuation is invented. */
export type VehiclePriceSignal={label:"Underpriced"|"Good offer"|"Overpriced";median:number;expected:number;low:number;high:number;sampleSize:number;conditionAdjustment:number;mileageAdjustment:number};
function normalisedMileage(description:string|null|undefined){
 const source=fieldFromDescription(description,"Mileage").replace(/,/g,"").replace(/\s/g,"");
 const match=source.match(/^\d{1,7}/);return match?Number(match[0]):null;
}
function conditionWeight(value:string){
 const s=value.toLowerCase();
 if(/new|excellent|immaculate/.test(s))return 1.07;
 if(/very good/.test(s))return 1.045;
 if(/needs|repair|damag|poor/.test(s))return .84;
 if(/fair|average/.test(s))return .93;
 return 1;
}
export function vehiclePriceSignal(rows:VehicleMarketRow[],row:VehicleMarketRow,override?:{condition?:string;mileage?:number|null;asking?:number|null}):VehiclePriceSignal|null{
 const meta=vehicleMatchFields(row);
 if(!meta.make||!meta.model)return null;
 const comps=comparableAskingPrices(rows,meta.make,meta.model,meta.year?String(meta.year):"",row.id);
 if(!comps||comps.sampleSize<3)return null;
 const targetCondition=override?.condition||fieldFromDescription(row.description,"Condition");
 const listedCondition=comps.listings.map(x=>conditionWeight(fieldFromDescription(x.description,"Condition")));
 const baseline=listedCondition.reduce((a,b)=>a+b,0)/(listedCondition.length||1);
 const conditionAdjustment=Math.max(.80,Math.min(1.13,conditionWeight(targetCondition)/baseline));
 const targetMileage=override?.mileage??normalisedMileage(row.description);
 const mileages=comps.listings.map(x=>normalisedMileage(x.description)).filter((v):v is number=>v!==null);
 const medianKm=mileages.length>=3?mileages.sort((a,b)=>a-b)[Math.floor(mileages.length/2)]:null;
 const mileageAdjustment=medianKm!==null&&targetMileage!==null?
   Math.max(.89,Math.min(1.11,1+(medianKm-targetMileage)*0.00000022)):1;
 const expected=comps.median*conditionAdjustment*mileageAdjustment;
 const asking=override?.asking??advertisedSalePrice(row);
 if(asking===null||asking<=0||!Number.isFinite(expected)||expected<=0)return null;
 return {label:asking<expected*.85?"Underpriced":asking>expected*1.15?"Overpriced":"Good offer",
 median:comps.median,expected,low:expected*.86,high:expected*1.14,sampleSize:comps.sampleSize,conditionAdjustment,mileageAdjustment};
}
