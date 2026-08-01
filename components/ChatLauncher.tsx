"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { isAuthenticatedUser, loginHref } from "@/lib/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

export default function ChatLauncher() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [unread, setUnread] = useState(0);
  const signedIn = isAuthenticatedUser(user);

  const refresh = useCallback(async () => {
    if (!signedIn) return setUnread(0);
    const result = await supabase.rpc("get_unread_chat_count");
    if (!result.error) setUnread(Math.max(0, Number(result.data || 0)));
  }, [signedIn]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    void supabase.auth.getUser().then(({ data }) => { if (active) { setUser(data.user); setReady(true); } });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null); setReady(true); if (!session?.user) setUnread(0);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15_000);
    const listener = () => void refresh();
    window.addEventListener("focus", listener);
    window.addEventListener("loadlink-chat-unread-updated", listener);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", listener); window.removeEventListener("loadlink-chat-unread-updated", listener); };
  }, [refresh, signedIn]);

  if (!ready || pathname.startsWith("/messages") || pathname.startsWith("/login") || pathname.startsWith("/list-your-vehicle")) return null;
  return <Link href={signedIn ? "/messages" : loginHref("/messages")} aria-label={signedIn && unread ? `Open messages, ${unread} unread` : signedIn ? "Open messages" : "Sign in to message"} className="fixed bottom-[max(5.5rem,env(safe-area-inset-bottom))] right-5 z-[69] flex h-14 w-14 items-center justify-center rounded-full border border-[#f6b800] bg-black text-[#f6b800] shadow-2xl transition active:scale-95">
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 3v-3.7A2 2 0 0 1 3 14.6V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M7 9h10M7 12h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
    {signedIn && unread > 0 ? <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-[#f6b800] px-1 text-[10px] font-black text-black">{unread > 99 ? "99+" : unread}</span> : null}
  </Link>;
}
