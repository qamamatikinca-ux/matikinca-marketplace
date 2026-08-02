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

type NotificationFilter = "all" | "unread";

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
  const [filter, setFilter] = useState<NotificationFilter>("all");

  const unread = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications]);
  const visibleNotifications = useMemo(
    () => (filter === "unread" ? notifications.filter((item) => !item.is_read) : notifications),
    [filter, notifications],
  );

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
  const muted = darkMode ? "text-white/60" : "text-black/55";

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

      <section className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-12">
        <div className={`overflow-hidden rounded-[28px] border ${surface}`}>
          <div className={`border-b px-5 py-7 md:px-8 md:py-9 ${darkMode ? "border-white/10 bg-[#111111]" : "border-black/10 bg-[#fff7e2]"}`}>
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-black tracking-[-.055em] md:text-6xl">Notifications</h1>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[.1em] ${darkMode ? "border-white/15 bg-white/[.05] text-white/70" : "border-black/10 bg-white text-black/60"}`}>
                    {unread} unread
                  </span>
                </div>
                <p className={`mt-3 max-w-2xl text-sm font-semibold leading-6 ${muted}`}>
                  Messages, listing decisions, verification updates and account activity are kept together here.
                </p>
              </div>

              {unread > 0 ? (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="min-h-11 rounded-full border border-[#f6b800] px-5 text-xs font-black uppercase tracking-[.1em] text-[#b88900] transition active:scale-[.99]"
                >
                  Mark all as read
                </button>
              ) : null}
            </div>
          </div>

          <div className={`flex items-center gap-2 border-b px-5 py-4 md:px-8 ${darkMode ? "border-white/10" : "border-black/10"}`}>
            {([[
              "all",
              "All",
            ], [
              "unread",
              `Unread ${unread}`,
            ]] as [NotificationFilter, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[.08em] transition ${
                  filter === value
                    ? "bg-[#f6b800] text-black"
                    : darkMode
                      ? "border border-white/10 bg-white/[.04] text-white/65"
                      : "border border-black/10 bg-black/[.03] text-black/60"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {notice ? <p role="alert" className={`m-5 rounded-2xl border p-4 text-sm font-bold md:m-8 ${surface}`}>{notice}</p> : null}

          <div className="p-4 md:p-6">
            {authLoading || loading ? (
              <div className="grid gap-3" aria-label="Loading notifications">
                {[0, 1, 2].map((item) => (
                  <div key={item} className={`h-28 animate-pulse rounded-2xl border ${darkMode ? "border-white/10 bg-white/[.04]" : "border-black/10 bg-black/[.03]"}`} />
                ))}
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className={`rounded-2xl border px-6 py-14 text-center ${darkMode ? "border-white/10 bg-[#111111]" : "border-black/10 bg-[#fffaf0]"}`}>
                <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${darkMode ? "bg-white/[.06] text-[#f6b800]" : "bg-[#f6b800]/20 text-[#8a6500]"}`}>
                  <BellIcon />
                </span>
                <h2 className="mt-5 text-2xl font-black">{filter === "unread" ? "You are all caught up" : "No notifications yet"}</h2>
                <p className={`mx-auto mt-3 max-w-md text-sm leading-6 ${muted}`}>
                  {filter === "unread"
                    ? "There are no unread account updates at the moment."
                    : "New messages, listing decisions and verification updates will appear here."}
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {visibleNotifications.map((item) => {
                  const href = safeActionHref(item.action_url);
                  const content = (
                    <div className={`group flex gap-4 rounded-2xl border p-4 text-left transition md:p-5 ${
                      item.is_read
                        ? darkMode
                          ? "border-white/10 bg-[#0b0b0b] hover:bg-[#111111]"
                          : "border-black/10 bg-white hover:bg-[#fffaf0]"
                        : darkMode
                          ? "border-[#f6b800]/35 bg-[#17120a]"
                          : "border-[#f6b800]/50 bg-[#fff7df]"
                    }`}>
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${item.is_read ? darkMode ? "bg-white/[.06] text-white/65" : "bg-black/[.04] text-black/55" : "bg-[#f6b800] text-black"}`}>
                        <NotificationTypeIcon type={item.type} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h2 className="text-base font-black md:text-lg">{item.title}</h2>
                          <time className={`text-[10px] font-black uppercase tracking-[.09em] ${muted}`}>{formatDate(item.created_at)}</time>
                        </div>
                        <p className={`mt-2 text-sm leading-6 ${muted}`}>{item.message}</p>
                        <div className="mt-3 flex items-center gap-3">
                          {!item.is_read ? <span className="rounded-full bg-[#f6b800] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.1em] text-black">Unread</span> : null}
                          {href ? <span className="text-[10px] font-black uppercase tracking-[.1em] text-[#b88900]">Open update</span> : null}
                        </div>
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

function NotificationTypeIcon({ type }: { type: string }) {
  const value = type.toLowerCase();
  if (value.includes("message") || value.includes("chat")) return <MessageIcon />;
  if (value.includes("verify") || value.includes("approval") || value.includes("approved")) return <CheckIcon />;
  if (value.includes("listing") || value.includes("post")) return <DocumentIcon />;
  return <BellIcon />;
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 6 2.5 6.5 2.5 6.5H4s2.5-.5 2.5-6.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9.5 19a2.8 2.8 0 0 0 5 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MessageIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M8 9h8M8 12h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

function CheckIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="m8 12 2.5 2.5L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function DocumentIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M14 3v5h5M10 12h5M10 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}
