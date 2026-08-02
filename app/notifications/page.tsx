"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import HomeLogoLink from "@/components/HomeLogoLink";
import SiteMenu from "@/components/SiteMenu";
import AuthStatusButton from "@/components/AuthStatusButton";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
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

function safeActionHref(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "";
  return value;
}

export default function NotificationsPage() {
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [notifications, setNotifications] = useState<UserNotification[]>([]);

  const unread = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      setNotice("Notifications are unavailable until LoadLink is connected to Supabase.");
      return;
    }

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
      setAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authLoading || !isSupabaseConfigured) return;
    if (!isAuthenticatedUser(user)) {
      window.location.replace(`/login?next=${encodeURIComponent("/notifications")}`);
      return;
    }

    let active = true;

    async function load() {
      if (!user) return;
      setLoading(true);
      setNotice("");
      const result = await supabase
        .from("user_notifications")
        .select("id,type,title,message,action_url,is_read,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!active) return;
      if (result.error) {
        setNotice("Notifications could not be loaded. Please try again.");
        setNotifications([]);
      } else {
        setNotifications((result.data || []) as UserNotification[]);
      }
      setLoading(false);
    }

    void load();

    const channel = supabase
      .channel(`loadlink-notifications-page-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => void load(),
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [authLoading, user]);

  async function markRead(id: string) {
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
    await supabase
      .from("user_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id);
    window.dispatchEvent(new Event("loadlink-notifications-updated"));
  }

  async function markAllRead() {
    const ids = notifications.filter((item) => !item.is_read).map((item) => item.id);
    if (!ids.length) return;
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    await supabase
      .from("user_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", ids);
    window.dispatchEvent(new Event("loadlink-notifications-updated"));
  }

  const page = darkMode ? "bg-black text-white" : "bg-[#fffaf0] text-black";
  const surface = darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white";
  const muted = darkMode ? "text-white/55" : "text-black/55";

  return (
    <main className={`min-h-screen ${page}`}>
      <header className={`sticky top-0 z-50 border-b ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
        <div className="grid h-20 grid-cols-[92px_1fr_52px] items-center px-4">
          <div className="flex items-center gap-2">
            <SiteMenu darkMode={darkMode} />
            <AuthStatusButton darkMode={darkMode} />
          </div>
          <HomeLogoLink theme={darkMode ? "dark" : "light"} />
          <LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} className="ml-auto" />
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-10 md:px-8 md:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-[#b88900]">Account updates</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.05em] md:text-6xl">Notifications</h1>
            <p className={`mt-3 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>
              Listing reviews, messages, verification decisions and account updates appear here.
            </p>
          </div>
          {unread > 0 ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="h-11 border border-[#f6b800] px-5 text-xs font-black uppercase tracking-[.12em] text-[#b88900]"
            >
              Mark all as read
            </button>
          ) : null}
        </div>

        {notice ? <p role="alert" className={`mt-6 border p-4 text-sm font-bold ${surface}`}>{notice}</p> : null}

        <div className={`mt-7 overflow-hidden border ${surface}`}>
          {authLoading || loading ? (
            <div className={`p-8 text-sm font-semibold ${muted}`}>Loading notifications…</div>
          ) : notifications.length === 0 ? (
            <div className="p-10 text-center">
              <h2 className="text-2xl font-black">No notifications yet</h2>
              <p className={`mx-auto mt-3 max-w-md text-sm leading-6 ${muted}`}>
                New messages, listing decisions and account updates will appear here when they are available.
              </p>
            </div>
          ) : (
            <div className={`divide-y ${darkMode ? "divide-white/10" : "divide-black/10"}`}>
              {notifications.map((item) => {
                const href = safeActionHref(item.action_url);
                const content = (
                  <div className={`flex gap-4 p-5 text-left transition ${item.is_read ? "" : darkMode ? "bg-[#f6b800]/[.06]" : "bg-[#fff6dc]"}`}>
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.is_read ? darkMode ? "bg-white/20" : "bg-black/20" : "bg-[#f6b800]"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h2 className="text-base font-black">{item.title}</h2>
                        <time className={`text-[10px] font-black uppercase tracking-[.1em] ${muted}`}>{formatDate(item.created_at)}</time>
                      </div>
                      <p className={`mt-2 text-sm leading-6 ${muted}`}>{item.message}</p>
                      {!item.is_read ? <span className="mt-3 inline-block text-[10px] font-black uppercase tracking-[.12em] text-[#b88900]">Unread</span> : null}
                    </div>
                  </div>
                );

                return href ? (
                  <Link key={item.id} href={href} onClick={() => void markRead(item.id)}>
                    {content}
                  </Link>
                ) : (
                  <button key={item.id} type="button" onClick={() => void markRead(item.id)} className="block w-full">
                    {content}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
