import truckPhotos from "@/data/truck-model-catalog.json";
import bakkiePhotos from "@/data/light-commercial-model-photos.json";

export type ModelFamilyPhoto = {
  src: string;
  name: string;
  caption: string;
  yearVerified: boolean;
  fallbackSrc?: string;
  sourceUrl?: string;
};

const clean = (value: string) =>
  value.normalize("NFD").toLowerCase().replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Returns an actual curated photo of the selected model family, not a generic
 * truck/bakkie. Photo does not certify a particular model year or trim.
 */
export function modelFamilyPhoto(
  kind: "truck" | "bakkie",
  make: string,
  model: string,
  year?: number,
): ModelFamilyPhoto | null {
  const manufacturer = clean(make);
  const family = clean(model);
  if (!manufacturer || !family) return null;
  if (kind === "truck") {
    const row = truckPhotos.find(item => clean(item.brand) === manufacturer && clean(item.model) === family);
    if (!row?.photo_url) return null;
    const localPhoto = row.photo_url.startsWith("/images/truck-models/");
    const hasVerifiedYears = typeof row.photo_from_year === "number" || typeof row.photo_to_year === "number";
    const yearVerified = Boolean(year && hasVerifiedYears
      && (!row.photo_from_year || year >= row.photo_from_year)
      && (!row.photo_to_year || year <= row.photo_to_year));
    return {
      src: localPhoto ? row.photo_url : "/api/truck-model-photo/" + encodeURIComponent(row.id),
      name: row.brand + " " + row.model,
      caption: yearVerified ? "Model-year reference" : "Actual model-family photo · year and trim may differ",
      yearVerified,
    };
  }
  const row = bakkiePhotos.find(item => clean(item.make) === manufacturer && clean(item.model) === family
    && item.referenceMatch !== "unverified");
  if (!row?.url || !row.url.startsWith("/images/light-commercial-models/")) return null;
  const yearVerified = Boolean(year && typeof row.referenceYearFrom === "number"
    && typeof row.referenceYearTo === "number" && year >= row.referenceYearFrom
    && year <= row.referenceYearTo);
  return {
    src: row.url,
    name: row.make + " " + row.model,
    caption: yearVerified ? "Model-generation reference" : "Actual model-family photo · year and trim may differ",
    yearVerified,
  };
}
