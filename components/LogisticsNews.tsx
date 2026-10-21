"use client";

import LoadLinkImage from "@/components/LoadLinkImage";

import { useCallback, useEffect, useRef, useState } from "react";

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
  const [activeIndex, setActiveIndex] = useState(0);
  const alive = useRef(true);
  const railRef = useRef<HTMLDivElement>(null);

  function updateActiveArticle() {
    const rail = railRef.current;
    if (!rail || !items.length) return;
    const centre = rail.getBoundingClientRect().left + rail.clientWidth / 2;
    let nearest = 0;
    let distance = Infinity;
    Array.from(rail.children).forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      const next = Math.abs(rect.left + rect.width / 2 - centre);
      if (next < distance) { nearest = index; distance = next; }
    });
    setActiveIndex(nearest);
  }

  function showArticle(index: number) {
    const rail = railRef.current;
    const card = rail?.children.item(index);
    if (!rail || !card) return;
    const rect = card.getBoundingClientRect();
    const left = rail.scrollLeft + rect.left - rail.getBoundingClientRect().left - (rail.clientWidth - rect.width) / 2;
    rail.scrollTo({ left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/logistics-news");
      if (!response.ok) throw new Error("News request failed");
      const data = await response.json();
      if (alive.current && Array.isArray(data.items) && data.items.length) setItems(data.items);
    } catch {
      // Keep the last successful headlines on screen if a refresh briefly fails.
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    const initialFrame = window.requestAnimationFrame(() => void refresh());

    const timer = window.setInterval(() => void refresh(), 60 * 60 * 1000);
    const onFocus = () => void refresh();
    const onVisibility = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      alive.current = false;
      window.cancelAnimationFrame(initialFrame);
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  return (
    <section data-loadlink-publisher-news="true" className={`px-5 py-14 md:px-12 ${darkMode ? "bg-black text-white" : "bg-white text-black"}`}>
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-4xl font-black">South African logistics news</h2>
          </div>
          <span className="hidden text-xs font-bold opacity-45 md:block">Publisher headlines · checked daily</span>
        </div>

        <div ref={railRef} data-loadlink-no-swipe-dots="true" onScroll={updateActiveArticle} className="no-scrollbar mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
          {loading && items.length === 0
            ? [1, 2, 3].map((number) => (
                <div key={number} className="h-80 min-w-[82vw] animate-pulse bg-black/10 md:min-w-[340px]" />
              ))
            : items.map((item) => (
                <a
                  key={`${item.url}-${item.title}`}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`rounded-2xl min-w-[82vw] snap-start overflow-hidden border md:min-w-[340px] md:max-w-[340px] ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}
                >
                  <div className="relative h-44 bg-black/5">
                    <LoadLinkImage
                      src={item.image}
                      alt=""
                      loading="lazy"
                      onError={(event) => {
                        if (event.currentTarget.dataset.newsProxyTried !== "true") {
                          event.currentTarget.dataset.newsProxyTried = "true";
                          event.currentTarget.removeAttribute("srcset");
                          event.currentTarget.src = proxiedImage(item.image);
                          return;
                        }
                        event.currentTarget.style.visibility = "hidden";
                      }}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-2 right-2 max-w-[85%] bg-black/75 px-2 py-1 text-right text-[9px] font-bold text-white">
                      {item.imageCredit || `Image · ${item.source}`}
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-black uppercase tracking-[.14em] text-[#b88900]">{item.source}</p>
                    <p className="mt-2 text-xs opacity-55">{new Date(item.publishedAt).toLocaleDateString("en-ZA",{day:"numeric",month:"short",year:"numeric"})}</p>
                    <h3 className="mt-2 text-xl font-black leading-tight">{item.title}</h3>
                    {item.summary ? <p className="mt-3 text-sm opacity-60">{item.summary}</p> : null}
                    <p className="mt-4 text-sm font-bold">Read article</p>
                  </div>
                </a>
              ))}
        </div>

        {items.length > 1 ? (
          <div className="mt-2 flex flex-wrap justify-center gap-1" role="group" aria-label="News articles">
            {items.map((item, index) => (
              <button key={item.url} type="button" onClick={() => showArticle(index)}
                aria-label={`Show article ${index + 1} of ${items.length}`}
                aria-current={index === Math.min(activeIndex, items.length - 1) ? "true" : "false"}
                className="flex min-h-11 min-w-8 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b88900]">
                <span aria-hidden="true" className={`h-2 rounded-full transition-[width,background-color] ${index === Math.min(activeIndex, items.length - 1) ? "w-6 bg-[#f6b800]" : darkMode ? "w-2 bg-white/25" : "w-2 bg-black/20"}`} />
              </button>
            ))}
          </div>
        ) : null}

        {!loading && items.length === 0 ? (
          <div className={`mt-7 border p-6 ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
            <p className="font-black">News is temporarily unavailable.</p>
            <p className="mt-2 text-sm opacity-55">LoadLink will retry automatically while the site is open.</p>
          </div>
        ) : null}

        <p className={`mt-3 text-xs ${darkMode ? "text-white/40" : "text-black/40"}`}>
          Headlines and images belong to the credited publishers. LoadLink links to the original source.
        </p>
      </div>
    </section>
  );
}
