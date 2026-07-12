"use client";

import { useEffect, useState } from "react";

type Item = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  image: string;
  imageCredit?: string;
  summary: string;
};

function proxiedImage(url: string) {
  if (!url) return "/images/news/logistics-fallback.jpg";
  if (url.startsWith("/")) return url;
  return `/api/news-image?url=${encodeURIComponent(url)}`;
}

export default function LogisticsNews({ darkMode }: { darkMode: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/logistics-news", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setItems(data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className={`px-5 py-14 md:px-12 ${darkMode ? "bg-black text-white" : "bg-white text-black"}`}>
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.25em] text-[#b88900]">Industry update</p>
            <h2 className="mt-2 text-4xl font-black">South African logistics news</h2>
          </div>
          <span className="hidden text-xs font-bold opacity-45 md:block">Updated automatically</span>
        </div>

        <div className="no-scrollbar mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
          {loading
            ? [1, 2, 3].map((number) => (
                <div key={number} className="h-80 min-w-[82vw] animate-pulse bg-black/10 md:min-w-[340px]" />
              ))
            : items.map((item) => (
                <a
                  key={`${item.url}-${item.title}`}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`min-w-[82vw] snap-start overflow-hidden border md:min-w-[340px] md:max-w-[340px] ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}
                >
                  <div className="relative h-44 bg-black/5">
                    <img
                      src={proxiedImage(item.image)}
                      alt=""
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.src = "/images/news/logistics-fallback.jpg";
                      }}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-2 right-2 max-w-[85%] bg-black/75 px-2 py-1 text-right text-[9px] font-bold text-white">
                      {item.imageCredit || `Image · ${item.source}`}
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-black uppercase tracking-[.14em] text-[#b88900]">{item.source}</p>
                    <h3 className="mt-2 text-xl font-black leading-tight">{item.title}</h3>
                    <p className={`mt-3 line-clamp-3 text-sm leading-6 ${darkMode ? "text-white/55" : "text-black/55"}`}>{item.summary}</p>
                    <p className="mt-4 text-xs font-bold">Read original source</p>
                  </div>
                </a>
              ))}
        </div>

        {!loading && items.length === 0 ? (
          <div className={`mt-7 border p-6 ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
            <p className="font-black">News is temporarily unavailable.</p>
            <p className="mt-2 text-sm opacity-55">The section will retry automatically the next time the page opens.</p>
          </div>
        ) : null}

        <p className={`mt-3 text-xs ${darkMode ? "text-white/40" : "text-black/40"}`}>
          Headlines and images belong to the credited publishers. LoadLink links to the original source.
        </p>
      </div>
    </section>
  );
}
