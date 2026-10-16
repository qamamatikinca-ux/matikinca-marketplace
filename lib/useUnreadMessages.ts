"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getBuyerKeys, getOwnerKeys } from "@/lib/chatKeys";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

// The same thread RPCs and deduplication as the Messages inbox.
// Never invent a count or show a stale placeholder like 99+.
export function useUnreadMessages(enabled: boolean) {
  const [unread, setUnread] = useState(0);
  const sequence = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    if (!isSupabaseConfigured || !enabled) { setUnread(0); return; }
    try {
      const buyerKeys = [...new Set(getBuyerKeys().filter(Boolean))];
      const ownerKeys = [...new Set(getOwnerKeys().filter(Boolean))];
      const [buyers, owners] = await Promise.all([
        Promise.all(buyerKeys.map(async (key) => {
          const { data, error } = await supabase.rpc("get_buyer_guest_threads", { p_buyer_key: key });
          if (error) throw error;
          return (data || []) as Array<{ id: string; unread_count: number | string | null }>;
        })),
        Promise.all(ownerKeys.map(async (key) => {
          const { data, error } = await supabase.rpc("get_owner_guest_threads", { p_owner_key: key });
          if (error) throw error;
          return (data || []) as Array<{ id: string; unread_count: number | string | null }>;
        })),
      ]);
      const perConversation = new Map<string, number>();
      for (const row of [...buyers.flat(), ...owners.flat()]) {
        if (row.id) perConversation.set(row.id, Math.max(0, Math.floor(Number(row.unread_count) || 0)));
      }
      if (request === sequence.current) {
        setUnread([...perConversation.values()].reduce((sum, value) => sum + value, 0));
      }
    } catch {
      // An unsuccessful refresh must not fabricate a new unread count.
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) { sequence.current += 1; setUnread(0); return; }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 20_000);
    const onRefresh = () => void refresh();
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", onRefresh);
    window.addEventListener("pageshow", onRefresh);
    window.addEventListener("loadlink-chat-unread-updated", onRefresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      sequence.current += 1;
      window.clearInterval(timer);
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("pageshow", onRefresh);
      window.removeEventListener("loadlink-chat-unread-updated", onRefresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, refresh]);

  return { unread, refresh };
}
