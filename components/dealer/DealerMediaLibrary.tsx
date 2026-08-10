"use client";

import { useEffect, useState } from "react";
import { dealerFetch } from "@/lib/dealer/client";
import { EmptyState, SectionHeading, Surface } from "./ui";

type MediaItem = { id: string; media_type: "image" | "video"; url: string; label?: string | null; created_at: string };

export default function DealerMediaLibrary({ darkMode }: { darkMode: boolean }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  useEffect(() => { void dealerFetch<{ items: MediaItem[] }>("/api/dealer/media").then((r) => setItems(r.items || [])).catch(() => setItems([])); }, []);
  return <Surface darkMode={darkMode} className="overflow-hidden"><div className="border-b border-current/10 px-4 py-4 sm:px-5"><SectionHeading title="Media library" detail="Reusable dealership media from Statuses, campaigns and showroom uploads." /></div>{items.length ? <div className="grid grid-cols-2 gap-px bg-current/10 sm:grid-cols-4">{items.slice(0, 16).map((item) => <div key={item.id} className={`aspect-square overflow-hidden ${darkMode ? "bg-[#111]" : "bg-white"}`}>{item.media_type === "video" ? <video src={item.url} muted playsInline className="h-full w-full object-cover" /> : <img src={item.url} alt={item.label || "Dealer media"} className="h-full w-full object-cover" />}</div>)}</div> : <EmptyState title="Media library is empty" detail="Status and campaign media will become reusable here." />}</Surface>;
}
