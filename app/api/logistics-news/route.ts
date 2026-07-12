import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type NewsItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  image: string;
  imageCredit: string;
  summary: string;
};

const covers = {
  road: "/images/news/road-freight.jpg",
  forklift: "/images/news/forklift-loading.jpg",
  contract: "/images/news/contracts-logistics.jpg",
  truck: "/images/news/truck-operations.jpg",
};

const fallback: NewsItem[] = [
  {
    title: "Latest South African freight and logistics updates",
    url: "https://www.freightnews.co.za/",
    source: "Freight News",
    publishedAt: new Date().toISOString(),
    image: covers.road,
    imageCredit: "Related logistics cover",
    summary: "Current reporting on road freight, ports, rail, borders and South African supply chains.",
  },
  {
    title: "Transport and freight industry updates",
    url: "https://www.engineeringnews.co.za/topic/freight-transport",
    source: "Engineering News",
    publishedAt: new Date().toISOString(),
    image: covers.truck,
    imageCredit: "Related logistics cover",
    summary: "Transport infrastructure and freight developments affecting operators across Southern Africa.",
  },
];

function decodeEntities(value: string) {
  let result = value || "";
  for (let index = 0; index < 3; index += 1) {
    result = result
      .replace(/<!\[CDATA\[|\]\]>/g, "")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&#x2F;/gi, "/")
      .replace(/&#(\d+);/g, (_, number) => String.fromCharCode(Number(number)));
  }
  return result.replace(/<[^>]*>/g, " ").replace(/https?:\/\/\S+/g, " ").replace(/\s+/g, " ").trim();
}

function rawTag(block: string, name: string) {
  return block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] || "";
}

function tag(block: string, name: string) {
  return decodeEntities(rawTag(block, name));
}

function coverFor(title: string, index: number) {
  const value = title.toLowerCase();
  if (/warehouse|forklift|distribution|delivery centre|depot/.test(value)) return covers.forklift;
  if (/contract|tender|construction|project/.test(value)) return covers.contract;
  if (/truck|road|driver|fleet|freight/.test(value)) return covers.truck;
  return [covers.road, covers.truck, covers.forklift, covers.contract][index % 4];
}

export async function GET() {
  try {
    const rss = "https://news.google.com/rss/search?q=South+Africa+logistics+freight+trucking+ports+rail+when:14d&hl=en-ZA&gl=ZA&ceid=ZA:en";
    const response = await fetch(rss, {
      cache: "no-store",
      headers: { "User-Agent": "LoadLink News" },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) throw new Error("News feed unavailable");

    const xml = await response.text();
    const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi)?.slice(0, 8) || [];

    const items: NewsItem[] = blocks
      .map((block, index) => {
        const fullTitle = tag(block, "title");
        const source = tag(block, "source") || fullTitle.split(" - ").pop() || "News source";
        const title = fullTitle.replace(/\s+-\s+[^-]+$/, "").trim();
        const url = tag(block, "link");
        const publishedAt = tag(block, "pubDate") || new Date().toISOString();

        return {
          title,
          url,
          source,
          publishedAt,
          image: coverFor(title, index),
          imageCredit: "Related logistics cover",
          summary: `Latest reporting from ${source} on this South African transport and logistics development.`,
        };
      })
      .filter((item) => item.title && item.url)
      .slice(0, 6);

    return NextResponse.json(
      {
        items: items.length ? items : fallback,
        updatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json(
      {
        items: fallback,
        updatedAt: new Date().toISOString(),
        fallback: true,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
