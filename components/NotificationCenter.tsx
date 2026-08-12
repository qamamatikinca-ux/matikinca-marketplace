"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { isAuthenticatedUser } from "@/lib/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";

type UserNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  action_url?: string | null;
  is_read: boolean;
  created_at: string;
};

export default function NotificationCenter() {
  const pathname = usePathname();
  const { darkMode } = useLoadLinkTheme();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [showLauncher, setShowLauncher] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const signedIn = isAuthenticatedUser(user);
  const unread = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications]);

  const loadNotifications = useCallback(async () => {
    if (!isSupabaseConfigured || !signedIn || !user) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    const result = await supabase
      .from("user_notifications")
      .select("id,type,title,message,action_url,is_read,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(40);

    if (!result.error) {
      setNotifications((result.data || []) as UserNotification[]);
      setHasLoadedOnce(true);
    }
    setLoading(false);
  }, [signedIn, user]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setAuthLoading(false);
      if (!isAuthenticatedUser(session?.user)) {
        setNotifications([]);
        setOpen(false);
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!signedIn || !user) return;
    const firstLoad = window.setTimeout(() => void loadNotifications(), 0);
    const timer = window.setInterval(loadNotifications, 30_000);
    const onFocus = () => void loadNotifications();
    window.addEventListener("focus", onFocus);
    const channel = supabase
      .channel(`loadlink-user-notifications-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` }, () => void loadNotifications())
      .subscribe();
    return () => {
      window.clearTimeout(firstLoad);
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [loadNotifications, signedIn, user]);

  useEffect(() => {
    if (!signedIn || !hasLoadedOnce) {
      setShowLauncher(false);
      return;
    }
    setShowLauncher(open || unread > 0);
  }, [hasLoadedOnce, open, signedIn, unread]);

  async function markRead(id: string) {
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
    await supabase.from("user_notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", id);
    window.dispatchEvent(new Event("loadlink-notifications-updated"));
  }

  async function markAllRead() {
    const ids = notifications.filter((item) => !item.is_read).map((item) => item.id);
    if (!ids.length) {
      setOpen(false);
      return;
    }
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    setOpen(false);
    setShowLauncher(false);
    await supabase.from("user_notifications").update({ is_read: true, read_at: new Date().toISOString() }).in("id", ids);
    window.dispatchEvent(new Event("loadlink-notifications-updated"));
  }

  if (authLoading || !signedIn || pathname.startsWith("/login") || pathname.startsWith("/auth") || pathname.startsWith("/messages")) return null;

  const muted = darkMode ? "text-white/62" : "text-black/58";
  const border = darkMode ? "border-white/10" : "border-black/10";

  return (
    <>
      {open ? (
        <section data-loadlink-notification-panel="true" className={`loadlink-glass fixed bottom-20 left-4 z-[90] w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-[24px] border ${darkMode ? "text-white" : "text-black"}`}>
          <div className={`flex items-center justify-between border-b px-4 py-4 ${border}`}>
            <h2 className="text-xl font-black">Notifications</h2>
            <button type="button" onClick={() => setOpen(false)} className={`flex h-9 w-9 items-center justify-center rounded-full border text-xl ${border}`} aria-label="Close notifications">×</button>
          </div>

          <div className="max-h-[55vh] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className={`p-5 text-sm ${muted}`}>Loading updates…</div>
            ) : notifications.length ? notifications.map((item) => {
              const content = (
                <div className={`border-b px-4 py-4 last:border-b-0 ${border} ${item.is_read ? "bg-transparent" : "bg-[#f6b800]/[.07]"}`}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.is_read ? darkMode ? "bg-white/20" : "bg-black/20" : "bg-[#f6b800]"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black">{item.title}</p>
                      <p className={`mt-1 text-xs leading-5 ${muted}`}>{item.message}</p>
                      <p className={`mt-2 text-[10px] font-bold uppercase tracking-[0.08em] ${darkMode ? "text-white/38" : "text-black/38"}`}>{formatNotificationDate(item.created_at)}</p>
                    </div>
                  </div>
                </div>
              );
              return item.action_url ? (
                <Link key={item.id} href={item.action_url} onClick={() => { void markRead(item.id); setOpen(false); }}>{content}</Link>
              ) : (
                <button key={item.id} type="button" onClick={() => void markRead(item.id)} className="block w-full text-left">{content}</button>
              );
            }) : (
              <div className="p-6 text-center">
                <p className="text-lg font-black">No notifications yet</p>
                <p className={`mt-2 text-xs leading-5 ${muted}`}>Post reviews, verification decisions and account updates will appear here.</p>
              </div>
            )}
          </div>

          {unread > 0 ? (
            <button type="button" onClick={() => void markAllRead()} className={`w-full border-t px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-[#b88900] ${border}`}>
              Mark all as read
            </button>
          ) : null}
        </section>
      ) : null}

      {showLauncher ? <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unread ? `Open notifications, ${unread} unread` : "Open notifications"}
        className="fixed bottom-5 left-4 z-[89] flex h-10 w-10 items-center justify-center rounded-full border border-[#f6b800]/70 bg-black/75 text-[#f6b800] shadow-[0_8px_24px_rgba(0,0,0,.22)] backdrop-blur-xl active:scale-95"
      >
        <BellIcon />
        {unread > 0 ? <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-[#f6b800] px-1 text-[10px] font-black text-black">{unread > 99 ? "99+" : unread}</span> : null}
      </button> : null}
    </>
  );
}

function formatNotificationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 6 2.5 6.5 2.5 6.5H4s2.5-.5 2.5-6.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9.5 19a2.8 2.8 0 0 0 5 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
