"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RecentItem = {
  id: string;
  title: string;
  href: string;
  category: string;
  type: string;
  image?: string;
  meta?: string;
  savedAt?: number;
};

type ActivityTab = "posted" | "viewed" | "liked";

function parseItems(key: string): RecentItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item?.title && item?.href) : [];
  } catch {
    localStorage.removeItem(key);
    return [];
  }
}

function getViewedItems() {
  const jobs = parseItems("loadlink-recent-viewed-jobs");
  const portals = parseItems("loadlink-recent-activity").map((item) => ({
    ...item,
    id: item.id || item.title,
    category: item.category || "Portal",
    type: item.type || "Recently viewed",
    image: item.image || (item as RecentItem & { images?: { src?: string }[] }).images?.[0]?.src,
    meta: item.meta || "Viewed from homepage",
  }));
  return uniqueItems([...jobs, ...portals]);
}

function getPostedItems() {
  return [
    { id: "posted-jobs", title: "Available logistics jobs", href: "/jobs", category: "Jobs", type: "Recently posted", image: "/images/jobs/job-card-1.jpg", meta: "New opportunities are added as they are published", savedAt: Date.now() },
    { id: "posted-contracts", title: "Available contracts", href: "/contracts", category: "Contracts", type: "Recently posted", image: "/images/contracts-1.jpg", meta: "Browse current contract opportunities", savedAt: Date.now() - 1 },
  ];
}

function uniqueItems(items: RecentItem[]) {
  const unique = new Map<string, RecentItem>();
  items.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0)).forEach((item) => {
    const key = `${item.href}-${item.id || item.title}`;
    if (!unique.has(key)) unique.set(key, item);
  });
  return Array.from(unique.values()).slice(0, 12);
}

export default function RecentActivityPanel({ darkMode }: { darkMode: boolean }) {
  const [tab, setTab] = useState<ActivityTab>("viewed");
  const [viewed, setViewed] = useState<RecentItem[]>([]);
  const [liked, setLiked] = useState<RecentItem[]>([]);

  useEffect(() => {
    const refresh = () => {
      setViewed(getViewedItems());
      setLiked(uniqueItems(parseItems("loadlink-liked-listings")));
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("loadlink-recent-activity-updated", refresh);
    window.addEventListener("loadlink-liked-listings-updated", refresh);
    window.addEventListener("loadlink-account-state-synced", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("loadlink-recent-activity-updated", refresh);
      window.removeEventListener("loadlink-liked-listings-updated", refresh);
      window.removeEventListener("loadlink-account-state-synced", refresh);
    };
  }, []);

  const items = useMemo(() => tab === "posted" ? getPostedItems() : tab === "viewed" ? viewed : liked, [tab, viewed, liked]);
  const emptyCopy = tab === "liked" ? "You have not saved any listings yet. Use the Save button on a listing to keep it here." : "Nothing has been viewed yet. Open a job, contract or truck listing and it will appear here.";

  return (
    <section className={`${darkMode ? "bg-black text-white" : "bg-white text-black"} px-5 py-12`}>
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-black uppercase tracking-[0.26em] text-[#b88900]">Recent activity</p>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] md:text-5xl">Continue where you left off</h2>

        <div className="mt-6 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 no-scrollbar">
          {([['posted','Recently Posted'],['viewed','Recently Viewed'],['liked','Liked']] as [ActivityTab,string][]).map(([value,label]) => (
            <button key={value} onClick={() => setTab(value)} className={`shrink-0 snap-start border px-5 py-3 text-xs font-black uppercase tracking-wide ${tab === value ? "border-[#f6b800] bg-[#f6b800] text-black" : darkMode ? "border-white/15 bg-white/5 text-white/65" : "border-black/10 bg-black/[0.03] text-black/65"}`}>{label}</button>
          ))}
        </div>

        {items.length ? (
          <div className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 no-scrollbar">
            {items.map((item) => (
              <Link key={`${item.href}-${item.id}`} href={item.href} className={`min-w-[78%] snap-center overflow-hidden border md:min-w-[300px] ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
                <div className="aspect-[4/3] overflow-hidden bg-black/10">{item.image ? <img src={item.image} alt={item.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center bg-[#f6b800] text-2xl font-black text-black">LL</div>}</div>
                <div className="p-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b88900]">{item.category}</p><h3 className="mt-2 text-lg font-black">{item.title}</h3><p className={`mt-2 text-xs font-bold ${darkMode ? "text-white/50" : "text-black/50"}`}>{item.meta || item.type}</p></div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={`mt-6 border p-8 text-center ${darkMode ? "border-white/10 bg-[#090909] text-white/55" : "border-black/10 bg-[#fafafa] text-black/55"}`}><p className="text-lg font-black">Nothing here yet</p><p className="mx-auto mt-2 max-w-md text-sm leading-6">{emptyCopy}</p>{tab === "liked" ? <Link href="/jobs" className="mt-5 inline-flex border border-[#f6b800] px-5 py-3 text-xs font-black uppercase tracking-wide text-[#b88900]">Browse listings</Link> : null}</div>
        )}
      </div>
    </section>
  );
}
