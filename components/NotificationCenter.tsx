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
  const [loaded, setLoaded] = useState(false);

  const signedIn = isAuthenticatedUser(user);
  const unread = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications]);

  const loadNotifications = useCallback(async () => {
    if (!isSupabaseConfigured || !signedIn || !user) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    const result = await supabase.from("user_notifications")
      .select("id,type,title,message,action_url,is_read,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(40);
    if (!result.error) {
      setNotifications((result.data || []) as UserNotification[]);
      setLoaded(true);
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
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!signedIn || !user) return;
    void loadNotifications();
    const timer = window.setInterval(loadNotifications, 30_000);
    const channel = supabase.channel(`loadlink-user-notifications-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` }, () => void loadNotifications())
      .subscribe();
    const onFocus = () => void loadNotifications();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [loadNotifications, signedIn, user]);

  async function markRead(id: string) {
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
    await supabase.from("user_notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", id);
    window.dispatchEvent(new Event("loadlink-notifications-updated"));
  }

  async function markAllRead() {
    const ids = notifications.filter((item) => !item.is_read).map((item) => item.id);
    if (!ids.length) return;
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    await supabase.from("user_notifications").update({ is_read: true, read_at: new Date().toISOString() }).in("id", ids);
    window.dispatchEvent(new Event("loadlink-notifications-updated"));
  }

  if (authLoading || !signedIn || pathname.startsWith("/login") || pathname.startsWith("/auth") || pathname.startsWith("/messages")) return null;

  const border = darkMode ? "border-white/10" : "border-black/[.08]";
  const muted = darkMode ? "text-white/52" : "text-black/50";

  return (
    <>
      {open ? (
        <>
          <button type="button" onClick={() => setOpen(false)} className="fixed inset-0 z-[88] bg-black/18 backdrop-blur-[2px]" aria-label="Close notifications" />
          <section
            data-loadlink-notification-panel="major-20260823"
            className={`fixed inset-x-3 top-[calc(84px+env(safe-area-inset-top))] z-[90] mx-auto max-h-[72dvh] max-w-[420px] overflow-hidden rounded-[28px] border shadow-[0_28px_90px_rgba(0,0,0,.24)] sm:left-auto sm:right-5 sm:mx-0 ${border}`}
            aria-label="Notifications"
          >
            <div className={`flex items-center justify-between border-b px-4 py-4 ${border}`}>
              <div>
                <h2 className="text-[18px] font-black tracking-[-.03em]">Notifications</h2>
                <p className={`mt-0.5 text-[10px] font-semibold ${muted}`}>{unread ? `${unread} unread` : "You’re up to date"}</p>
              </div>
              <div className="flex items-center gap-2">
                {unread ? <button type="button" onClick={() => void markAllRead()} className={`h-9 rounded-full border px-3 text-[10px] font-black ${border}`}>Mark read</button> : null}
                <button type="button" onClick={() => setOpen(false)} className={`flex h-9 w-9 items-center justify-center rounded-full border text-lg ${border}`} aria-label="Close notifications">×</button>
              </div>
            </div>

            <div className="max-h-[calc(72dvh-72px)] overflow-y-auto p-2">
              {loading && !loaded ? (
                <div className={`p-5 text-sm font-semibold ${muted}`}>Loading updates…</div>
              ) : notifications.length ? notifications.map((item) => {
                const card = (
                  <div className={`mb-1 rounded-[18px] border px-3.5 py-3.5 transition ${border} ${item.is_read ? darkMode ? "bg-white/[.025]" : "bg-black/[.018]" : darkMode ? "bg-white/[.055]" : "bg-[#f8f5ed]"}`}>
                    <div className="flex items-start gap-3">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.is_read ? darkMode ? "bg-white/18" : "bg-black/16" : "bg-[#f6b800]"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-black leading-5">{item.title}</p>
                        <p className={`mt-1 text-[11px] font-semibold leading-5 ${muted}`}>{item.message}</p>
                        <p className={`mt-2 text-[9px] font-bold ${darkMode ? "text-white/30" : "text-black/30"}`}>{formatNotificationDate(item.created_at)}</p>
                      </div>
                      {item.action_url ? <span className="mt-1 text-lg opacity-25">›</span> : null}
                    </div>
                  </div>
                );
                return item.action_url ? (
                  <Link key={item.id} href={item.action_url} onClick={() => { void markRead(item.id); setOpen(false); }}>{card}</Link>
                ) : (
                  <button key={item.id} type="button" onClick={() => void markRead(item.id)} className="block w-full text-left">{card}</button>
                );
              }) : (
                <div className="p-8 text-center">
                  <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full border ${border}`}><BellIcon /></div>
                  <p className="mt-4 text-base font-black">Nothing new</p>
                  <p className={`mx-auto mt-1 max-w-xs text-[11px] font-semibold leading-5 ${muted}`}>Messages, listing decisions, payments and account updates will appear here.</p>
                </div>
              )}
            </div>
          </section>
        </>
      ) : null}

      {loaded && unread > 0 ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={`Open notifications, ${unread} unread`}
          className={`fixed bottom-5 left-4 z-[89] flex h-11 w-11 items-center justify-center rounded-full border shadow-[0_10px_30px_rgba(0,0,0,.18)] backdrop-blur-xl active:scale-95 ${darkMode ? "border-white/12 bg-black/80 text-white" : "border-black/10 bg-white/88 text-black"}`}
        >
          <BellIcon />
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f6b800] px-1 text-[9px] font-black text-black">{unread > 99 ? "99+" : unread}</span>
        </button>
      ) : null}
    </>
  );
}

function formatNotificationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function BellIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 6 2.5 6.5 2.5 6.5H4s2.5-.5 2.5-6.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M9.5 19a2.8 2.8 0 0 0 5 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}
