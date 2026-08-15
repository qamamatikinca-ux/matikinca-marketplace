import { NextResponse } from "next/server";
import { serverRateLimit } from "@/lib/serverRateLimit";

const blockedWords = ["logo","badge","emblem","interior","dashboard","engine bay","brochure","drawing","diagram","bus","coach","toy","model car","miniature"];

function stripHtml(value: unknown) { return String(value || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim(); }
function normalise(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function usefulTokens(value: string) { return normalise(value).split(" ").filter((token) => token.length > 1); }

function rankTitle(title: string, brand: string, model: string, year: string, width = 0, height = 0) {
  const cleanTitle = normalise(title);
  if (blockedWords.some((word) => cleanTitle.includes(normalise(word)))) return -200;
  const brandTokens = usefulTokens(brand);
  const modelTokens = usefulTokens(model);
  let score = 0;
  brandTokens.forEach((token) => { if (cleanTitle.includes(token)) score += 5; });
  modelTokens.forEach((token) => { if (cleanTitle.includes(token)) score += 10; });
  if (year && cleanTitle.includes(year)) score += 7;
  if (/truck|lorry|tractor|tipper|cab|prime mover|semi truck/.test(cleanTitle)) score += 4;
  if (/front|side|road|highway|show|expo|fleet/.test(cleanTitle)) score += 1;
  if (width >= 1000) score += 2;
  if (height > 0 && width / height >= 1.25) score += 2;
  if (/rear|detail|close up|closeup/.test(cleanTitle)) score -= 2;
  return score;
}

type WikiPage = { title?: string; imageinfo?: Array<{ url?: string; thumburl?: string; mime?: string; width?: number; height?: number; descriptionurl?: string; extmetadata?: Record<string, { value?: string }> }> };
type Candidate = { score: number; title: string; url: string; originalUrl: string; descriptionUrl: string; width: number | null; height: number | null; credit: string; license: string; licenseUrl: string };

async function searchCommons(query: string, brand: string, model: string, year: string) {
  const endpoint = new URL("https://commons.wikimedia.org/w/api.php");
  endpoint.searchParams.set("action", "query"); endpoint.searchParams.set("generator", "search"); endpoint.searchParams.set("gsrsearch", query); endpoint.searchParams.set("gsrnamespace", "6"); endpoint.searchParams.set("gsrlimit", "32"); endpoint.searchParams.set("prop", "imageinfo"); endpoint.searchParams.set("iiprop", "url|mime|size|extmetadata"); endpoint.searchParams.set("iiurlwidth", "1600"); endpoint.searchParams.set("format", "json"); endpoint.searchParams.set("origin", "*");
  const response = await fetch(endpoint, { headers: { "User-Agent": "LoadLink commercial vehicle reference image finder/3.0", Accept: "application/json" }, next: { revalidate: 60 * 60 * 24 * 7 } });
  if (!response.ok) throw new Error(`Wikimedia returned ${response.status}`);
  const payload = await response.json();
  const pages = Object.values(payload?.query?.pages || {}) as WikiPage[];
  return pages.map((page): Candidate | null => {
    const info = page.imageinfo?.[0]; const mime = info?.mime || "";
    if (!info?.url || !mime.startsWith("image/") || mime.includes("svg") || mime.includes("gif")) return null;
    if ((info.width || 0) < 500 || (info.height || 0) < 280) return null;
    return { score: rankTitle(page.title || "", brand, model, year, info.width || 0, info.height || 0), title: page.title || `${brand} ${model}`, url: info.thumburl || info.url, originalUrl: info.url, descriptionUrl: info.descriptionurl || "https://commons.wikimedia.org/", width: info.width || null, height: info.height || null, credit: stripHtml(info.extmetadata?.Artist?.value || info.extmetadata?.Credit?.value || "Wikimedia Commons contributor"), license: stripHtml(info.extmetadata?.LicenseShortName?.value || "Wikimedia Commons licence"), licenseUrl: stripHtml(info.extmetadata?.LicenseUrl?.value || info.descriptionurl || "https://commons.wikimedia.org/") };
  }).filter((candidate): candidate is Candidate => Boolean(candidate));
}

export async function GET(request: Request) {
  const limited = serverRateLimit(request, "truck-image", 30, 60_000); if (limited) return limited;
  const { searchParams } = new URL(request.url);
  const brand = (searchParams.get("brand") || "").trim().slice(0, 80);
  const model = (searchParams.get("model") || "").trim().slice(0, 100);
  const year = (searchParams.get("year") || "").trim().slice(0, 4);
  if (!brand || !model) return NextResponse.json({ error: "Brand and model are required." }, { status: 400 });

  const queries = [`${brand} ${model} ${year} truck`.trim(), `${brand} ${model} ${year}`.trim(), `${brand} ${model} truck`.trim(), `${brand} ${model} tractor unit`.trim()];
  try {
    const searches = await Promise.allSettled(queries.map((query) => searchCommons(query, brand, model, year)));
    const unique = new Map<string, Candidate>();
    searches.forEach((result) => { if (result.status === "fulfilled") result.value.forEach((candidate) => { const existing = unique.get(candidate.originalUrl); if (!existing || candidate.score > existing.score) unique.set(candidate.originalUrl, candidate); }); });
    const candidates = Array.from(unique.values()).sort((first, second) => second.score - first.score);
    const best = candidates[0];
    if (!best) return NextResponse.json({ imageUrl: null, images: [], title: `${brand} ${model}`, exactMatch: false, matchConfidence: "reference", credit: "", license: "", sourceUrl: "" });

    const bestConfidence = best.score >= 27 ? "high" : best.score >= 17 ? "medium" : "reference";
    const imageSet = candidates.filter((item) => item.score >= Math.max(14, best.score - 10)).slice(0, 8).map((item) => ({ imageUrl: item.url, originalUrl: item.originalUrl, title: item.title, matchConfidence: item.score >= 27 ? "high" : item.score >= 17 ? "medium" : "reference", credit: item.credit, license: item.license, sourceUrl: item.descriptionUrl, licenseUrl: item.licenseUrl }));

    return NextResponse.json({ imageUrl: best.url, originalUrl: best.originalUrl, images: imageSet, title: best.title, exactMatch: bestConfidence === "high", matchConfidence: bestConfidence, credit: best.credit, license: best.license, sourceUrl: best.descriptionUrl, licenseUrl: best.licenseUrl });
  } catch (error) {
    return NextResponse.json({ imageUrl: null, images: [], title: `${brand} ${model}`, exactMatch: false, matchConfidence: "reference", credit: "", license: "", sourceUrl: "", warning: error instanceof Error ? error.message : "Reference image lookup failed." });
  }
}
