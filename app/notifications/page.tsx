"use client";

import LoadLinkSiteHeader from "@/components/LoadLinkSiteHeader";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState("");

  const unread = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications]);
  const visibleNotifications = useMemo(
    () => (filter === "unread" ? notifications.filter((item) => !item.is_read) : notifications),
    [filter, notifications],
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      setNotice("Notifications are temporarily unavailable. Please try again later.");
      return;
    }

    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

    async function load(clearNotice = true) {
      if (!user) return;
      setLoading(true);
      if (clearNotice) setNotice("");
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
      .on("postgres_changes", { event: "*", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` }, () => void load(false))
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [authLoading, user]);

  async function persistRead(id: string) {
    if (!user || markingId === id) return false;
    setMarkingId(id);
    setNotice("");
    try {
      const { error } = await supabase
        .from("user_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      setNotifications((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
      window.dispatchEvent(new Event("loadlink-notifications-updated"));
      return true;
    } catch {
      setNotice("LoadLink could not mark that notification as read. It has been left unread so its status stays accurate.");
      return false;
    } finally {
      setMarkingId("");
    }
  }

  async function openNotification(id: string, href: string) {
    const current = notifications.find((item) => item.id === id);
    if (current && !current.is_read) await persistRead(id);
    window.location.assign(href);
  }

  async function markAllRead() {
    if (!user || markingAll) return;
    const ids = notifications.filter((item) => !item.is_read).map((item) => item.id);
    if (!ids.length) return;
    setMarkingAll(true);
    setNotice("");
    try {
      const { error } = await supabase
        .from("user_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .in("id", ids);
      if (error) throw error;
      const idSet = new Set(ids);
      setNotifications((current) => current.map((item) => idSet.has(item.id) ? { ...item, is_read: true } : item));
      window.dispatchEvent(new Event("loadlink-notifications-updated"));
    } catch {
      setNotice("LoadLink could not mark all notifications as read. Their existing unread states were kept.");
    } finally {
      setMarkingAll(false);
    }
  }

  const page = darkMode ? "bg-black text-white" : "bg-[#f5f1e8] text-black";
  const panel = darkMode ? "border-white/10 bg-white/[.035]" : "border-black/8 bg-white/62";
  const muted = darkMode ? "text-white/52" : "text-black/52";

  return (
    <main className={`min-h-screen ${page}`} data-loadlink-notifications="compact-inbox-v2">
      <LoadLinkSiteHeader darkMode={darkMode} onToggleTheme={toggleTheme} />

      <section className="mx-auto max-w-4xl px-4 pb-16 pt-7 sm:px-6 sm:pt-10">
        <header className="flex flex-col gap-5 border-b border-current/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[36px] font-black leading-none tracking-[-.05em] sm:text-[44px]">Notifications</h1>
              {unread ? <span className="grid min-h-6 min-w-6 place-items-center rounded-full bg-[#f6b800] px-2 text-[10px] font-black text-black">{unread}</span> : null}
            </div>
            <p className={`mt-3 max-w-xl text-sm font-semibold leading-6 ${muted}`}>Messages, listing decisions, verification and account updates.</p>
          </div>

          {unread > 0 ? (
            <button type="button" onClick={() => void markAllRead()} disabled={markingAll} className={`min-h-10 w-fit rounded-xl border px-4 text-xs font-bold transition active:scale-[.99] disabled:opacity-45 ${darkMode ? "border-white/14 bg-white/[.035]" : "border-black/10 bg-white/50"}`}>
              {markingAll ? "Updating…" : "Mark all read"}
            </button>
          ) : null}
        </header>

        <div className="mt-5 flex items-center gap-2" role="tablist" aria-label="Notification filters">
          {([["all", "All"], ["unread", `Unread${unread ? ` ${unread}` : ""}`]] as [NotificationFilter, string][]).map(([value, label]) => (
            <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`min-h-9 rounded-xl px-4 text-xs font-black transition ${filter === value ? "bg-[#f6b800] text-black" : darkMode ? "border border-white/10 bg-white/[.025] text-white/60" : "border border-black/8 bg-white/45 text-black/55"}`}>{label}</button>
          ))}
        </div>

        {notice ? <p role="alert" className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${panel}`}>{notice}</p> : null}

        <section className={`mt-5 overflow-hidden rounded-[22px] border backdrop-blur-xl ${panel}`} aria-label="Notification activity">
          {authLoading || loading ? (
            <div className="divide-y divide-current/10" aria-label="Loading notifications">
              {[0, 1, 2, 3].map((item) => <div key={item} className="h-[92px] animate-pulse bg-current/[.025]" />)}
            </div>
          ) : visibleNotifications.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <span className={`mx-auto grid h-11 w-11 place-items-center rounded-full ${darkMode ? "bg-white/[.06] text-white/70" : "bg-black/[.045] text-black/55"}`}><BellIcon /></span>
              <h2 className="mt-4 text-xl font-black">{filter === "unread" ? "You’re caught up" : "No notifications yet"}</h2>
              <p className={`mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 ${muted}`}>{filter === "unread" ? "There are no unread updates right now." : "New account and marketplace updates will appear here."}</p>
            </div>
          ) : (
            <div className="divide-y divide-current/10">
              {visibleNotifications.map((item) => {
                const href = safeActionHref(item.action_url);
                const row = (
                  <div className={`group relative flex gap-3.5 px-4 py-4 text-left transition sm:px-5 ${item.is_read ? darkMode ? "hover:bg-white/[.025]" : "hover:bg-black/[.02]" : darkMode ? "bg-[#f6b800]/[.055]" : "bg-[#f6b800]/[.075]"}`}>
                    {!item.is_read ? <span className="absolute bottom-4 left-0 top-4 w-[3px] rounded-r-full bg-[#f6b800]" /> : null}
                    <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${item.is_read ? darkMode ? "border-white/10 bg-white/[.035] text-white/55" : "border-black/8 bg-black/[.025] text-black/50" : "border-[#f6b800]/45 bg-[#f6b800]/15 text-[#b88900]"}`}><NotificationTypeIcon type={item.type} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className={`min-w-0 text-[14px] font-black leading-5 sm:text-[15px] ${item.is_read ? "opacity-78" : ""}`}>{item.title}</h2>
                        <time className={`shrink-0 text-[10px] font-semibold ${muted}`}>{formatDate(item.created_at)}</time>
                      </div>
                      <p className={`mt-1.5 line-clamp-2 text-[13px] font-medium leading-5 ${muted}`}>{item.message}</p>
                      <div className="mt-2 flex items-center gap-2">
                        {!item.is_read ? <span className="text-[9px] font-black uppercase tracking-[.08em] text-[#b88900]">New</span> : null}
                        {href ? <span className="text-[10px] font-bold opacity-48">Open</span> : null}
                        {markingId === item.id ? <span className="text-[10px] font-semibold opacity-42">Updating…</span> : null}
                      </div>
                    </div>
                  </div>
                );

                return href ? (
                  <Link key={item.id} href={href} onClick={(event) => { event.preventDefault(); void openNotification(item.id, href); }}>{row}</Link>
                ) : (
                  <button key={item.id} type="button" disabled={markingId === item.id} onClick={() => void persistRead(item.id)} className="block w-full disabled:opacity-75">{row}</button>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const now = Date.now();
  const diff = Math.max(0, now - date.getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

function NotificationTypeIcon({ type }: { type: string }) {
  const value = type.toLowerCase();
  if (value.includes("message") || value.includes("chat")) return <MessageIcon />;
  if (value.includes("verify") || value.includes("approval") || value.includes("approved")) return <CheckIcon />;
  if (value.includes("listing") || value.includes("post")) return <DocumentIcon />;
  return <BellIcon />;
}

function BellIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 6 2.5 6.5 2.5 6.5H4s2.5-.5 2.5-6.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M9.5 19a2.8 2.8 0 0 0 5 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>; }
function MessageIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M8 9h8M8 12h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>; }
function CheckIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="m8 12 2.5 2.5L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function DocumentIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M14 3v5h5M10 12h5M10 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>; }
