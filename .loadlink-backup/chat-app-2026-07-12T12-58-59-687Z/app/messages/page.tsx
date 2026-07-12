"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import HomeLogoLink from "@/components/HomeLogoLink";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type Conversation = {
  id: string;
  listing_id: string;
  listing_title: string;
  other_name: string;
  other_phone: string | null;
  last_message: string | null;
  last_message_at: string | null;
  accessKey: string;
  role: "buyer" | "owner";
};

type ChatMessage = {
  id: string;
  sender_role: "buyer" | "owner";
  body: string;
  created_at: string;
};

function createKey() {
  const random = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `loadlink-${random}-${Math.random().toString(36).slice(2)}`;
}

function getBuyerKey() {
  const existing = localStorage.getItem("loadlink-chat-key");
  if (existing) return existing;
  const key = createKey();
  localStorage.setItem("loadlink-chat-key", key);
  return key;
}

function getOwnerKeys() {
  const keys = new Set<string>();
  const deviceKey = localStorage.getItem("loadlink-device-key");
  if (deviceKey) keys.add(deviceKey);

  try {
    const stored = JSON.parse(localStorage.getItem("loadlink-owned-job-keys") || "{}");
    Object.values(stored).forEach((value) => {
      if (typeof value === "string" && value.length > 10) keys.add(value);
    });
  } catch {
    // Ignore malformed old local storage data.
  }

  return Array.from(keys);
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selected) || null,
    [conversations, selected],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError("Messaging is not connected to the LoadLink database on this deployment.");
      setLoading(false);
      return;
    }

    let active = true;
    let refreshTimer: ReturnType<typeof setInterval> | null = null;

    async function loadConversations(preferredId?: string) {
      const buyerKey = getBuyerKey();
      const ownerKeys = getOwnerKeys();

      const buyerResult = await supabase.rpc("get_buyer_guest_threads", {
        p_buyer_key: buyerKey,
      });

      if (buyerResult.error) throw buyerResult.error;

      const buyerRows = ((buyerResult.data || []) as Omit<Conversation, "accessKey" | "role">[]).map((row) => ({
        ...row,
        accessKey: buyerKey,
        role: "buyer" as const,
      }));

      const ownerRows: Conversation[] = [];
      for (const ownerKey of ownerKeys) {
        const ownerResult = await supabase.rpc("get_owner_guest_threads", {
          p_owner_key: ownerKey,
        });
        if (ownerResult.error) throw ownerResult.error;
        ownerRows.push(...((ownerResult.data || []) as Omit<Conversation, "accessKey" | "role">[]).map((row) => ({
          ...row,
          accessKey: ownerKey,
          role: "owner" as const,
        })));
      }

      const merged = new Map<string, Conversation>();
      [...buyerRows, ...ownerRows].forEach((row) => merged.set(row.id, row));
      const rows = Array.from(merged.values()).sort((a, b) => {
        const aTime = new Date(a.last_message_at || 0).getTime();
        const bTime = new Date(b.last_message_at || 0).getTime();
        return bTime - aTime;
      });

      if (!active) return;
      setConversations(rows);
      const nextSelected = preferredId || selected || rows[0]?.id || "";
      if (nextSelected) setSelected(nextSelected);
    }

    async function initialise() {
      try {
        setError("");
        const params = new URLSearchParams(window.location.search);
        const listingId = params.get("listing");
        const buyerName = params.get("name") || "Interested LoadLink user";
        let openedId = "";

        if (listingId) {
          const buyerKey = getBuyerKey();
          const openResult = await supabase.rpc("open_listing_guest_chat", {
            p_listing_id: listingId,
            p_buyer_key: buyerKey,
            p_buyer_name: buyerName,
          });
          if (openResult.error) throw openResult.error;
          openedId = String(openResult.data || "");
        }

        await loadConversations(openedId);
        refreshTimer = setInterval(() => loadConversations().catch(() => undefined), 5000);
      } catch (err) {
        if (active) {
          const message = err instanceof Error ? err.message : "Chat could not open.";
          setError(message.includes("function") ? "Run the supplied NO-LOGIN-CHAT.sql file in Supabase once." : message);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    initialise();

    return () => {
      active = false;
      if (refreshTimer) clearInterval(refreshTimer);
    };
    // The selected conversation is deliberately not a dependency here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    let active = true;

    async function loadMessages() {
      const result = await supabase.rpc("get_listing_guest_messages", {
        p_thread_id: selectedConversation!.id,
        p_access_key: selectedConversation!.accessKey,
      });

      if (!active) return;
      if (result.error) {
        setError(result.error.message || "Messages could not load.");
        return;
      }
      setMessages((result.data || []) as ChatMessage[]);
    }

    loadMessages();
    const timer = setInterval(loadMessages, 2500);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selectedConversation]);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    if (!selectedConversation || !text.trim() || busy) return;

    setBusy(true);
    setError("");

    try {
      const result = await supabase.rpc("send_listing_guest_message", {
        p_thread_id: selectedConversation.id,
        p_access_key: selectedConversation.accessKey,
        p_body: text.trim(),
      });
      if (result.error) throw result.error;
      setText("");

      const refreshed = await supabase.rpc("get_listing_guest_messages", {
        p_thread_id: selectedConversation.id,
        p_access_key: selectedConversation.accessKey,
      });
      if (!refreshed.error) setMessages((refreshed.data || []) as ChatMessage[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[.22em] text-[#f6b800]">LoadLink messages</p>
          <h1 className="mt-3 text-3xl font-black">Opening guest chat</h1>
          <p className="mt-3 text-sm text-white/55">No account or login is required.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f4ef] text-black">
      <header className="sticky top-0 z-40 grid h-20 grid-cols-[60px_1fr_60px] items-center border-b border-black/10 bg-white px-4">
        <Link href="/" className="text-2xl font-black">←</Link>
        <HomeLogoLink theme="light" />
        <button onClick={() => location.reload()} className="text-xs font-black uppercase">Refresh</button>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-80px)] max-w-6xl md:grid-cols-[340px_1fr]">
        <aside className={`border-r border-black/10 bg-white ${selected ? "hidden md:block" : "block"}`}>
          <div className="border-b border-black/10 p-5">
            <h1 className="text-3xl font-black">Messages</h1>
            <p className="mt-2 text-sm text-black/50">Private listing chat with no registration or login screen.</p>
          </div>

          {error ? <p className="border-b border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p> : null}

          {conversations.length ? conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setSelected(conversation.id)}
              className={`flex w-full gap-3 border-b border-black/10 p-4 text-left ${selected === conversation.id ? "bg-[#fff2bf]" : "bg-white"}`}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black font-black text-[#f6b800]">
                {(conversation.other_name || "L").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-black">{conversation.other_name}</h2>
                <p className="truncate text-xs font-bold text-black/45">{conversation.listing_title}</p>
                <p className="mt-1 truncate text-sm text-black/55">{conversation.last_message || "Conversation started"}</p>
              </div>
            </button>
          )) : (
            <div className="p-7 text-center">
              <h2 className="text-xl font-black">No conversations yet</h2>
              <p className="mt-3 text-sm leading-6 text-black/55">Open one of your friend&apos;s listings and press Message. The chat will open here immediately.</p>
              <Link href="/jobs" className="mt-5 inline-flex border border-black px-4 py-3 text-xs font-black uppercase">Browse listings</Link>
            </div>
          )}
        </aside>

        <section className={`${!selected ? "hidden md:flex" : "flex"} min-h-[calc(100vh-80px)] flex-col bg-[#ecece7]`}>
          {selectedConversation ? (
            <>
              <header className="flex items-center justify-between gap-3 border-b border-black/10 bg-white p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <button onClick={() => setSelected("")} className="md:hidden">←</button>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black font-black text-[#f6b800]">
                    {(selectedConversation.other_name || "L").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate font-black">{selectedConversation.other_name}</h2>
                    <p className="truncate text-xs text-black/50">{selectedConversation.listing_title}</p>
                  </div>
                </div>
                {selectedConversation.other_phone ? (
                  <a href={`tel:${selectedConversation.other_phone.replace(/\s/g, "")}`} className="border border-black px-4 py-2 text-xs font-black uppercase">Call</a>
                ) : null}
              </header>

              <div className="border-b border-black/10 bg-[#fff7df] px-4 py-2 text-xs font-bold text-black/60">
                No login required. Messages are linked privately to this device and listing.
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((message) => {
                  const mine = message.sender_role === selectedConversation.role;
                  return (
                    <div key={message.id} className={`max-w-[82%] ${mine ? "ml-auto" : ""}`}>
                      <div className={`${mine ? "bg-[#f6b800] text-black" : "bg-white text-black"} rounded-2xl px-4 py-3 shadow-sm`}>
                        <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                        <p className="mt-1 text-right text-[9px] font-bold opacity-45">
                          {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {error ? <p className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}

              <form onSubmit={send} className="border-t border-black/10 bg-white p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Type a message"
                    rows={1}
                    className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-black/15 bg-[#f5f5f2] px-4 py-3 text-sm outline-none focus:border-[#b88900]"
                  />
                  <button disabled={busy || !text.trim()} className="h-11 rounded-full bg-black px-5 text-xs font-black uppercase text-[#f6b800] disabled:opacity-40">
                    {busy ? "Sending" : "Send"}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="m-auto max-w-md p-8 text-center">
              <h2 className="text-2xl font-black">Choose a conversation</h2>
              <p className="mt-3 text-black/50">Your listing conversations will appear here.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
