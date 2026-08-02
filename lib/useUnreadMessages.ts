"use client";

import { useCallback, useEffect, useState } from "react";
import { getBuyerKeys, getOwnerKeys } from "@/lib/chatKeys";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

export function useUnreadMessages(enabled: boolean) {
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !enabled) {
      setUnread(0);
      return;
    }

    const buyerKeys = getBuyerKeys();
    const ownerKeys = getOwnerKeys();
    let total = 0;

    for (let index = 0; index < buyerKeys.length; index += 1) {
      const result = await supabase.rpc("get_guest_chat_unread_total", {
        p_buyer_key: buyerKeys[index],
        p_owner_keys: index === 0 ? ownerKeys : [],
      });
      if (!result.error) {
        const count = Number(result.data || 0);
        if (Number.isFinite(count)) total += count;
      }
    }
    setUnread(total);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setUnread(0);
      return;
    }
    const first = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 60_000);
    const onRefresh = () => void refresh();
    window.addEventListener("focus", onRefresh);
    window.addEventListener("loadlink-chat-unread-updated", onRefresh);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("loadlink-chat-unread-updated", onRefresh);
    };
  }, [enabled, refresh]);

  return { unread, refresh };
}
