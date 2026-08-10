"use client";

import { useEffect, useRef, useState } from "react";
import { dealerFetch, relativeAge } from "@/lib/dealer/client";
import type { DealerMessageThread, DealerThreadMessage } from "@/lib/dealer/types";
import { EmptyState, Input, PrimaryButton, SectionHeading, SecondaryButton, Surface } from "./ui";

export default function DealerMessages({ darkMode }: { darkMode: boolean }) {
  const [items, setItems] = useState<DealerMessageThread[]>([]);
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState("inbox");
  const [selected, setSelected] = useState<DealerMessageThread | null>(null);
  const [messages, setMessages] = useState<DealerThreadMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ q: query, folder });
      const response = await dealerFetch<{ items: DealerMessageThread[] }>(`/api/dealer/messages?${params}`);
      setItems(response.items || []);
      if (selected && !(response.items || []).some((x) => x.id === selected.id)) { setSelected(null); setMessages([]); }
    } catch (e) { setError(e instanceof Error ? e.message : "Messages could not be loaded."); }
    finally { setLoading(false); }
  }
  async function openThread(item: DealerMessageThread) {
    setSelected(item); setThreadLoading(true); setError("");
    try { const response = await dealerFetch<{ items: DealerThreadMessage[] }>(`/api/dealer/messages?thread=${encodeURIComponent(item.id)}`); setMessages(response.items || []); requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: "end" })); }
    catch (e) { setError(e instanceof Error ? e.message : "Conversation could not be opened."); }
    finally { setThreadLoading(false); }
  }
  async function send() {
    if (!selected || !draft.trim() || sending) return;
    setSending(true); setError("");
    try {
      await dealerFetch("/api/dealer/messages", { method: "POST", body: JSON.stringify({ action: "send", thread_id: selected.id, body: draft.trim() }) });
      setDraft(""); await openThread(selected); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Message could not be sent."); }
    finally { setSending(false); }
  }
  useEffect(() => { const t = setTimeout(() => void load(), 250); return () => clearTimeout(t); }, [query, folder]);

  return <div className="grid gap-4">
    <Surface darkMode={darkMode} className="p-4 sm:p-5"><SectionHeading title="Messages" detail="Work dealership enquiries here or open the full LoadLink Messages experience. The customer sees the same conversation either way." action={<a href="/messages" className={`flex min-h-11 items-center rounded-xl border px-4 text-sm font-black ${darkMode ? "border-white/14" : "border-black/10"}`}>Open full Messages</a>} /><div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"><Input darkMode={darkMode} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customer or vehicle" /><div className="flex gap-2 overflow-x-auto">{["inbox", "potential", "archived"].map((value) => <SecondaryButton key={value} darkMode={darkMode} type="button" onClick={() => setFolder(value)} className={folder === value ? "border-[#f6b800]" : ""}>{value === "potential" ? "Potential Deals" : value[0].toUpperCase() + value.slice(1)}</SecondaryButton>)}</div></div>{error ? <div className="mt-3 text-sm font-bold text-red-500">{error}</div> : null}</Surface>
    <Surface darkMode={darkMode} className="overflow-hidden lg:grid lg:min-h-[560px] lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="border-current/10 lg:border-r"><div className="border-b border-current/10 px-4 py-3 text-[10px] font-black uppercase tracking-[.1em] opacity-40">Dealership conversations</div>{loading ? <div className="px-5 py-14 text-center text-sm font-bold opacity-45">Loading conversations…</div> : items.length ? <div className="max-h-[560px] divide-y divide-current/10 overflow-y-auto">{items.map((item) => <button key={item.id} type="button" onClick={() => void openThread(item)} className={`flex w-full items-center gap-3 px-4 py-4 text-left transition ${selected?.id === item.id ? "bg-current/[.055]" : "hover:bg-current/[.025]"}`}><div className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-full border ${darkMode ? "border-white/10 bg-white/[.04]" : "border-black/10 bg-[#f5f2eb]"}`}>{item.other_photo ? <img src={item.other_photo} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs font-black">{item.other_name.slice(0, 2).toUpperCase()}</div>}{item.unread_count ? <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-[#f6b800] ring-2 ring-current/10" /> : null}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><div className="truncate text-sm font-black">{item.other_name}</div>{item.lead_status ? <span className="rounded-full border border-current/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-[.08em]">{item.lead_status.replaceAll("_", " ")}</span> : null}</div><div className="mt-1 truncate text-xs opacity-55">{item.listing_title ? `${item.listing_title} · ` : ""}{item.preview || "Open conversation"}</div></div><div className="shrink-0 text-xs opacity-40">{relativeAge(item.updated_at)}</div></button>)}</div> : <EmptyState title="No dealership conversations" detail="Messages connected to dealership stock will appear here." />}</div>
      <div className="flex min-h-[460px] flex-col">{selected ? <><div className="border-b border-current/10 px-4 py-4 sm:px-5"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-black">{selected.other_name}</div><div className="mt-1 truncate text-xs opacity-50">{selected.listing_title || "Dealership enquiry"}</div></div><a href={`/messages?thread=${selected.id}`} className="text-xs font-black underline underline-offset-4">Full conversation</a></div></div><div className="flex-1 overflow-y-auto px-3 py-4 sm:px-5">{threadLoading ? <div className="py-16 text-center text-sm font-bold opacity-40">Opening conversation…</div> : <div className="grid gap-2">{messages.map((m) => <div key={m.id} className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-5 ${m.sender_role === "owner" ? `ml-auto ${darkMode ? "bg-white text-black" : "bg-black text-white"}` : darkMode ? "bg-white/[.08]" : "bg-black/[.055]"}`}><div>{m.body}</div>{m.file_name ? <div className="mt-2 border-t border-current/15 pt-2 text-xs font-bold opacity-65">{m.file_name}</div> : null}<div className="mt-1 text-[10px] opacity-45">{new Date(m.created_at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}</div></div>)}<div ref={endRef} /></div>}</div><div className="border-t border-current/10 p-3 sm:p-4"><div className="flex items-end gap-2"><textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} rows={2} maxLength={4000} placeholder="Message customer" className={`min-h-12 flex-1 resize-none rounded-xl border px-3 py-3 text-sm font-semibold outline-none focus:border-[#f6b800] ${darkMode ? "border-white/12 bg-[#151515]" : "border-black/10 bg-white"}`} /><PrimaryButton type="button" disabled={sending || !draft.trim()} onClick={() => void send()}>{sending ? "Sending…" : "Send"}</PrimaryButton></div><p className="mt-2 text-[10px] opacity-40">This reply is written into the existing LoadLink Messages thread.</p></div></> : <div className="flex flex-1 items-center justify-center px-5"><div className="max-w-sm text-center"><div className="text-base font-black">Choose a conversation</div><p className="mt-2 text-sm leading-6 opacity-50">Sales staff can respond here without using the dealership owner's private browser key.</p></div></div>}</div>
    </Surface>
  </div>;
}
