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
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

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
      setHasLoadedOnce(true);
    }
    setLoading(false);
  }, [signedIn, user]);

  useEffect(() => {
    if (!isSupabaseConfigured) { setAuthLoading(false); return; }
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
    const firstLoad = window.setTimeout(() => void loadNotifications(), 0);
    const timer = window.setInterval(loadNotifications, 30_000);
    const onFocus = () => void loadNotifications();
    window.addEventListener("focus", onFocus);
    const channel = supabase.channel(`loadlink-user-notifications-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` }, () => void loadNotifications())
      .subscribe();
    return () => {
      window.clearTimeout(firstLoad);
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
  const muted = darkMode ? "text-white/54" : "text-black/52";

  return (
    <>
      {open ? (
        <section
          data-loadlink-notification-panel="major-20260823"
          className={`fixed bottom-[74px] left-3 z-[90] w-[calc(100vw-1.5rem)] max-w-[390px] overflow-hidden rounded-[24px] border ${darkMode ? "bg-[#0c0c0c]/94 text-white" : "bg-white/88 text-black"}`}
          aria-label="LoadLink notifications"
        >
          <header className={`flex items-center justify-between border-b px-4 py-3.5 ${border}`}>
            <div>
              <h2 className="text-[17px] font-black tracking-[-.025em]">Notifications</h2>
              <p className={`mt-0.5 text-[10px] font-semibold ${muted}`}>{unread ? `${unread} unread` : "You're up to date"}</p>
            </div>
            <div className="flex items-center gap-2">
              {unread ? <button type="button" onClick={() => void markAllRead()} className={`h-9 rounded-full border px-3 text-[10px] font-black ${border}`}>Mark read</button> : null}
              <button type="button" onClick={() => setOpen(false)} className={`flex h-9 w-9 items-center justify-center rounded-full border text-lg ${border}`} aria-label="Close notifications">×</button>
            </div>
          </header>

          <div className="max-h-[58dvh] overflow-y-auto p-2">
            {loading && notifications.length === 0 ? (
              <div className={`p-5 text-sm ${muted}`}>Loading updates…</div>
            ) : notifications.length ? notifications.map((item) => {
              const content = (
                <div className={`rounded-[17px] px-3.5 py-3 transition ${item.is_read ? "bg-transparent" : darkMode ? "bg-white/[.055]" : "bg-black/[.035]"}`}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${border} ${item.is_read ? "opacity-55" : "opacity-100"}`}><NotificationIcon type={item.type} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2"><p className="min-w-0 flex-1 text-[12px] font-black leading-5">{item.title}</p>{!item.is_read ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#f6b800]" /> : null}</div>
                      <p className={`mt-0.5 text-[11px] font-semibold leading-[1.55] ${muted}`}>{item.message}</p>
                      <p className={`mt-1.5 text-[9px] font-bold ${darkMode ? "text-white/32" : "text-black/34"}`}>{formatNotificationDate(item.created_at)}</p>
                    </div>
                  </div>
                </div>
              );
              return item.action_url ? (
                <Link key={item.id} href={item.action_url} onClick={() => { void markRead(item.id); setOpen(false); }} className="block">{content}</Link>
              ) : (
                <button key={item.id} type="button" onClick={() => void markRead(item.id)} className="block w-full text-left">{content}</button>
              );
            }) : (
              <div className="p-8 text-center"><p className="text-base font-black">No notifications yet</p><p className={`mt-2 text-xs leading-5 ${muted}`}>Messages, calls, listing reviews, payments and account decisions will appear here when they happen.</p></div>
            )}
          </div>
        </section>
      ) : null}

      {hasLoadedOnce && (open || unread > 0) ? (
        <button type="button" onClick={() => setOpen((value) => !value)} aria-label={unread ? `Open notifications, ${unread} unread` : "Open notifications"} className={`fixed bottom-5 left-4 z-[89] flex h-11 w-11 items-center justify-center rounded-full border shadow-[0_10px_30px_rgba(0,0,0,.16)] backdrop-blur-xl active:scale-95 ${darkMode ? "border-white/12 bg-[#111]/86 text-white" : "border-black/10 bg-white/82 text-black"}`}>
          <BellIcon />
          {unread > 0 ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f6b800] px-1 text-[9px] font-black text-black">{unread > 99 ? "99+" : unread}</span> : null}
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

function NotificationIcon({ type }: { type: string }) {
  const t = type.toLowerCase();
  if (/message|chat/.test(t)) return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 6h14v10H9l-4 3V6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (/call/.test(t)) return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 4 4.8 6.2c-.8.8 1.5 5.2 4.3 8s7.2 5.1 8 4.3l2.2-2.2-3.4-3-2.1 1.4c-1.5-.7-3.8-3-4.5-4.5l1.4-2.1L7 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>;
  if (/payment|plan|billing/.test(t)) return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M4 10h16" stroke="currentColor" strokeWidth="1.8"/></svg>;
  return <BellIcon />;
}

function BellIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 6 2.5 6.5 2.5 6.5H4s2.5-.5 2.5-6.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9.5 19a2.8 2.8 0 0 0 5 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}
