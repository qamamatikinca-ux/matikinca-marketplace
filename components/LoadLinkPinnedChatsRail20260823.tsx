"use client";

import { useEffect, useMemo, useState } from "react";

const PIN_STORAGE_KEY = "loadlink-pinned-conversations-v1";

type PinnedChat = {
  id: string;
  href: string;
  name: string;
  preview: string;
  image: string;
};

function readPins() {
  try {
    const raw = JSON.parse(localStorage.getItem(PIN_STORAGE_KEY) || "[]");
    return new Set(Array.isArray(raw) ? raw.map(String) : []);
  } catch {
    return new Set<string>();
  }
}

function conversationId(href: string) {
  try {
    const url = new URL(href, window.location.origin);
    return url.searchParams.get("thread") || url.searchParams.get("conversation") || "";
  } catch {
    return "";
  }
}

function collectPinnedChats(): PinnedChat[] {
  const pins = readPins();
  if (!pins.size) return [];
  const seen = new Set<string>();
  const chats: PinnedChat[] = [];
  const panel = document.querySelector<HTMLElement>(".loadlink-inbox-panel");
  panel?.querySelectorAll<HTMLAnchorElement>('a[href*="thread="],a[href*="conversation="]').forEach((anchor) => {
    const id = conversationId(anchor.href);
    if (!id || !pins.has(id) || seen.has(id)) return;
    seen.add(id);
    const text = (anchor.innerText || "").split("\n").map((part) => part.trim()).filter(Boolean);
    const image = anchor.querySelector<HTMLImageElement>("img")?.src || "";
    chats.push({
      id,
      href: anchor.getAttribute("href") || `/messages?thread=${encodeURIComponent(id)}`,
      name: text[0] || anchor.getAttribute("aria-label") || "Pinned chat",
      preview: text.slice(1).find((part) => !/^\d{1,2}:\d{2}/.test(part)) || "Pinned conversation",
      image,
    });
  });
  return chats;
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "LL";
}

export default function LoadLinkPinnedChatsRail20260823({ darkMode }: { darkMode: boolean }) {
  const [pins, setPins] = useState<string[]>([]);
  const [chats, setChats] = useState<PinnedChat[]>([]);

  useEffect(() => {
    let frame = 0;
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const currentPins = Array.from(readPins());
        setPins(currentPins);
        setChats(collectPinnedChats());
      });
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener("loadlink:pins-changed", refresh as EventListener);
    window.addEventListener("storage", refresh);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("loadlink:pins-changed", refresh as EventListener);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const unresolved = useMemo(() => pins.filter((id) => !chats.some((chat) => chat.id === id)), [chats, pins]);

  return (
    <section data-loadlink-pinned-chat-rail="true" className="pb-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[.12em] opacity-45">Pinned chats</p>
        {pins.length ? <span className="text-[10px] font-black opacity-35">{pins.length}</span> : null}
      </div>
      {!pins.length ? (
        <p className="pb-1 text-[11px] font-semibold opacity-45">Pin a conversation to keep it here.</p>
      ) : (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {chats.map((chat) => (
            <a key={chat.id} href={chat.href} className={`flex min-w-[205px] max-w-[240px] items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${darkMode ? "border-white/10 bg-white/[.035] hover:bg-white/[.06]" : "border-black/10 bg-black/[.025] hover:bg-black/[.045]"}`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-black ${darkMode ? "bg-white/10" : "bg-black/[.07]"}`}>
                {chat.image ? <img src={chat.image} alt="" className="h-full w-full object-cover" /> : initials(chat.name)}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-xs font-black">{chat.name}</strong>
                <span className="mt-0.5 block truncate text-[10px] font-semibold opacity-45">{chat.preview}</span>
              </span>
              <svg className="h-3.5 w-3.5 shrink-0 opacity-35" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14.5 4.5 5 5-3 1.25-3.25 3.25.75 3-1.5 1.5-3.25-3.25L5 19.5l-.5-.5 3.75-4.25L5 11.5 6.5 10l3 .75 3.25-3.25 1.75-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
            </a>
          ))}
          {unresolved.map((id) => (
            <a key={id} href={`/messages?thread=${encodeURIComponent(id)}`} className={`flex min-w-[180px] items-center gap-3 rounded-2xl border px-3 py-2.5 ${darkMode ? "border-white/10 bg-white/[.035]" : "border-black/10 bg-black/[.025]"}`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${darkMode ? "bg-white/10" : "bg-black/[.07]"}`}>LL</span>
              <span className="min-w-0"><strong className="block truncate text-xs font-black">Pinned conversation</strong><span className="mt-0.5 block text-[10px] font-semibold opacity-45">Open chat</span></span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
