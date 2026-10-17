import photographs from "@/data/light-commercial-model-photos.json";
import { lightCommercialCatalog } from "@/lib/southAfricanLightCommercialCatalog";

export type LightCommercialPhoto = {
  url: string;
  fallbackUrl?: string;
  title: string;
  credit: string;
  license: string;
};

export const normalizeReferenceName = (value: string) => value.toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Registration-paper trim descriptions still resolve to their known model family. */
export function lightCommercialReferenceDetails(make: string, model: string) {
  const brand = lightCommercialCatalog.find(item => normalizeReferenceName(item.name) === normalizeReferenceName(make));
  const normalized = normalizeReferenceName(model);
  const withoutMake = normalized.startsWith(normalizeReferenceName(make) + " ")
    ? normalized.slice(normalizeReferenceName(make).length + 1) : normalized;
  const candidate = [...(brand?.models || [])].sort((a, b) => b.name.length - a.name.length).find(item => {
    const name = normalizeReferenceName(item.name);
    return withoutMake === name || withoutMake.startsWith(name + " ") || withoutMake.replace(/ /g, "") === name.replace(/ /g, "");
  });
  return { make: brand?.name || make.trim(), model: candidate?.name || model.trim() };
}

export function storedLightCommercialPhotos(make: string, model: string): LightCommercialPhoto[] {
  const reference = lightCommercialReferenceDetails(make, model);
  return photographs.filter(photo => normalizeReferenceName(photo.make) === normalizeReferenceName(reference.make)
    && normalizeReferenceName(photo.model) === normalizeReferenceName(reference.model))
    .map(photo => ({ url: photo.url, fallbackUrl: photo.sourceImageUrl, title: photo.title, credit: photo.credit, license: photo.license }));
}

/** Wikimedia serves scaled photographs from both of these exact hosts. */
export function trustedWikimediaImage(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["upload.wikimedia.org", "thumb.wikimedia.org"].includes(url.hostname)
      && !url.port && !url.username && !url.password && url.pathname.startsWith("/wikipedia/");
  } catch { return false; }
}

export function referenceFilenameMatches(filename: string, make: string, model: string) {
  const name = " " + normalizeReferenceName(filename.replace(/^File:/i, "")) + " ";
  const aliases: Record<string, string[]> = {
    "volkswagen": ["volkswagen", "vw"], "mercedes benz": ["mercedes benz", "mercedes"],
    "gwm": ["gwm", "great wall"], "ldv": ["ldv", "maxus"],
  };
  const brands = aliases[normalizeReferenceName(make)] || [normalizeReferenceName(make)];
  const modelName = normalizeReferenceName(model);
  const tokens = modelName.split(" ").filter(word => !["series", "model", "cargo", "van", "pickup"].includes(word));
  return brands.some(brand => name.includes(" " + brand + " "))
    && (name.replace(/ /g, "").includes(modelName.replace(/ /g, ""))
      || (tokens.length > 0 && tokens.every(word => name.includes(" " + word + " "))));
}
