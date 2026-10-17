import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 86400;

type CommonsEntry = {
  title?: string;
  imageinfo?: Array<{
    thumburl?: string;
    url?: string;
    descriptionurl?: string;
    mime?: string;
    width?: number;
    height?: number;
    extmetadata?: Record<string, { value?: string }>;
  }>;
};

const HEADERS = { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" };
const clean = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const htmlText = (value: string) => value.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").slice(0, 180);

function modelIsShown(filename: string, make: string, model: string) {
  const title = clean(filename.replace(/^File:/i, ""));
  const brandAlias: Record<string, string[]> = {
    "volkswagen": ["volkswagen", "vw"], "mercedes benz": ["mercedes benz", "mercedes", "mb"],
    "gwm": ["gwm", "great wall", "haval"], "chevrolet": ["chevrolet", "chevy"],
    "isuzu": ["isuzu"], "ldv": ["ldv", "maxus"],
  };
  const aliases = brandAlias[clean(make)] || [clean(make)];
  if (!aliases.some(alias => title.includes(alias))) return false;
  const tokens = clean(model).split(" ").filter(word => word.length >= 2 && !["the", "series", "cargo", "van", "model", "plus"].includes(word));
  if (!tokens.length) return false;
  // A real photo is shown only if its filename includes the make and distinctive model terms.
  return tokens.every(token => title.split(" ").includes(token));
}

function validUrl(value: string | undefined, domain: string) {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && u.hostname === domain && !u.username && !u.password && !u.port;
  } catch { return false; }
}

export async function GET(request: NextRequest) {
  const make = (request.nextUrl.searchParams.get("make") || "").trim();
  const model = (request.nextUrl.searchParams.get("model") || "").trim();
  const year = Number(request.nextUrl.searchParams.get("year") || 0);
  if (!make || !model || make.length > 64 || model.length > 64 || !/^[a-zA-Z0-9À-ÿ .'-]+$/.test(make + model) ||
      !Number.isInteger(year) || year < 2009 || year > new Date().getFullYear()) {
    return NextResponse.json({ photos: [], error: "Invalid vehicle reference" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const commons = new URL("https://commons.wikimedia.org/w/api.php");
  commons.searchParams.set("action", "query");
  commons.searchParams.set("format", "json");
  commons.searchParams.set("generator", "search");
  commons.searchParams.set("gsrnamespace", "6");
  commons.searchParams.set("gsrlimit", "30");
  commons.searchParams.set("gsrsearch", `intitle:"${make}" intitle:"${model.split(/\s+/)[0]}" filetype:bitmap`);
  commons.searchParams.set("prop", "imageinfo");
  commons.searchParams.set("iiprop", "url|mime|size|extmetadata");
  commons.searchParams.set("iiurlwidth", "920");
  commons.searchParams.set("iiextmetadatafilter", "LicenseShortName|LicenseUrl|Artist|Credit");
  try {
    const response = await fetch(commons, {
      headers: {
        Accept: "application/json",
        "User-Agent": "LoadLink-vehicle-reference/1.0 (https://matikinca-marketplace.vercel.app; public Wikimedia media references)"
      },
      signal: AbortSignal.timeout(8500),
      next: { revalidate: 86400 },
    });
    if (!response.ok) throw new Error("Reference service unavailable");
    const data = await response.json() as { query?: { pages?: Record<string, CommonsEntry> } };
    const pages = Object.values(data.query?.pages || {});
    const photos = pages.flatMap(row => {
      const info = row.imageinfo?.[0];
      if (!info || !row.title || !modelIsShown(row.title, make, model) ||
          !/^image\/(jpeg|png|webp)$/.test(info.mime || "") ||
          (info.width || 0) < 450 || (info.height || 0) < 260) return [];
      const url = info.thumburl || info.url;
      const licence = htmlText(info.extmetadata?.LicenseShortName?.value || "");
      if (!validUrl(url, "upload.wikimedia.org") || !validUrl(info.descriptionurl, "commons.wikimedia.org") ||
          !/^(CC BY|CC0|Public domain|PD-|CC BY-SA)/i.test(licence)) return [];
      return [{
        url: url!, title: row.title.replace(/^File:/i, "").replace(/\.[^.]+$/, "").replace(/[_-]/g, " "),
        sourceUrl: info.descriptionurl!, credit: htmlText(info.extmetadata?.Artist?.value || info.extmetadata?.Credit?.value || "Wikimedia Commons contributor"),
        license: licence
      }];
    }).slice(0, 3);
    return NextResponse.json({ make, model, year, photos, note: "Illustrative model-family photographs, not the advertised vehicle or necessarily its model year." }, { headers: HEADERS });
  } catch {
    return NextResponse.json({ make, model, year, photos: [], temporarilyUnavailable: true }, { headers: { "Cache-Control": "no-store" } });
  }
}
