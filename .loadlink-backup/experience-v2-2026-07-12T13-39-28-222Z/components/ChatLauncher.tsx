"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

function createKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function getBuyerKey() {
  const existing = localStorage.getItem("loadlink-chat-key");
  if (existing) return existing;
  const key = createKey();
  localStorage.setItem("loadlink-chat-key", key);
  return key;
}

function getOwnerKeys() {
  const keys = new Set<string>();
  const deviceKey = localStorage.getItem("loadlink-device-key");
  if (deviceKey) keys.add(deviceKey);

  try {
    const stored = JSON.parse(localStorage.getItem("loadlink-owned-job-keys") || "{}") as Record<string, unknown>;
    Object.values(stored).forEach((value) => {
      if (typeof value === "string" && value.length >= 20) keys.add(value);
    });
  } catch {
    // Ignore damaged legacy local storage without hiding the chat button.
  }

  return Array.from(keys);
}

export default function ChatLauncher() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!isSupabaseConfigured) return;

    const result = await supabase.rpc("get_guest_chat_unread_total", {
      p_buyer_key: getBuyerKey(),
      p_owner_keys: getOwnerKeys(),
    });

    if (!result.error) {
      const next = Number(result.data || 0);
      setUnread(Number.isFinite(next) ? next : 0);
    }
  }, []);

  useEffect(() => {
    refreshUnread();
    const timer = setInterval(refreshUnread, 12_000);
    const onFocus = () => refreshUnread();
    const onStorage = () => refreshUnread();

    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    window.addEventListener("loadlink-chat-unread-updated", onFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("loadlink-chat-unread-updated", onFocus);
    };
  }, [refreshUnread]);

  if (pathname.startsWith("/messages")) return null;

  return (
    <Link
      href="/messages"
      aria-label={unread ? `Open messages, ${unread} unread` : "Open messages"}
      className="fixed bottom-[5.5rem] right-5 z-[69] flex h-14 w-14 items-center justify-center rounded-full border border-[#f6b800] bg-black text-[#f6b800] shadow-2xl transition active:scale-95"
    >
      <MessageBubbleIcon />
      {unread > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-[#f6b800] px-1 text-[10px] font-black text-black shadow-lg">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

function MessageBubbleIcon() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 3v-3.7A2 2 0 0 1 3 14.6V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M7 9h10M7 12h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
