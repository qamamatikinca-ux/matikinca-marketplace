"use client";

import { useEffect, useState } from "react";
import { dealerFetch } from "@/lib/dealer/client";
import { EmptyState, PrimaryButton, SectionHeading, Surface, Textarea } from "./ui";

type Review = { id: string; rating: number; reviewer_name?: string | null; body?: string | null; dealer_response?: string | null; status: string; created_at: string };
export default function DealerReviews({ darkMode }: { darkMode: boolean }) {
  const [items, setItems] = useState<Review[]>([]); const [reply, setReply] = useState<Record<string, string>>({});
  async function load() { try { const r = await dealerFetch<{ items: Review[] }>("/api/dealer/reviews"); setItems(r.items || []); } catch { setItems([]); } }
  useEffect(() => { void load(); }, []);
  async function respond(id: string) { const body = reply[id]?.trim(); if (!body) return; await dealerFetch("/api/dealer/reviews", { method: "POST", body: JSON.stringify({ action: "respond", review_id: id, body }) }); await load(); }
  return <Surface darkMode={darkMode} className="overflow-hidden"><div className="border-b border-current/10 px-4 py-4 sm:px-5"><SectionHeading title="Reviews" detail="Only review-eligible LoadLink interactions should create dealership reviews. Dealer responses remain public and moderated." /></div>{items.length ? <div className="divide-y divide-current/10">{items.map((item) => <div key={item.id} className="px-4 py-4 sm:px-5"><div className="flex items-center justify-between gap-4"><div className="text-sm font-black">{item.reviewer_name || "LoadLink customer"}</div><div className="text-sm font-black">{item.rating}/5</div></div>{item.body ? <p className="mt-2 text-sm leading-6 opacity-65">{item.body}</p> : null}{item.dealer_response ? <div className="mt-3 border-l-2 border-current/15 pl-3 text-sm"><b>Dealer response</b><p className="mt-1 opacity-60">{item.dealer_response}</p></div> : <div className="mt-3 flex gap-2"><Textarea darkMode={darkMode} className="min-h-20 flex-1" value={reply[item.id] || ""} onChange={(e) => setReply({ ...reply, [item.id]: e.target.value })} placeholder="Respond professionally" /><PrimaryButton type="button" onClick={() => respond(item.id)}>Respond</PrimaryButton></div>}</div>)}</div> : <EmptyState title="No verified reviews yet" detail="Reviews will appear after eligible customer interactions and moderation." />}</Surface>;
}
