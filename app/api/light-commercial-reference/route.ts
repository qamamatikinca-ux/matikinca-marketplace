import { NextRequest, NextResponse } from "next/server";
import { getLightCommercialModelYearStatus } from "@/lib/southAfricanLightCommercialCatalog";
import {
  lightCommercialReferenceDetails, referenceFilenameMatches, referenceFilenameMatchesYear, storedLightCommercialPhotos,
  trustedWikimediaImage, type LightCommercialPhoto,
} from "@/lib/lightCommercialModelPhotos";

export const runtime = "nodejs";

type WikimediaEntry = { title?: string; index?: number; imageinfo?: Array<{
  thumburl?: string; url?: string; mime?: string; width?: number; height?: number;
  extmetadata?: Record<string, { value?: string }>;
}> };
const HEADERS = { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" };
const NO_STORE = { "Cache-Control": "no-store" };
const cleanCredit = (value: string) => value.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').slice(0, 180);

function identifiableBodyStyle(filename:string){
  const lower=filename.toLowerCase().replace(/[_-]/g," ");
  if(/double\s*cab|dual\s*cab/.test(lower))return "double-cab";
  if(/single\s*cab/.test(lower))return "single-cab";
  if(/extended\s*cab|super\s*cab|extra\s*cab/.test(lower))return "extended-cab";
  if(/crew\s*van/.test(lower))return "crew-van";
  if(/passenger\s*van/.test(lower))return "passenger-van";
  if(/panel\s*van/.test(lower))return "panel-van";
  return "";
}
function chosenBodyStyle(body:string){
  const b=body.toLowerCase();
  if(b==="double cab bakkie")return "double-cab";
  if(b==="single cab bakkie")return "single-cab";
  if(b==="extended cab bakkie")return "extended-cab";
  if(b==="crew van")return "crew-van";
  if(b==="passenger van"||b==="minibus / people carrier")return "passenger-van";
  if(b==="panel van")return "panel-van";
  return "";
}
async function searchCommons(make: string, model: string, year: number, bodyType: string): Promise<LightCommercialPhoto[]> {
  const endpoint = new URL("https://commons.wikimedia.org/w/api.php");
  const params = endpoint.searchParams;
  params.set("action", "query"); params.set("format", "json");
  params.set("generator", "search"); params.set("gsrnamespace", "6");
  params.set("gsrlimit", "50"); params.set("gsrsearch", make + " " + model + " " + year + " filetype:bitmap");
  params.set("prop", "imageinfo"); params.set("iiprop", "url|mime|size|extmetadata");
  params.set("iiurlwidth", "960"); params.set("iiextmetadatafilter", "LicenseShortName|Artist|Credit");
  const response = await fetch(endpoint, {
    headers: { Accept: "application/json", "User-Agent": "LoadLink/1.0 (https://matikinca-marketplace.vercel.app; vehicle model references)" },
    signal: AbortSignal.timeout(9000), cache: "no-store",
  });
  if (!response.ok) throw new Error("Reference provider unavailable");
  const data = await response.json() as { error?: unknown; query?: { pages?: Record<string, WikimediaEntry> } };
  if (data.error) throw new Error("Reference provider unavailable");
  return Object.values(data.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0)).flatMap(row => {
    const info = row.imageinfo?.[0];
    const observedBody=identifiableBodyStyle(row.title||"");
    if(observedBody && chosenBodyStyle(bodyType) && observedBody!==chosenBodyStyle(bodyType))return [];
    if (!info || !row.title || !referenceFilenameMatches(row.title, make, model) || !referenceFilenameMatchesYear(row.title, year)
      || !/^image\/(?:jpeg|png|webp)$/.test(info.mime || "") || (info.width || 0) < 460 || (info.height || 0) < 260) return [];
    // Thumbnails moved to thumb.wikimedia.org. Rejecting that host discarded valid results.
    const url = [info.thumburl, info.url].find(value => value && trustedWikimediaImage(value));
    if (!url) return [];
    const license = cleanCredit(info.extmetadata?.LicenseShortName?.value || "");
    if (!/^(?:CC BY|CC0|Public domain|PD-)/i.test(license)) return [];
    return [{ url, fallbackUrl: info.url && trustedWikimediaImage(info.url) ? info.url : undefined,
      title: row.title.replace(/^File:/i, "").replace(/\.[^.]+$/, "").replace(/_/g, " "),
      credit: cleanCredit(info.extmetadata?.Artist?.value || info.extmetadata?.Credit?.value || "Wikimedia Commons contributor"), license, yearFrom: year, yearTo: year, matchKind: "exact-year" as const }];
  }).slice(0, 3);
}

export async function GET(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get("kind")==="truck" ? "truck" : "bakkie_van";
  const make = (request.nextUrl.searchParams.get("make") || "").trim();
  const model = (request.nextUrl.searchParams.get("model") || "").trim();
  const bodyType = (request.nextUrl.searchParams.get("body") || "").trim().slice(0,80);
  const year = Number(request.nextUrl.searchParams.get("year") || 0);
  if (!make || !model || make.length > 64 || model.length > 64 || !/^[a-zA-Z0-9À-ÿ .'-]+$/.test(make + model)
    || !Number.isInteger(year) || year < 2009 || year > new Date().getFullYear())
    return NextResponse.json({ photos: [], error: "Invalid vehicle details" }, { status: 400, headers: NO_STORE });
  const reference = lightCommercialReferenceDetails(make, model);
  const availability = kind==="truck" ? null : getLightCommercialModelYearStatus(reference.make, reference.model, year);
  if (availability && !availability.valid)
    return NextResponse.json({ photos: [], availability, reason: "year_not_listed" }, { headers: HEADERS });
  const stored = kind==="truck" ? [] : storedLightCommercialPhotos(reference.make, model, year);
  if (stored.length)
    return NextResponse.json({ photos: stored, availability, kind: "model_family_reference" }, { headers: HEADERS });
  try {
    const photos = await searchCommons(reference.make, model, year, bodyType);
    // An empty lookup must not leave this model without pictures for a full day.
    return NextResponse.json({ photos, availability, kind: "model_family_reference" }, { headers: photos.length ? HEADERS : NO_STORE });
  } catch {
    return NextResponse.json({ photos: [], availability, temporarilyUnavailable: true }, { headers: NO_STORE });
  }
}
