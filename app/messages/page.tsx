"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import HomeLogoLink from "@/components/HomeLogoLink";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { currentRelativePath, isAuthenticatedUser, loginHref } from "@/lib/auth";
import { getBuyerKey, getBuyerKeys, getOwnerKeys } from "@/lib/chatKeys";
import { recordUserActivity, syncAccountState } from "@/lib/accountState";

type Role = "buyer" | "owner";

type ConversationRow = {
  id: string;
  listing_id: string;
  listing_title: string;
  other_name: string;
  other_phone: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number | string | null;
  other_last_seen: string | null;
  other_typing: boolean | null;
  average_reply_minutes: number | null;
  last_message_has_attachment: boolean | null;
  other_photo: string | null;
  messages_used_today: number | string | null;
  daily_message_limit: number | string | null;
  is_pro: boolean | null;
};

type Conversation = ConversationRow & {
  accessKey: string;
  role: Role;
  unreadCount: number;
};

type ChatMessage = {
  id: string;
  sender_role: Role;
  body: string;
  created_at: string;
  attachment_id: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
};

type AttachmentPayload = {
  file_name: string;
  file_type: string;
  file_size: number;
  file_base64: string;
};

const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function toCount(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatClock(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatConversationDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return formatClock(value);
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function activityText(conversation: Conversation) {
  if (conversation.other_typing) return "Typing…";
  if (!conversation.other_last_seen) return "Activity status unavailable";

  const difference =
    Date.now() - new Date(conversation.other_last_seen).getTime();
  if (difference < 90_000) return "Active now";
  if (difference < 3_600_000)
    return `Active ${Math.max(1, Math.round(difference / 60_000))} min ago`;
  if (difference < 86_400_000)
    return `Active ${Math.max(1, Math.round(difference / 3_600_000))} hr ago`;

  return `Last active ${new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(conversation.other_last_seen))}`;
}

function replyText(minutes: number | null) {
  if (!minutes || minutes < 1)
    return "Reply time will appear after a few responses";
  if (minutes <= 5) return "Usually replies within a few minutes";
  if (minutes < 60) return `Usually replies within about ${minutes} min`;
  if (minutes < 1440)
    return `Usually replies within about ${Math.max(1, Math.round(minutes / 60))} hr`;
  return `Usually replies within about ${Math.max(1, Math.round(minutes / 1440))} day${minutes >= 2880 ? "s" : ""}`;
}

function fileSizeLabel(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error("The selected file could not be read."));
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.readAsDataURL(file);
  });
}

function base64ToBlob(base64: string, mimeType: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType || "application/octet-stream" });
}

function cleanError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  if (/function|schema cache|does not exist/i.test(message)) {
    return "Messaging is finishing its setup. Refresh after the chat upgrade has been installed.";
  }
  if (/daily message limit|50 free messages|message limit/i.test(message)) {
    return "You have used today’s 50 free messages. Upgrade to Pro to keep messaging today.";
  }
  if (/fetch|network/i.test(message))
    return "Connection interrupted. Check your signal and try again.";
  return message || fallback;
}

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedIdRef = useRef("");
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === selectedId) ||
      null,
    [conversations, selectedId],
  );

  const messagesUsedToday = selectedConversation
    ? toCount(selectedConversation.messages_used_today)
    : 0;
  const dailyMessageLimit = selectedConversation
    ? Math.max(1, toCount(selectedConversation.daily_message_limit) || 50)
    : 50;
  const isPro = Boolean(selectedConversation?.is_pro);
  const dailyLimitReached = Boolean(
    selectedConversation && !isPro && messagesUsedToday >= dailyMessageLimit,
  );

  const visibleConversations = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return conversations;
    return conversations.filter((conversation) =>
      `${conversation.other_name} ${conversation.listing_title} ${conversation.last_message || ""}`
        .toLowerCase()
        .includes(search),
    );
  }, [conversations, query]);

  const loadConversations = useCallback(async (preferredId?: string) => {
    const buyerKeys = getBuyerKeys();
    const ownerKeys = getOwnerKeys();
    const buyerRows: Conversation[] = [];

    for (const buyerKey of buyerKeys) {
      const buyerResult = await supabase.rpc("get_buyer_guest_threads", {
        p_buyer_key: buyerKey,
      });
      if (buyerResult.error) throw buyerResult.error;

      buyerRows.push(
        ...((buyerResult.data || []) as ConversationRow[]).map((row) => ({
          ...row,
          accessKey: buyerKey,
          role: "buyer" as const,
          unreadCount: toCount(row.unread_count),
        })),
      );
    }

    const ownerRows: Conversation[] = [];
    for (const ownerKey of ownerKeys) {
      const ownerResult = await supabase.rpc("get_owner_guest_threads", {
        p_owner_key: ownerKey,
      });
      if (ownerResult.error) throw ownerResult.error;
      ownerRows.push(
        ...((ownerResult.data || []) as ConversationRow[]).map((row) => ({
          ...row,
          accessKey: ownerKey,
          role: "owner" as const,
          unreadCount: toCount(row.unread_count),
        })),
      );
    }

    const merged = new Map<string, Conversation>();
    [...buyerRows, ...ownerRows].forEach((row) => merged.set(row.id, row));
    const rows = Array.from(merged.values()).sort((first, second) => {
      return (
        new Date(second.last_message_at || 0).getTime() -
        new Date(first.last_message_at || 0).getTime()
      );
    });

    setConversations(rows);
    const nextId =
      preferredId ||
      selectedIdRef.current ||
      (window.innerWidth >= 768 ? rows[0]?.id || "" : "");
    if (nextId && rows.some((row) => row.id === nextId)) {
      selectedIdRef.current = nextId;
      setSelectedId(nextId);
    }

    window.dispatchEvent(new Event("loadlink-chat-unread-updated"));
  }, []);

  const loadMessages = useCallback(
    async (conversation: Conversation, showLoader = false) => {
      if (showLoader) setMessagesLoading(true);
      try {
        const result = await supabase.rpc("get_listing_guest_messages", {
          p_thread_id: conversation.id,
          p_access_key: conversation.accessKey,
        });
        if (result.error) throw result.error;
        setMessages((result.data || []) as ChatMessage[]);

        await supabase.rpc("mark_listing_guest_read", {
          p_thread_id: conversation.id,
          p_access_key: conversation.accessKey,
        });
        window.dispatchEvent(new Event("loadlink-chat-unread-updated"));
      } catch (loadError) {
        setError(cleanError(loadError, "Messages could not load."));
      } finally {
        if (showLoader) setMessagesLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError("Messaging is not connected on this deployment yet.");
      setLoading(false);
      return;
    }

    let active = true;
    let refreshTimer: ReturnType<typeof setInterval> | null = null;

    async function initialise() {
      try {
        setError("");
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!isAuthenticatedUser(user)) {
          router.replace(loginHref(currentRelativePath()));
          return;
        }

        await syncAccountState().catch(() => undefined);
        const params = new URLSearchParams(window.location.search);
        const listingId = params.get("listing");
        const metadata = user.user_metadata || {};
        const buyerName =
          params.get("name") ||
          String(metadata.full_name || metadata.name || user.email?.split("@")[0] || "Interested LoadLink user");
        const buyerPhoto = String(metadata.avatar_url || metadata.picture || "").trim() || null;
        let openedId = "";

        if (listingId) {
          let openResult = await supabase.rpc("open_listing_guest_chat_v2", {
            p_listing_id: listingId,
            p_buyer_key: getBuyerKey(),
            p_buyer_name: buyerName,
            p_buyer_photo: buyerPhoto,
          });
          if (
            openResult.error &&
            /function|schema cache|does not exist/i.test(
              openResult.error.message,
            )
          ) {
            openResult = await supabase.rpc("open_listing_guest_chat", {
              p_listing_id: listingId,
              p_buyer_key: getBuyerKey(),
              p_buyer_name: buyerName,
            });
          }
          if (openResult.error) throw openResult.error;
          openedId = String(openResult.data || "");
          await recordUserActivity("conversation_opened", {
            entityType: "listing",
            entityId: listingId,
            metadata: { threadId: openedId },
          }).catch(() => undefined);
          await syncAccountState().catch(() => undefined);
          window.history.replaceState(
            {},
            "",
            openedId ? `/messages?thread=${openedId}` : "/messages",
          );
        } else {
          openedId = params.get("thread") || "";
        }

        if (!active) return;
        await loadConversations(openedId);
        refreshTimer = setInterval(
          () => loadConversations().catch(() => undefined),
          5000,
        );
      } catch (initialiseError) {
        if (active)
          setError(cleanError(initialiseError, "Chat could not open."));
      } finally {
        if (active) setLoading(false);
      }
    }

    initialise();
    return () => {
      active = false;
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, [loadConversations, router]);

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    let active = true;
    setMessages([]);
    loadMessages(selectedConversation, true);
    const messageTimer = setInterval(() => {
      if (active) loadMessages(selectedConversation).catch(() => undefined);
    }, 2500);
    const presenceTimer = setInterval(() => {
      supabase
        .rpc("touch_listing_guest_presence", {
          p_thread_id: selectedConversation.id,
          p_access_key: selectedConversation.accessKey,
          p_is_typing: false,
        })
        .then(() => undefined);
    }, 25_000);

    return () => {
      active = false;
      clearInterval(messageTimer);
      clearInterval(presenceTimer);
      supabase
        .rpc("touch_listing_guest_presence", {
          p_thread_id: selectedConversation.id,
          p_access_key: selectedConversation.accessKey,
          p_is_typing: false,
        })
        .then(() => undefined);
    };
  }, [loadMessages, selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: messagesLoading ? "auto" : "smooth",
    });
  }, [messages, messagesLoading]);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    if (!selectedConversation || !text.trim() || sending || uploading) return;
    if (dailyLimitReached) {
      setError(
        "You have used today’s 50 free messages. Upgrade to Pro to keep messaging today.",
      );
      return;
    }

    setSending(true);
    setError("");
    try {
      const result = await supabase.rpc("send_listing_guest_message", {
        p_thread_id: selectedConversation.id,
        p_access_key: selectedConversation.accessKey,
        p_body: text.trim(),
      });
      if (result.error) throw result.error;
      setText("");
      await recordUserActivity("message_sent", {
        entityType: "conversation",
        entityId: selectedConversation.id,
        metadata: { listingId: selectedConversation.listing_id },
      }).catch(() => undefined);
      await loadMessages(selectedConversation);
      await loadConversations(selectedConversation.id);
    } catch (sendError) {
      setError(cleanError(sendError, "Message could not be sent."));
    } finally {
      setSending(false);
    }
  }

  function updateTyping(nextText: string) {
    setText(nextText);
    if (!selectedConversation) return;

    supabase
      .rpc("touch_listing_guest_presence", {
        p_thread_id: selectedConversation.id,
        p_access_key: selectedConversation.accessKey,
        p_is_typing: Boolean(nextText.trim()),
      })
      .then(() => undefined);

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      supabase
        .rpc("touch_listing_guest_presence", {
          p_thread_id: selectedConversation.id,
          p_access_key: selectedConversation.accessKey,
          p_is_typing: false,
        })
        .then(() => undefined);
    }, 5000);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  async function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedConversation || uploading || sending) return;
    if (dailyLimitReached) {
      setError(
        "You have used today’s 50 free messages. Upgrade to Pro to keep messaging today.",
      );
      return;
    }

    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setError("Use a photo, PDF, Word, Excel or text file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Files must be 5 MB or smaller.");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const base64 = await fileToBase64(file);
      const result = await supabase.rpc("send_listing_guest_attachment", {
        p_thread_id: selectedConversation.id,
        p_access_key: selectedConversation.accessKey,
        p_file_name: file.name,
        p_file_type: file.type,
        p_file_base64: base64,
        p_caption: text.trim() || null,
      });
      if (result.error) throw result.error;
      setText("");
      await recordUserActivity("attachment_sent", {
        entityType: "conversation",
        entityId: selectedConversation.id,
        metadata: { listingId: selectedConversation.listing_id, fileType: file.type },
      }).catch(() => undefined);
      await loadMessages(selectedConversation);
      await loadConversations(selectedConversation.id);
    } catch (uploadError) {
      setError(cleanError(uploadError, "The file could not be sent."));
    } finally {
      setUploading(false);
    }
  }

  async function downloadAttachment(message: ChatMessage) {
    if (!selectedConversation || !message.attachment_id) return;
    setError("");
    try {
      const result = await supabase.rpc("get_listing_guest_attachment", {
        p_attachment_id: message.attachment_id,
        p_access_key: selectedConversation.accessKey,
      });
      if (result.error) throw result.error;
      const payload = ((result.data || []) as AttachmentPayload[])[0];
      if (!payload) throw new Error("Attachment unavailable.");

      const blob = base64ToBlob(payload.file_base64, payload.file_type);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = payload.file_name || "LoadLink attachment";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(cleanError(downloadError, "Attachment could not be opened."));
    }
  }

  function chooseConversation(conversation: Conversation) {
    selectedIdRef.current = conversation.id;
    setSelectedId(conversation.id);
    setShowDetails(false);
    window.history.replaceState({}, "", `/messages?thread=${conversation.id}`);
  }

  function returnToInbox() {
    selectedIdRef.current = "";
    setSelectedId("");
    setMessages([]);
    setShowDetails(false);
    window.history.replaceState({}, "", "/messages");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-white/15 border-t-[#f6b800]" />
          <p className="mt-6 text-xs font-black uppercase tracking-[.22em] text-[#f6b800]">
            LoadLink messages
          </p>
          <h1 className="mt-3 text-3xl font-black">Opening your inbox</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="h-[100dvh] overflow-hidden bg-[#eeeae0] text-black">
      <header className="grid h-[72px] grid-cols-[56px_1fr_56px] items-center border-b border-black/10 bg-black px-3 text-white md:h-20 md:grid-cols-[120px_1fr_120px] md:px-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-black"
          aria-label="Back to LoadLink home"
        >
          <span className="text-2xl">←</span>
          <span className="hidden md:inline">Home</span>
        </Link>
        <HomeLogoLink theme="dark" />
        <button
          type="button"
          onClick={() =>
            loadConversations(selectedIdRef.current).catch((refreshError) =>
              setError(cleanError(refreshError, "Could not refresh.")),
            )
          }
          className="justify-self-end text-[11px] font-black uppercase tracking-wide text-[#f6b800]"
        >
          Refresh
        </button>
      </header>

      <div className="mx-auto grid h-[calc(100dvh-72px)] max-w-[1500px] md:h-[calc(100dvh-80px)] md:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)_300px]">
        <aside
          className={`${selectedId ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-black/10 bg-white`}
        >
          <div className="border-b border-black/10 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#b88900]">
                  LoadLink
                </p>
                <h1 className="mt-1 text-3xl font-black tracking-[-.04em]">
                  Messages
                </h1>
              </div>
              <span className="rounded-full bg-black px-3 py-1.5 text-xs font-black text-[#f6b800]">
                {conversations.reduce(
                  (total, conversation) => total + conversation.unreadCount,
                  0,
                )}{" "}
                unread
              </span>
            </div>
            <label className="mt-5 block">
              <span className="sr-only">Search conversations</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search messages or listings"
                className="h-12 w-full rounded-xl border border-black/10 bg-[#f5f3ed] px-4 text-sm font-semibold outline-none transition focus:border-[#f6b800] focus:bg-white"
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {visibleConversations.length ? (
              visibleConversations.map((conversation) => {
                const active = conversation.id === selectedId;
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => chooseConversation(conversation)}
                    className={`flex w-full gap-3 border-b border-black/5 p-4 text-left transition ${
                      active ? "bg-[#fff4c7]" : "bg-white hover:bg-[#f8f6f0]"
                    }`}
                  >
                    <Avatar
                      name={conversation.other_name}
                      photo={conversation.other_photo}
                      size="h-12 w-12"
                      online={Boolean(
                        conversation.other_last_seen &&
                          Date.now() -
                            new Date(conversation.other_last_seen).getTime() <
                            90_000,
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <strong className="truncate text-sm font-black">
                          {conversation.other_name}
                        </strong>
                        <span className="shrink-0 text-[10px] font-bold text-black/40">
                          {formatConversationDate(conversation.last_message_at)}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-xs font-bold text-[#8a6700]">
                        {conversation.listing_title}
                      </span>
                      <span className="mt-1 flex items-center justify-between gap-3">
                        <span
                          className={`truncate text-xs ${conversation.unreadCount ? "font-black text-black" : "font-medium text-black/50"}`}
                        >
                          {conversation.last_message_has_attachment
                            ? "Attachment · "
                            : ""}
                          {conversation.last_message ||
                            "Start the conversation"}
                        </span>
                        {conversation.unreadCount ? (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#f6b800] px-1 text-[10px] font-black text-black">
                            {conversation.unreadCount > 99
                              ? "99+"
                              : conversation.unreadCount}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-black text-[#f6b800]">
                  <MessageIcon />
                </div>
                <h2 className="mt-5 text-xl font-black">
                  No conversations yet
                </h2>
                <p className="mt-2 text-sm leading-6 text-black/55">
                  Open a listing and tap Message to start a private
                  conversation.
                </p>
                <Link
                  href="/jobs"
                  className="mt-5 inline-flex rounded-xl bg-[#f6b800] px-5 py-3 text-xs font-black uppercase tracking-wide text-black"
                >
                  Browse listings
                </Link>
              </div>
            )}
          </div>
        </aside>

        <section
          className={`${selectedId ? "flex" : "hidden md:flex"} min-h-0 flex-col bg-[#f3f0e8]`}
        >
          {selectedConversation ? (
            <>
              <header className="flex min-h-[78px] items-center gap-3 border-b border-black/10 bg-white px-3 py-3 md:px-5">
                <button
                  type="button"
                  onClick={returnToInbox}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 text-xl font-black md:hidden"
                  aria-label="Back to conversations"
                >
                  ←
                </button>
                <Avatar
                  name={selectedConversation.other_name}
                  photo={selectedConversation.other_photo}
                  size="h-11 w-11"
                  online={Boolean(
                    selectedConversation.other_last_seen &&
                      Date.now() -
                        new Date(
                          selectedConversation.other_last_seen,
                        ).getTime() <
                        90_000,
                  )}
                />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-black md:text-lg">
                    {selectedConversation.other_name}
                  </h2>
                  <p
                    className={`truncate text-xs font-bold ${selectedConversation.other_typing ? "text-[#168b42]" : "text-black/45"}`}
                  >
                    {activityText(selectedConversation)}
                  </p>
                  <p className="hidden truncate text-[11px] font-semibold text-[#8a6700] sm:block">
                    {replyText(selectedConversation.average_reply_minutes)}
                  </p>
                  <p
                    className={`mt-0.5 text-[10px] font-black ${dailyLimitReached ? "text-red-600" : "text-black/40"}`}
                  >
                    {isPro
                      ? "Pro messaging · no daily limit"
                      : `${messagesUsedToday}/${dailyMessageLimit} messages used today`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {selectedConversation.other_phone ? (
                    <a
                      href={`tel:${selectedConversation.other_phone.replace(/\s/g, "")}`}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-black md:w-auto md:px-4"
                      aria-label="Call contact"
                    >
                      <PhoneIcon />
                      <span className="ml-2 hidden text-xs font-black uppercase md:inline">
                        Call
                      </span>
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setShowDetails((value) => !value)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-lg font-black xl:hidden"
                    aria-label="Conversation details"
                  >
                    i
                  </button>
                </div>
              </header>

              <div className="border-b border-[#d7b33b]/35 bg-[#fff7dc] px-4 py-2.5 text-[11px] font-semibold leading-5 text-black/60">
                Messages and attachments are protected in transit and stored
                privately. Only people in this conversation can access them.
              </div>

              {showDetails ? (
                <div className="border-b border-black/10 bg-white p-4 xl:hidden">
                  <ConversationDetails conversation={selectedConversation} />
                </div>
              ) : null}

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-5 md:px-8">
                {messagesLoading && messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-9 w-9 animate-spin rounded-full border-2 border-black/10 border-t-[#f6b800]" />
                  </div>
                ) : messages.length ? (
                  <div className="mx-auto max-w-3xl space-y-3">
                    {messages.map((message, index) => {
                      const mine =
                        message.sender_role === selectedConversation.role;
                      const previous = messages[index - 1];
                      const showDay =
                        !previous ||
                        new Date(previous.created_at).toDateString() !==
                          new Date(message.created_at).toDateString();
                      return (
                        <div key={message.id}>
                          {showDay ? (
                            <div className="my-5 flex justify-center">
                              <span className="rounded-full border border-black/5 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-black/45">
                                {new Intl.DateTimeFormat("en-ZA", {
                                  weekday: "short",
                                  day: "2-digit",
                                  month: "short",
                                }).format(new Date(message.created_at))}
                              </span>
                            </div>
                          ) : null}
                          <div
                            className={`flex ${mine ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[86%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[72%] ${
                                mine
                                  ? "rounded-br-sm bg-black text-white"
                                  : "rounded-bl-sm border border-black/5 bg-white text-black"
                              }`}
                            >
                              {message.attachment_id ? (
                                <button
                                  type="button"
                                  onClick={() => downloadAttachment(message)}
                                  className={`mb-2 flex w-full items-center gap-3 rounded-xl border p-3 text-left ${mine ? "border-white/15 bg-white/10" : "border-black/10 bg-[#f7f4ed]"}`}
                                >
                                  <span
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${mine ? "bg-[#f6b800] text-black" : "bg-black text-[#f6b800]"}`}
                                  >
                                    <PaperclipIcon />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <strong className="block truncate text-xs font-black">
                                      {message.file_name || "Attachment"}
                                    </strong>
                                    <span
                                      className={`mt-0.5 block text-[10px] font-semibold ${mine ? "text-white/55" : "text-black/45"}`}
                                    >
                                      {fileSizeLabel(message.file_size)} · Tap
                                      to open
                                    </span>
                                  </span>
                                </button>
                              ) : null}
                              {message.body &&
                              (!message.attachment_id ||
                                message.body !== "Shared an attachment") ? (
                                <p className="whitespace-pre-wrap break-words text-sm font-medium leading-6">
                                  {message.body}
                                </p>
                              ) : null}
                              <div
                                className={`mt-1.5 flex items-center justify-end gap-1 text-[9px] font-bold ${mine ? "text-white/45" : "text-black/35"}`}
                              >
                                <span>{formatClock(message.created_at)}</span>
                                {mine ? <span aria-label="Sent">✓</span> : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {selectedConversation.other_typing ? (
                      <div className="flex justify-start">
                        <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-black/5 bg-white px-4 py-3 shadow-sm">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/40 [animation-delay:-.2s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/40 [animation-delay:-.1s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/40" />
                        </div>
                      </div>
                    ) : null}
                    <div ref={bottomRef} />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center px-5 text-center">
                    <div className="max-w-sm">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-black text-[#f6b800]">
                        <MessageIcon />
                      </div>
                      <h3 className="mt-5 text-2xl font-black">
                        Start the conversation
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-black/50">
                        Ask about availability, location, timing, price or the
                        requirements for this listing.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {error ? (
                <div className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              ) : null}

              <form
                onSubmit={send}
                className="border-t border-black/10 bg-white p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:p-4"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_FILE_TYPES.join(",")}
                  onChange={uploadFile}
                  className="hidden"
                />
                <div className="mx-auto flex max-w-3xl items-end gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending || uploading || dailyLimitReached}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-black/10 bg-[#f3f0e8] text-black disabled:opacity-40"
                    aria-label="Attach a file"
                  >
                    <PaperclipIcon />
                  </button>
                  <div className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-[#f6f4ee] px-4 py-2 focus-within:border-[#f6b800] focus-within:bg-white">
                    <textarea
                      value={text}
                      onChange={(event) => updateTyping(event.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      placeholder={
                        dailyLimitReached
                          ? "Daily free message limit reached"
                          : uploading
                            ? "Sending attachment…"
                            : "Type a message"
                      }
                      rows={1}
                      maxLength={4000}
                      disabled={sending || uploading || dailyLimitReached}
                      className="max-h-32 min-h-8 w-full resize-none bg-transparent py-1 text-sm font-medium outline-none placeholder:text-black/35 disabled:opacity-50"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={
                      !text.trim() || sending || uploading || dailyLimitReached
                    }
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f6b800] text-black shadow-sm transition active:scale-95 disabled:bg-black/10 disabled:text-black/25"
                    aria-label="Send message"
                  >
                    {sending ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                    ) : (
                      <SendIcon />
                    )}
                  </button>
                </div>
                <div className="mx-auto mt-2 flex max-w-3xl items-center justify-center gap-2 text-center text-[10px] font-semibold text-black/40">
                  <span>Photos and documents up to 5 MB</span>
                  <span aria-hidden="true">·</span>
                  {isPro ? (
                    <span className="font-black text-[#8a6700]">
                      Pro messaging active
                    </span>
                  ) : (
                    <>
                      <span
                        className={
                          dailyLimitReached
                            ? "font-black text-red-600"
                            : "font-black text-[#8a6700]"
                        }
                      >
                        {messagesUsedToday}/{dailyMessageLimit} today
                      </span>
                      <Link
                        href="/help?topic=pro-messaging"
                        className="font-black text-black underline decoration-[#f6b800] decoration-2 underline-offset-2"
                      >
                        Upgrade
                      </Link>
                    </>
                  )}
                </div>
              </form>
            </>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div className="max-w-md">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-black text-[#f6b800]">
                  <MessageIcon large />
                </div>
                <p className="mt-6 text-xs font-black uppercase tracking-[.22em] text-[#b88900]">
                  LoadLink chat
                </p>
                <h2 className="mt-2 text-4xl font-black tracking-[-.05em]">
                  Your logistics conversations in one place
                </h2>
                <p className="mt-4 text-sm font-medium leading-7 text-black/50">
                  Select a conversation to message a listing owner or respond to
                  someone interested in your post.
                </p>
              </div>
            </div>
          )}
        </section>

        <aside className="hidden min-h-0 overflow-y-auto border-l border-black/10 bg-white p-5 xl:block">
          {selectedConversation ? (
            <ConversationDetails conversation={selectedConversation} />
          ) : null}
        </aside>
      </div>
    </main>
  );
}

function Avatar({
  name,
  photo,
  size,
  online = false,
}: {
  name: string;
  photo?: string | null;
  size: string;
  online?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] || "")
      .join("")
      .toUpperCase() || "LL";

  return (
    <span
      className={`relative flex ${size} shrink-0 items-center justify-center overflow-visible rounded-full bg-black text-xs font-black text-[#f6b800]`}
    >
      {photo && !imageFailed ? (
        <img
          src={photo}
          alt={`${name} profile`}
          className="h-full w-full rounded-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
      {online ? (
        <span
          className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#25b85a]"
          aria-label="Active now"
        />
      ) : null}
    </span>
  );
}

function ConversationDetails({ conversation }: { conversation: Conversation }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#b88900]">
        Conversation details
      </p>
      <div className="mt-5 flex items-center gap-3">
        <Avatar
          name={conversation.other_name}
          photo={conversation.other_photo}
          size="h-12 w-12"
          online={Boolean(
            conversation.other_last_seen &&
              Date.now() - new Date(conversation.other_last_seen).getTime() <
                90_000,
          )}
        />
        <div className="min-w-0">
          <h3 className="truncate font-black">{conversation.other_name}</h3>
          <p className="mt-0.5 text-xs font-semibold text-black/45">
            {activityText(conversation)}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3 border-y border-black/10 py-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-black/35">
            Listing
          </p>
          <p className="mt-1 text-sm font-black leading-5">
            {conversation.listing_title}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-black/35">
            Response pattern
          </p>
          <p className="mt-1 text-sm font-semibold leading-5">
            {replyText(conversation.average_reply_minutes)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-black/35">
            Messaging plan
          </p>
          <p className="mt-1 text-sm font-semibold leading-5">
            {conversation.is_pro
              ? "Pro · unlimited daily messaging"
              : `${toCount(conversation.messages_used_today)}/${Math.max(1, toCount(conversation.daily_message_limit) || 50)} messages used today`}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        <Link
          href={`/jobs#job-${conversation.listing_id}`}
          className="flex items-center justify-center rounded-xl border border-black/10 px-4 py-3 text-xs font-black uppercase tracking-wide"
        >
          View listing
        </Link>
        {conversation.other_phone ? (
          <a
            href={`tel:${conversation.other_phone.replace(/\s/g, "")}`}
            className="flex items-center justify-center rounded-xl bg-black px-4 py-3 text-xs font-black uppercase tracking-wide text-[#f6b800]"
          >
            Call contact
          </a>
        ) : null}
      </div>

      <div className="mt-6 rounded-xl border border-[#e5c34c]/35 bg-[#fff8de] p-4">
        <p className="text-xs font-black">Stay safe</p>
        <p className="mt-2 text-xs font-medium leading-5 text-black/55">
          Confirm listing details before paying. Avoid sending passwords, PINs
          or one-time verification codes.
        </p>
      </div>
    </div>
  );
}

function MessageIcon({ large = false }: { large?: boolean }) {
  const size = large ? 34 : 24;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 3v-3.7A2 2 0 0 1 3 14.6V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M7 9h10M7 12h7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m20.5 11.5-7.8 7.8a5 5 0 0 1-7.1-7.1l8.5-8.5a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-2.8-2.8l7.8-7.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m4 4 17 8-17 8 3-8-3-8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M7 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7.2 3h3l1.5 4-2 1.5a15 15 0 0 0 5.8 5.8l1.5-2 4 1.5v3A3.2 3.2 0 0 1 17.8 20C10.2 20 4 13.8 4 6.2A3.2 3.2 0 0 1 7.2 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
