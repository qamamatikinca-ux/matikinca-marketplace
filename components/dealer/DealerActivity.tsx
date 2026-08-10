"use client";

import { useEffect, useState } from "react";
import { dealerFetch } from "@/lib/dealer/client";
import type { DealerActivityEvent } from "@/lib/dealer/types";
import { EmptyState, SectionHeading, Surface } from "./ui";

export default function DealerActivity({ darkMode }: { darkMode: boolean }) {
  const [items, setItems] = useState<DealerActivityEvent[]>([]);
  useEffect(() => { void dealerFetch<{ items: DealerActivityEvent[] }>("/api/dealer/activity").then((r) => setItems(r.items || [])).catch(() => setItems([])); }, []);
  return <Surface darkMode={darkMode} className="overflow-hidden"><div className="border-b border-current/10 px-4 py-4 sm:px-5"><SectionHeading title="Activity" detail="A private record of important dealership changes across stock, leads, staff, showroom and marketing." /></div>{items.length ? <div className="divide-y divide-current/10">{items.map((item) => <div key={item.id} className="flex gap-3 px-4 py-4 sm:px-5"><div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-current opacity-30" /><div className="min-w-0 flex-1"><div className="text-sm"><b>{item.actor_name || "LoadLink"}</b> {item.action}</div>{item.entity_label ? <div className="mt-1 text-sm opacity-55">{item.entity_label}</div> : null}{item.details ? <div className="mt-1 text-xs opacity-45">{item.details}</div> : null}<div className="mt-1 text-xs opacity-35">{new Date(item.created_at).toLocaleString("en-ZA")}</div></div></div>)}</div> : <EmptyState title="No activity yet" detail="Actions will appear here as the dealership team starts working." />}</Surface>;
}
