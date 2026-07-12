import { NextResponse } from "next/server";

const blockedWords = [
  "logo",
  "badge",
  "emblem",
  "interior",
  "dashboard",
  "engine",
  "brochure",
  "drawing",
  "diagram",
  "bus",
  "coach",
  "toy",
  "model car",
];

function stripHtml(value: unknown) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function rankTitle(title: string, brand: string, model: string) {
  const cleanTitle = normalise(title);
  const brandTokens = normalise(brand).split(" ").filter((token) => token.length > 1);
  const modelTokens = normalise(model).split(" ").filter((token) => token.length > 1);
  const blocked = blockedWords.some((word) => cleanTitle.includes(word));
  if (blocked) return -100;

  let score = 0;
  brandTokens.forEach((token) => {
    if (cleanTitle.includes(token)) score += 3;
  });
  modelTokens.forEach((token) => {
    if (cleanTitle.includes(token)) score += 6;
  });
  if (/truck|lorry|tractor|tipper|cab|prime mover/.test(cleanTitle)) score += 2;
  if (/front|side|road|highway|show|expo/.test(cleanTitle)) score += 1;
  return score;
}

type WikiPage = {
  title?: string;
  imageinfo?: Array<{
    url?: string;
    thumburl?: string;
    mime?: string;
    width?: number;
    height?: number;
    descriptionurl?: string;
    extmetadata?: Record<string, { value?: string }>;
  }>;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brand = (searchParams.get("brand") || "").trim().slice(0, 80);
  const model = (searchParams.get("model") || "").trim().slice(0, 100);
  const year = (searchParams.get("year") || "").trim().slice(0, 4);

  if (!brand || !model) {
    return NextResponse.json({ error: "Brand and model are required." }, { status: 400 });
  }

  const query = `${brand} ${model} truck ${year}`.trim();
  const endpoint = new URL("https://commons.wikimedia.org/w/api.php");
  endpoint.searchParams.set("action", "query");
  endpoint.searchParams.set("generator", "search");
  endpoint.searchParams.set("gsrsearch", query);
  endpoint.searchParams.set("gsrnamespace", "6");
  endpoint.searchParams.set("gsrlimit", "18");
  endpoint.searchParams.set("prop", "imageinfo");
  endpoint.searchParams.set("iiprop", "url|mime|size|extmetadata");
  endpoint.searchParams.set("iiurlwidth", "1280");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("origin", "*");

  try {
    const response = await fetch(endpoint, {
      headers: {
        "User-Agent": "LoadLink vehicle reference image finder/1.0",
        Accept: "application/json",
      },
      next: { revalidate: 60 * 60 * 24 * 7 },
    });

    if (!response.ok) throw new Error(`Wikimedia returned ${response.status}`);
    const payload = await response.json();
    const pages = Object.values(payload?.query?.pages || {}) as WikiPage[];

    const candidates = pages
      .map((page) => {
        const info = page.imageinfo?.[0];
        const mime = info?.mime || "";
        if (!info?.url || !mime.startsWith("image/")) return null;
        if (mime.includes("svg") || mime.includes("gif")) return null;
        if ((info.width || 0) < 500 || (info.height || 0) < 280) return null;
        return {
          score: rankTitle(page.title || "", brand, model),
          title: page.title || `${brand} ${model}`,
          url: info.thumburl || info.url,
          originalUrl: info.url,
          descriptionUrl: info.descriptionurl || "https://commons.wikimedia.org/",
          width: info.width || null,
          height: info.height || null,
          credit: stripHtml(info.extmetadata?.Artist?.value || info.extmetadata?.Credit?.value || "Wikimedia Commons contributor"),
          license: stripHtml(info.extmetadata?.LicenseShortName?.value || "Wikimedia Commons licence"),
          licenseUrl: stripHtml(info.extmetadata?.LicenseUrl?.value || info.descriptionurl || "https://commons.wikimedia.org/"),
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.score || 0) - (a?.score || 0));

    const best = candidates.find((candidate) => (candidate?.score || 0) >= 6) || candidates[0];

    if (!best) {
      return NextResponse.json({
        imageUrl: "/images/jobs/jobs-hero-fleet.jpg",
        title: `${brand} ${model}`,
        exactMatch: false,
        credit: "LoadLink fallback image",
        license: "Local site image",
        sourceUrl: "",
      });
    }

    return NextResponse.json({
      imageUrl: best.url,
      originalUrl: best.originalUrl,
      title: best.title,
      exactMatch: best.score >= 10,
      credit: best.credit,
      license: best.license,
      sourceUrl: best.descriptionUrl,
      licenseUrl: best.licenseUrl,
    });
  } catch (error) {
    return NextResponse.json({
      imageUrl: "/images/jobs/jobs-hero-fleet.jpg",
      title: `${brand} ${model}`,
      exactMatch: false,
      credit: "LoadLink fallback image",
      license: "Local site image",
      sourceUrl: "",
      warning: error instanceof Error ? error.message : "Reference image lookup failed.",
    });
  }
}
