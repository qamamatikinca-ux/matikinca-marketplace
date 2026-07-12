"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { isAuthenticatedUser, loginHref } from "@/lib/auth";
import { getBuyerKeys, getOwnerKeys } from "@/lib/chatKeys";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

export default function ChatLauncher() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [unread, setUnread] = useState(0);
  const signedIn = isAuthenticatedUser(user);

  const refreshUnread = useCallback(async () => {
    if (!isSupabaseConfigured || !signedIn) {
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
  }, [signedIn]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (!isAuthenticatedUser(session?.user)) setUnread(0);
      setAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!signedIn) return;

    const firstRefresh = window.setTimeout(refreshUnread, 0);
    const timer = setInterval(refreshUnread, 12_000);
    const onFocus = () => refreshUnread();

    window.addEventListener("focus", onFocus);
    window.addEventListener("loadlink-chat-unread-updated", onFocus);
    window.addEventListener("loadlink-account-state-synced", onFocus);

    return () => {
      window.clearTimeout(firstRefresh);
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("loadlink-chat-unread-updated", onFocus);
      window.removeEventListener("loadlink-account-state-synced", onFocus);
    };
  }, [refreshUnread, signedIn]);

  if (pathname.startsWith("/messages") || pathname.startsWith("/login") || pathname.startsWith("/list-your-truck") || authLoading) return null;

  const href = signedIn ? "/messages" : loginHref("/messages");

  return (
    <Link
      href={href}
      aria-label={
        signedIn
          ? unread
            ? `Open messages, ${unread} unread`
            : "Open messages"
          : "Sign in to open messages"
      }
      title={signedIn ? "Messages" : "Sign in to message"}
      className="fixed bottom-[5.5rem] right-5 z-[69] flex h-14 w-14 items-center justify-center rounded-full border border-[#f6b800] bg-black text-[#f6b800] shadow-2xl transition active:scale-95"
    >
      <MessageBubbleIcon />
      {signedIn && unread > 0 ? (
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
