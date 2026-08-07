"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import HomeLogoLink from "@/components/HomeLogoLink";
import SiteMenu from "@/components/SiteMenu";
import LoadLinkThemeToggle from "@/components/LoadLinkThemeToggle";
import MessageVisualScene from "@/components/MessageVisualScene";
import LogisticsMessageTools from "@/components/LogisticsMessageTools";
import MessageVisualScene from "@/components/MessageVisualScene";
import LogisticsMessageTools from "@/components/LogisticsMessageTools";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { currentRelativePath, isAuthenticatedUser, loginHref } from "@/lib/auth";
import { getBuyerKey, getBuyerKeys, getOwnerKeys } from "@/lib/chatKeys";
import { recordUserActivity, syncAccountState } from "@/lib/accountState";
import { errorMessage, getFreshAuthenticatedUser } from "@/lib/reliableSupabase";
import { DEFAULT_MESSAGE_PRIVACY, profileRowToMessagePrivacy, readMessagePrivacy, type MessagePrivacyPreferences, writeMessagePrivacy } from "@/lib/messagePrivacy";
import { DEFAULT_MESSAGE_PRIVACY, profileRowToMessagePrivacy, readMessagePrivacy, type MessagePrivacyPreferences, writeMessagePrivacy } from "@/lib/messagePrivacy";
import styles from "./messages.module.css";

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
  archived?: boolean | null;
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

type BlockState = {
  blocked_by_me: boolean;
  blocked_by_other: boolean;
};

type WaveformBar = {
  height: number;
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
  "audio/mpeg",
  "audio/mp4",
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "audio/x-m4a",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const CHAT_WALLPAPER_COUNT = 10;
const CHAT_ARCHIVE_STORAGE_KEY = "loadlink-archived-conversations-v1";

function readLocalArchivedIds() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CHAT_ARCHIVE_STORAGE_KEY) || "[]");
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set<string>();
  }
}

function writeLocalArchivedIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAT_ARCHIVE_STORAGE_KEY, JSON.stringify(Array.from(ids)));
}

function defaultWaveformBars(count = 42): WaveformBar[] {
  return Array.from({ length: count }, (_, index) => ({
    height: 20 + ((index * 17 + index * index * 7) % 72),
  }));
}

async function audioWaveform(blob: Blob, count = 42): Promise<WaveformBar[]> {
  const AudioContextClass = window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return defaultWaveformBars(count);

  const context = new AudioContextClass();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    const samples = buffer.getChannelData(0);
    const segment = Math.max(1, Math.floor(samples.length / count));
    const values = Array.from({ length: count }, (_, index) => {
      const start = index * segment;
      const end = Math.min(samples.length, start + segment);
      let peak = 0;
      for (let sample = start; sample < end; sample += Math.max(1, Math.floor(segment / 80))) {
        peak = Math.max(peak, Math.abs(samples[sample] || 0));
      }
      return peak;
    });
    const max = Math.max(...values, 0.01);
    return values.map((value) => ({ height: 18 + Math.round((value / max) * 78) }));
  } catch {
    return defaultWaveformBars(count);
  } finally {
    void context.close().catch(() => undefined);
  }
}

function timeLabel(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

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

function activityText(conversation: Conversation, now = Date.now()) {
  if (conversation.other_typing) return "Typing…";
  if (!conversation.other_last_seen) return "Activity status unavailable";

  const timestamp = new Date(conversation.other_last_seen).getTime();
  if (!Number.isFinite(timestamp)) return "Activity status unavailable";
  const difference = Math.max(0, now - timestamp);
  if (difference < 60_000) return "Active in messages";
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

function isRecentlyActive(value: string | null, now = Date.now()) {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && Math.max(0, now - timestamp) < 60_000;
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

function recordingTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
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

function normaliseAttachmentType(file: File) {
  const supplied = file.type.toLowerCase().split(";")[0].trim();
  if (supplied === "image/jpg") return "image/jpeg";
  if (ACCEPTED_FILE_TYPES.includes(supplied)) return supplied;
  const name = file.name.toLowerCase();
  if (/\.jpe?g$/.test(name)) return "image/jpeg";
  if (/\.png$/.test(name)) return "image/png";
  if (/\.webp$/.test(name)) return "image/webp";
  if (/\.pdf$/.test(name)) return "application/pdf";
  if (/\.doc$/.test(name)) return "application/msword";
  if (/\.docx$/.test(name)) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (/\.xls$/.test(name)) return "application/vnd.ms-excel";
  if (/\.xlsx$/.test(name)) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (/\.txt$/.test(name)) return "text/plain";
  if (/\.m4a$/.test(name)) return "audio/mp4";
  if (/\.mp3$/.test(name)) return "audio/mpeg";
  if (/\.ogg$/.test(name)) return "audio/ogg";
  if (/\.wav$/.test(name)) return "audio/wav";
  if (/\.webm$/.test(name)) return supplied.startsWith("audio/") ? supplied : "audio/webm";
  return supplied;
}

function cleanError(error: unknown, fallback: string) {
  const message = errorMessage(error, fallback);
  if (/ACCOUNT_ACCESS_RESTRICTED|account access is restricted|blocked|suspended/i.test(message)) {
    return "This account is blocked or suspended and cannot send messages.";
  }
  if (/CURRENT_NDA_ACCEPTANCE_REQUIRED|NO_ACTIVE_AGREEMENT|platform access/i.test(message)) {
    return "An outdated access restriction is still active. Run the supplied LoadLink Supabase repair SQL once.";
  }
  if (/row level security|permission denied|violates row-level security/i.test(message)) {
    return "Messaging permissions need the supplied LoadLink Supabase repair SQL.";
  }
  if (/function|schema cache|does not exist/i.test(message)) {
    return "Messaging needs the supplied LoadLink Supabase repair SQL, then a refresh.";
  }
  if (/daily message limit|50 free messages|message limit/i.test(message)) {
    return "You have used today’s 50 free messages. Upgrade to Pro to keep messaging today.";
  }
  if (/jwt|session|unauthorized|401/i.test(message)) {
    return "Your sign-in session expired. Sign in again and your conversation will remain available.";
  }
  if (/fetch|network|timeout|connection/i.test(message))
    return "Connection interrupted. Check your signal and try again.";
  return message || fallback;
}

export default function MessagesPage() {
  const router = useRouter();
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [wallpaperIndex, setWallpaperIndex] = useState(1);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
    const requestId = ++conversationRequestRef.current;
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [blockState, setBlockState] = useState<BlockState>({ blocked_by_me: false, blocked_by_other: false });
  const [blockBusy, setBlockBusy] = useState(false);
  const [presenceNow, setPresenceNow] = useState(() => Date.now());

  const messageViewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const forceScrollRef = useRef(true);
  const messageSignatureRef = useRef("");
  const lastTypingPingRef = useRef(0);
  const typingActiveRef = useRef(false);
  const selectedIdRef = useRef("");
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const conversationLoadSequenceRef = useRef(0);
  const messageLoadSequenceRef = useRef(0);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingCancelledRef = useRef(false);
  const conversationRequestRef = useRef(0);
  const messageRequestRef = useRef(0);

  useEffect(() => {
    const syncPrivacy = () => setMessagePrivacy(readMessagePrivacy());
    syncPrivacy();
    window.addEventListener("storage", syncPrivacy);
    window.addEventListener("loadlink-message-privacy-updated", syncPrivacy as EventListener);
    return () => {
      window.removeEventListener("storage", syncPrivacy);
      window.removeEventListener("loadlink-message-privacy-updated", syncPrivacy as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!loading) return;
    const safety = window.setTimeout(() => {
      setLoading(false);
      setError((current) => current || "The inbox took too long to respond. Refresh to retry without being trapped on a black screen.");
    }, 8000);
    return () => window.clearTimeout(safety);
  }, [loading]);
    if (requestId !== conversationRequestRef.current) return;


  useEffect(() => {
    const timer = window.setInterval(() => setPresenceNow(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const key = "loadlink-chat-wallpaper-session-v1";
    const stored = Number(window.sessionStorage.getItem(key));
    const next = Number.isInteger(stored) && stored >= 1 && stored <= CHAT_WALLPAPER_COUNT
      ? stored
      : Math.floor(Math.random() * CHAT_WALLPAPER_COUNT) + 1;
    window.sessionStorage.setItem(key, String(next));
    setWallpaperIndex(next);
  }, []);
      const requestId = ++messageRequestRef.current;

  const selectedConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === selectedId) ||
      null,
    [conversations, selectedId],
  );

        if (requestId !== messageRequestRef.current) return;
  useEffect(() => {
    if (!selectedId) return;
    try {
      setText(window.localStorage.getItem(`loadlink-message-draft:${selectedId}`) || "");
    } catch {
      setText("");
    }
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    try {
      const key = `loadlink-message-draft:${selectedId}`;
      if (text.trim()) window.localStorage.setItem(key, text);
      else window.localStorage.removeItem(key);
    } catch {
      // Draft persistence must never block messaging.
    }
  }, [selectedId, text]);

  const messagesUsedToday = selectedConversation
    ? toCount(selectedConversation.messages_used_today)
    : 0;
    const requestId = ++conversationRequestRef.current;
  const dailyMessageLimit = selectedConversation
    ? Math.max(1, toCount(selectedConversation.daily_message_limit) || 50)
    : 50;
  const isPro = Boolean(selectedConversation?.is_pro);
  const dailyLimitReached = Boolean(
    selectedConversation && !isPro && messagesUsedToday >= dailyMessageLimit,
  );
  const conversationBlocked = blockState.blocked_by_me || blockState.blocked_by_other;

  const visibleConversations = useMemo(() => {
    const search = query.trim().toLowerCase();
    return conversations.filter((conversation) => {
      if (Boolean(conversation.archived) !== showArchived) return false;
      if (!search) return true;
      return `${conversation.other_name} ${conversation.listing_title} ${conversation.last_message || ""}`
        .toLowerCase()
        .includes(search);
    });
  }, [conversations, query, showArchived]);

  const archivedCount = useMemo(
    () => conversations.filter((conversation) => Boolean(conversation.archived)).length,
    [conversations],
  );

  const loadConversations = useCallback(async (preferredId?: string) => {
    const requestSequence = ++conversationLoadSequenceRef.current;
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
    if (requestId !== conversationRequestRef.current) return;

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
      const requestId = ++messageRequestRef.current;
      );
    }

    const locallyArchived = readLocalArchivedIds();
    const merged = new Map<string, Conversation>();
    [...buyerRows, ...ownerRows].forEach((row) => {
      const hasNewMessage = row.unreadCount > 0;
      if (hasNewMessage) locallyArchived.delete(row.id);
        if (requestId !== messageRequestRef.current) return;
      merged.set(row.id, {
        ...row,
        archived: hasNewMessage ? false : Boolean(row.archived) || locallyArchived.has(row.id),
      });
    });
    writeLocalArchivedIds(locallyArchived);
    const rows = Array.from(merged.values()).sort((first, second) => {
      return (
        new Date(second.last_message_at || 0).getTime() -
        new Date(first.last_message_at || 0).getTime()
      );
    });

    if (requestSequence !== conversationLoadSequenceRef.current) return;
    setPresenceNow(Date.now());
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
      const requestSequence = ++messageLoadSequenceRef.current;
      if (showLoader) setMessagesLoading(true);
      try {
        const result = await supabase.rpc("get_listing_guest_messages", {
          p_thread_id: conversation.id,
          p_access_key: conversation.accessKey,
        });
        if (result.error) throw result.error;
        const rows = (result.data || []) as ChatMessage[];
        if (requestSequence !== messageLoadSequenceRef.current) return;
        const signature = rows.map((row) => `${row.id}:${row.created_at}:${row.body}:${row.attachment_id || ""}`).join("|");
        const changed = signature !== messageSignatureRef.current;
        if (changed) {
          const viewport = messageViewportRef.current;
          const nearBottom = !viewport || viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 140;
          forceScrollRef.current = showLoader || nearBottom;
          messageSignatureRef.current = signature;
          setMessages(rows);
        }

        if (showLoader || changed) {
          await supabase.rpc("mark_listing_guest_read", {
            p_thread_id: conversation.id,
            p_access_key: conversation.accessKey,
          });
          window.dispatchEvent(new Event("loadlink-chat-unread-updated"));
        }
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
        const user = await getFreshAuthenticatedUser();

        if (!isAuthenticatedUser(user)) {
          router.replace(loginHref(currentRelativePath()));
          return;
        }

        const { data: privacyRow } = await supabase
          .from("profiles")
          .select("message_activity_visible,message_typing_indicators,message_requests_enabled,message_notification_previews")
          .eq("id", user.id)
          .maybeSingle();
        await Promise.allSettled(
          Array.from(new Set([getBuyerKey(), ...getOwnerKeys()])).map((accessKey) =>
            supabase.rpc("loadlink_register_chat_access_key", { p_access_key: accessKey }),
          ),
        );
        if (privacyRow) {
          const nextPrivacy = profileRowToMessagePrivacy(privacyRow as Record<string, unknown>);
          writeMessagePrivacy(nextPrivacy);
          setMessagePrivacy(nextPrivacy);
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
          10000,
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
    messageSignatureRef.current = "";
    forceScrollRef.current = true;
    setBlockState({ blocked_by_me: false, blocked_by_other: false });
    loadMessages(selectedConversation, true);
    supabase.rpc("get_listing_guest_block_status", {
      p_thread_id: selectedConversation.id,
      p_access_key: selectedConversation.accessKey,
    }).then(({ data, error: blockError }) => {
      if (!active || blockError) return;
      const status = ((data || []) as BlockState[])[0];
      if (status) setBlockState(status);
    });
    const messageTimer = setInterval(() => {
      if (active) loadMessages(selectedConversation).catch(() => undefined);
    }, 2500);
    const touchPresence = () => {
      if (document.visibilityState === "hidden") return;
      supabase.rpc("touch_listing_guest_presence", {
        p_thread_id: selectedConversation.id,
        p_access_key: selectedConversation.accessKey,
        p_is_typing: typingActiveRef.current,
      }).then(() => undefined);
    };
    touchPresence();
    const presenceTimer = setInterval(touchPresence, 10_000);
    const handleVisibility = () => { if (document.visibilityState === "visible") touchPresence(); };
    window.addEventListener("focus", touchPresence);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      clearInterval(messageTimer);
      clearInterval(presenceTimer);
      window.removeEventListener("focus", touchPresence);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (mediaRecorderRef.current?.state === "recording") stopRecording(true);
      supabase
        .rpc("touch_listing_guest_presence", {
          p_thread_id: selectedConversation.id,
          p_access_key: selectedConversation.accessKey,
          p_is_typing: false,
        })
        .then(() => undefined);
    };
  }, [loadMessages, messagePrivacy.activityVisible, messagePrivacy.typingIndicators, selectedId]);

  useEffect(() => {
    if (!forceScrollRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      const viewport = messageViewportRef.current;
      if (!viewport) return;
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: messagesLoading ? "auto" : "smooth" });
      forceScrollRef.current = false;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, messagesLoading, selectedId]);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    if (!selectedConversation || !text.trim() || sending || uploading) return;
    if (conversationBlocked) {
      setError(blockState.blocked_by_me ? "Unblock this user before sending a message." : "This user has blocked this conversation.");
      return;
    }
    if (dailyLimitReached) {
      setError(
        "You have used today’s 50 free messages. Upgrade to Pro to keep messaging today.",
      );
      return;
    }
    if (/\b(?:otp|one[- ]time pin|password|banking pin|card pin|cvv)\b/i.test(text) &&
        !window.confirm("LoadLink will never ask for your password, OTP, PIN or CVV. Send this message only if it does not expose private security information.")) {
      return;
    }

    setSending(true);
    setError("");
    try {
      const user = await getFreshAuthenticatedUser();
      if (!user) throw new Error("Your sign-in session expired.");
      const result = await supabase.rpc("send_listing_guest_message", {
        p_thread_id: selectedConversation.id,
        p_access_key: selectedConversation.accessKey,
        p_body: text.trim(),
      });
      if (result.error) throw result.error;
      forceScrollRef.current = true;
      typingActiveRef.current = false;
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
    typingActiveRef.current = messagePrivacy.typingIndicators && Boolean(nextText.trim());
    if (!selectedConversation) return;
    if (!messagePrivacy.typingIndicators) return;

    const now = Date.now();
    if (!nextText.trim() || now - lastTypingPingRef.current > 2500) {
      lastTypingPingRef.current = now;
      supabase.rpc("touch_listing_guest_presence", {
        p_thread_id: selectedConversation.id,
        p_access_key: selectedConversation.accessKey,
        p_is_typing: messagePrivacy.typingIndicators && Boolean(nextText.trim()),
      }).then(() => undefined);
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      typingActiveRef.current = false;
      supabase
        .rpc("touch_listing_guest_presence", {
          p_thread_id: selectedConversation.id,
          p_access_key: selectedConversation.accessKey,
          p_is_typing: false,
        })
        .then(() => undefined);
    }, 2200);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  async function sendAttachment(file: File, caption?: string) {
    if (!selectedConversation || uploading || sending) return;
    if (conversationBlocked) {
      setError(blockState.blocked_by_me ? "Unblock this user before sending an attachment." : "This user has blocked this conversation.");
      return;
    }
    if (dailyLimitReached) {
      setError("You have used today’s 50 free messages. Upgrade to Pro to keep messaging today.");
      return;
    }
    const fileType = normaliseAttachmentType(file);
    if (!ACCEPTED_FILE_TYPES.includes(fileType)) {
      setError("Use a JPG, PNG, WEBP, PDF, Office document, text file or supported voice note.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Files and voice notes must be 5 MB or smaller.");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const user = await getFreshAuthenticatedUser();
      if (!user) throw new Error("Your sign-in session expired.");
      const base64 = await fileToBase64(file);
      const result = await supabase.rpc("send_listing_guest_attachment", {
        p_thread_id: selectedConversation.id,
        p_access_key: selectedConversation.accessKey,
        p_file_name: file.name,
        p_file_type: fileType,
        p_file_base64: base64,
        p_caption: caption ?? (text.trim() || null),
      });
      if (result.error) throw result.error;
      forceScrollRef.current = true;
      typingActiveRef.current = false;
      setText("");
      await recordUserActivity(fileType.startsWith("audio/") ? "voice_note_sent" : "attachment_sent", {
        entityType: "conversation",
        entityId: selectedConversation.id,
        metadata: { listingId: selectedConversation.listing_id, fileType },
      }).catch(() => undefined);
      await loadMessages(selectedConversation);
      await loadConversations(selectedConversation.id);
    } catch (uploadError) {
      setError(cleanError(uploadError, fileType.startsWith("audio/") ? "The voice note could not be sent." : "The file could not be sent."));
    } finally {
      setUploading(false);
    }
  }

  async function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await sendAttachment(file);
  }

  async function startRecording() {
    if (!selectedConversation || recording || uploading || sending || conversationBlocked || dailyLimitReached) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice notes are not supported by this browser. You can attach an audio file instead.");
      return;
    }
    setError("");
          <Link href="/account/settings#message-privacy" className="hidden text-[10px] font-black uppercase tracking-[.1em] text-[#b88900] lg:block">Privacy</Link>
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: { ideal: 1 },
          sampleRate: { ideal: 48_000 },
        },
      });
      const preferredTypes = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"];
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";
      const options: MediaRecorderOptions = { audioBitsPerSecond: 128_000 };
      if (mimeType) options.mimeType = mimeType;
      const recorder = new MediaRecorder(stream, options);
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];
      recordingCancelledRef.current = false;
      setRecordingSeconds(0);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onerror = () => setError("The voice note recording stopped unexpectedly.");
      recorder.onstop = () => {
        const actualType = recorder.mimeType || mimeType || "audio/webm";
        const cancelled = recordingCancelledRef.current;
        const blob = new Blob(recordingChunksRef.current, { type: actualType });
        recordingChunksRef.current = [];
        recordingCancelledRef.current = false;
        recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
        setRecording(false);
        const extension = actualType.includes("mp4") ? "m4a" : actualType.includes("ogg") ? "ogg" : "webm";
        if (!cancelled && blob.size > 0) {
          const file = new File([blob], `LoadLink-voice-note-${Date.now()}.${extension}`, { type: actualType.split(";")[0] });
          void sendAttachment(file, "Voice note");
        }
      };
      recorder.start(500);
      setRecording(true);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((seconds) => {
          if (seconds >= 89) {
            mediaRecorderRef.current?.stop();
            return 90;
          }
          return seconds + 1;
        });
      }, 1000);
    } catch (recordError) {
      setError(recordError instanceof Error && /permission|denied|notallowed/i.test(recordError.message) ? "Microphone permission is required to record a voice note." : "The microphone could not be opened.");
    }
  }

  function stopRecording(cancel = false) {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    if (cancel) {
      recordingCancelledRef.current = true;
      recordingChunksRef.current = [];
    }
    recorder.stop();
    mediaRecorderRef.current = null;
    if (cancel) setError("Voice note cancelled.");
  }

  async function toggleArchive() {
    if (!selectedConversation || archiveBusy) return;
    const willArchive = !Boolean(selectedConversation.archived);
    setArchiveBusy(true);
    setError("");

    const archivedIds = readLocalArchivedIds();
    if (willArchive) archivedIds.add(selectedConversation.id);
    else archivedIds.delete(selectedConversation.id);
    writeLocalArchivedIds(archivedIds);
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === selectedConversation.id
          ? { ...conversation, archived: willArchive }
          : conversation,
      ),
    );

    try {
      const result = await supabase.rpc("set_listing_guest_archived", {
        p_thread_id: selectedConversation.id,
        p_access_key: selectedConversation.accessKey,
        p_archived: willArchive,
      });
      if (result.error && !/function|schema cache|does not exist/i.test(result.error.message)) {
        throw result.error;
      }
          <Link href="/account/settings#message-privacy" className="hidden text-[10px] font-black uppercase tracking-[.1em] text-[#b88900] lg:block">Privacy</Link>
      setError(willArchive ? "Conversation archived." : "Conversation restored to the inbox.");
      if (willArchive && !showArchived) returnToInbox();
      if (!willArchive && showArchived) returnToInbox();
    } catch (archiveError) {
      setError(cleanError(archiveError, "The archive setting could not be saved."));
    } finally {
      setArchiveBusy(false);
    }
  }

  async function toggleBlock() {
    if (!selectedConversation || blockBusy) return;
    const willBlock = !blockState.blocked_by_me;
    if (willBlock && recording) stopRecording(true);
    if (willBlock && !window.confirm(`Block ${selectedConversation.other_name}? Neither person will be able to send messages until you unblock them.`)) return;
    setBlockBusy(true);
    setError("");
    try {
      const functionName = willBlock ? "block_listing_guest_user" : "unblock_listing_guest_user";
      const result = await supabase.rpc(functionName, {
        p_thread_id: selectedConversation.id,
        p_access_key: selectedConversation.accessKey,
      });
      if (result.error) throw result.error;
      setBlockState((current) => ({ ...current, blocked_by_me: willBlock }));
      setError(willBlock ? `${selectedConversation.other_name} has been blocked.` : `${selectedConversation.other_name} has been unblocked.`);
    } catch (blockError) {
      const text = cleanError(blockError, "The block setting could not be changed.");
      const rawMessage = blockError && typeof blockError === "object" && "message" in blockError
        ? String((blockError as { message?: unknown }).message || "")
        : "";
      setError(/function|schema cache|does not exist/i.test(rawMessage) ? "Run LOADLINK-PHASE-2-FINAL.sql in Supabase to enable blocking." : text);
    } finally {
      setBlockBusy(false);
    }
  }

  async function reportConversation() {
    if (!selectedConversation || reportBusy) return;
    const reason = window.prompt("Briefly explain what is unsafe, misleading or inappropriate about this conversation.");
    if (!reason?.trim()) return;
    if (reason.trim().length < 5) {
      setError("Add a little more detail before submitting the report.");
      return;
    }
    setReportBusy(true);
    setError("");
    try {
      const result = await supabase.rpc("report_listing_guest_conversation", {
        p_thread_id: selectedConversation.id,
        p_access_key: selectedConversation.accessKey,
        p_reason: reason.trim(),
      });
      if (result.error) throw result.error;
      setError("Report submitted privately to LoadLink for review.");
    } catch (reportError) {
      setError(cleanError(reportError, "The conversation report could not be submitted."));
    } finally {
      setReportBusy(false);
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
    const loadingSurface = darkMode ? "border-white/10 bg-white/[.04]" : "border-black/10 bg-white";
    return (
      <main className={`min-h-[100dvh] overflow-hidden ${darkMode ? "bg-[#050505] text-white" : "bg-[#eeeae0] text-black"}`}>
        <header className={`grid h-[72px] grid-cols-[56px_1fr_56px] items-center border-b px-3 ${darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"}`}>
          <div className={`h-10 w-10 animate-pulse rounded-full ${darkMode ? "bg-white/10" : "bg-black/10"}`} />
          <HomeLogoLink theme={darkMode ? "dark" : "light"} />
          <div className={`ml-auto h-10 w-10 animate-pulse rounded-full ${darkMode ? "bg-white/10" : "bg-black/10"}`} />
        </header>
        <div className="mx-auto grid min-h-[calc(100dvh-72px)] w-full max-w-[1500px] md:grid-cols-[340px_minmax(0,1fr)]">
          <aside className={`hidden border-r p-5 md:block ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
            <div className={`h-8 w-36 animate-pulse rounded ${darkMode ? "bg-white/10" : "bg-black/10"}`} />
            <div className={`mt-5 h-12 animate-pulse rounded-xl ${darkMode ? "bg-white/10" : "bg-black/5"}`} />
            <div className="mt-5 space-y-4">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className={`h-12 w-12 animate-pulse rounded-full ${darkMode ? "bg-white/10" : "bg-black/10"}`} />
                  <div className="flex-1 space-y-2">
                    <div className={`h-3 w-2/3 animate-pulse rounded ${darkMode ? "bg-white/10" : "bg-black/10"}`} />
                    <div className={`h-3 w-full animate-pulse rounded ${darkMode ? "bg-white/5" : "bg-black/5"}`} />
                  </div>
                </div>
              ))}
            </div>
          </aside>
          <section className="relative flex min-h-0 items-center justify-center overflow-hidden px-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(246,184,0,.14),transparent_42%)]" />
            <div className={`relative w-full max-w-sm rounded-3xl border p-7 text-center shadow-2xl ${loadingSurface}`}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#f6b800]/55 bg-black text-[#f6b800] shadow-[0_0_35px_rgba(246,184,0,.16)]">
                <MessageIcon />
              </div>
              <p className="mt-6 text-[10px] font-black uppercase tracking-[.24em] text-[#b88900]">LoadLink messages</p>
              <h1 className="mt-2 text-2xl font-black">Connecting your inbox</h1>
              <p className={`mx-auto mt-3 max-w-xs text-sm leading-6 ${darkMode ? "text-white/55" : "text-black/55"}`}>Loading conversations securely. Your messages will appear here without moving the page.</p>
              <div className="mt-6 flex justify-center gap-2" aria-label="Loading messages">
                {[0, 1, 2].map((item) => <span key={item} className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#f6b800]" style={{ animationDelay: `${item * 120}ms` }} />)}
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main data-theme={darkMode ? "dark" : "light"} style={viewportHeight ? { height: `${viewportHeight}px` } : undefined} className={`${styles.messageApp} loadlink-messages flex h-[100dvh] flex-col overflow-hidden ${darkMode ? "bg-[#050505] text-white" : "bg-[#eeeae0] text-black"}`}>
      <header className={`relative grid h-[72px] grid-cols-[56px_1fr_56px] items-center border-b px-3 md:h-20 md:grid-cols-[120px_1fr_120px] md:px-5 ${darkMode ? "border-white/10 bg-black text-white" : "border-black/10 bg-white text-black"}`}>
        <div className="relative z-10 flex items-center gap-1">
          <SiteMenu darkMode={darkMode} className={darkMode ? "text-white" : "text-black"} />
          <Link
            href="/"
            className="hidden items-center gap-2 text-sm font-black md:inline-flex"
            aria-label="Back to LoadLink home"
          >
            <span className="text-2xl">←</span>
            <span>Home</span>
          </Link>
        </div>
        <HomeLogoLink
          theme={darkMode ? "dark" : "light"}
          className="pointer-events-auto absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          logoClassName="loadlink-messages-header-logo"
        />
        <div className="relative z-10 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => loadConversations(selectedIdRef.current).catch((refreshError) => setError(cleanError(refreshError, "Could not refresh.")))}
            className="hidden text-[11px] font-black uppercase tracking-wide text-[#b88900] sm:block"
          >Refresh</button>
          <LoadLinkThemeToggle darkMode={darkMode} onToggle={toggleTheme} />
        </div>
      </header>

      <div className="mx-auto grid min-h-0 w-full max-w-[1500px] flex-1 md:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)_300px]">
        <aside
          className={`${selectedId ? "hidden md:flex" : "flex"} loadlink-inbox-panel min-h-0 flex-col border-r border-black/10 bg-white`}
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
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-black/[.04] p-1" role="tablist" aria-label="Conversation folders">
              <button
                type="button"
                role="tab"
                aria-selected={!showArchived}
                onClick={() => { setShowArchived(false); setQuery(""); }}
                className={`rounded-lg px-3 py-2 text-[11px] font-black uppercase tracking-wide transition ${!showArchived ? "bg-black text-[#f6b800] shadow-sm" : "text-black/45"}`}
              >
                Inbox
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={showArchived}
                onClick={() => { setShowArchived(true); setQuery(""); }}
                className={`rounded-lg px-3 py-2 text-[11px] font-black uppercase tracking-wide transition ${showArchived ? "bg-black text-[#f6b800] shadow-sm" : "text-black/45"}`}
              >
                Archived{archivedCount ? ` (${archivedCount})` : ""}
              </button>
            </div>
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
                        isRecentlyActive(conversation.other_last_seen, presenceNow),
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
                          {messagePrivacy.notificationPreviews
                            ? `${conversation.last_message_has_attachment ? "Attachment · " : ""}${conversation.last_message || "Start the conversation"}`
                            : conversation.unreadCount
                              ? "New message"
                              : "Message preview hidden"}
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
                  {showArchived ? "No archived conversations" : "No conversations yet"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-black/55">
                  {showArchived
                    ? "Archived conversations stay available here until you restore them."
                    : "Open a listing and tap Message to start a private conversation."}
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
          className={`${selectedId ? "flex" : "hidden md:flex"} loadlink-chat-panel min-h-0 flex-col bg-[#f3f0e8]`}
        >
          {selectedConversation ? (
            <>
              <header className="loadlink-chat-header flex min-h-[78px] items-center gap-3 border-b border-black/10 bg-white px-3 py-3 md:px-5">
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
                    isRecentlyActive(selectedConversation.other_last_seen, presenceNow),
                  )}
                />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-black md:text-lg">
                    {selectedConversation.other_name}
                  </h2>
                  <p
                    className={`truncate text-xs font-bold ${selectedConversation.other_typing ? "text-[#168b42]" : "text-black/45"}`}
                  >
                    {activityText(selectedConversation, presenceNow)}
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
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const waveform = useMemo(() => {
    const seed = String(message.id || message.attachment_id || "loadlink");
    return Array.from({ length: 34 }, (_, index) => {
      const code = seed.charCodeAt(index % seed.length) || 76;
      return 22 + ((code * (index + 5) * 13) % 70);
    });
  }, [message.attachment_id, message.id]);
                      </span>
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void toggleBlock()}
                    disabled={blockBusy}
                    className={`hidden h-10 items-center justify-center rounded-full border px-4 text-[10px] font-black uppercase md:flex ${blockState.blocked_by_me ? "border-red-500 bg-red-50 text-red-600" : "border-black/10 bg-white text-black"}`}
                  >
                    {blockBusy ? "Saving…" : blockState.blocked_by_me ? "Unblock" : "Block"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDetails((value) => !value)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-black xl:hidden"
                    aria-label="Conversation details"
                    aria-expanded={showDetails}
                  >
                    <InfoIcon />
                  </button>
                </div>
              </header>

              <div className="loadlink-chat-privacy border-b border-[#d7b33b]/35 bg-[#fff7dc] px-4 py-2.5 text-[11px] font-semibold leading-5 text-black/60">
                Messages and attachments are protected in transit and stored
                privately. Only people in this conversation can access them.
              </div>

              {conversationBlocked ? (
                <div className="flex items-center justify-between gap-3 border-b border-red-300 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
                  <span>{blockState.blocked_by_me ? "You blocked this user. Unblock them to continue the conversation." : "This user blocked the conversation. New messages are disabled."}</span>
                  {blockState.blocked_by_me ? <button type="button" onClick={() => void toggleBlock()} className="shrink-0 border border-red-500 px-3 py-2 text-[10px] font-black uppercase">Unblock</button> : null}
                </div>
              ) : null}

              {showDetails ? (
                <div className="border-b border-black/10 bg-white p-4 xl:hidden">
                  <ConversationDetails conversation={selectedConversation} blockState={blockState} blockBusy={blockBusy} archiveBusy={archiveBusy} onToggleArchive={toggleArchive} onToggleBlock={toggleBlock} />
                </div>
              ) : null}

              <div
                ref={messageViewportRef}
                className="loadlink-message-viewport loadlink-chat-wallpaper min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-5 md:px-8"
                style={{ backgroundImage: `url(/images/chat-wallpapers/chat-${String(wallpaperIndex).padStart(2, "0")}.svg)` }}
              >
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
                            className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}
                          >
                            {!mine ? (
                              <Avatar
                                name={selectedConversation.other_name}
                                photo={selectedConversation.other_photo}
                                size="h-8 w-8"
                                online={isRecentlyActive(selectedConversation.other_last_seen, presenceNow)}
                              />
                            ) : null}
                            <div
                              className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[72%] ${
                                mine
                                  ? "rounded-br-sm bg-black text-white"
                                  : "rounded-bl-sm border border-black/5 bg-white text-black"
                              }`}
                            >
                              {message.attachment_id ? (
                                message.file_type?.startsWith("audio/") ? (
                                  <VoiceAttachment message={message} accessKey={selectedConversation.accessKey} mine={mine} onError={setError} />
                                ) : (
                                  <button
                                    type="button"
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const waveform = useMemo(() => {
    const seed = String(message.id || message.attachment_id || "loadlink");
    return Array.from({ length: 34 }, (_, index) => {
      const code = seed.charCodeAt(index % seed.length) || 76;
      return 22 + ((code * (index + 5) * 13) % 70);
    });
  }, [message.attachment_id, message.id]);
                                    onClick={() => downloadAttachment(message)}
                                    className={`mb-2 flex w-full items-center gap-3 rounded-xl border p-3 text-left ${mine ? "border-white/15 bg-white/10" : "border-black/10 bg-[#f7f4ed]"}`}
                                  >
                                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${mine ? "bg-[#f6b800] text-black" : "bg-black text-[#f6b800]"}`}><PaperclipIcon /></span>
                                    <span className="min-w-0 flex-1">
                                      <strong className="block truncate text-xs font-black">{message.file_name || "Attachment"}</strong>
                                      <span className={`mt-0.5 block text-[10px] font-semibold ${mine ? "text-white/55" : "text-black/45"}`}>{fileSizeLabel(message.file_size)} · Tap to open</span>
                                    </span>
                                  </button>
                                )
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
                      <div className="flex items-end justify-start gap-2">
                        <Avatar name={selectedConversation.other_name} photo={selectedConversation.other_photo} size="h-8 w-8" online />
                        <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-black/5 bg-white px-4 py-3 shadow-sm">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/40 [animation-delay:-.2s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/40 [animation-delay:-.1s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/40" />
                        </div>
                      </div>
                    ) : null}
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

              <LogisticsMessageTools
                threadId={selectedConversation.id}
                listingTitle={selectedConversation.listing_title}
                role={selectedConversation.role}
                darkMode={darkMode}
                disabled={sending || uploading || dailyLimitReached || conversationBlocked}
                onInsert={(message) => updateTyping(text.trim() ? `${text.trim()}\n\n${message}` : message)}
              />

              <form
                onSubmit={send}
                className="loadlink-chat-composer border-t border-black/10 bg-white p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:p-4"
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
                    disabled={sending || uploading || dailyLimitReached || conversationBlocked}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-black/10 bg-[#f3f0e8] text-black disabled:opacity-40"
                    aria-label="Attach a file"
                  >
                    <PaperclipIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => recording ? stopRecording(false) : void startRecording()}
                    disabled={sending || uploading || dailyLimitReached || conversationBlocked}
                    className={`flex h-12 shrink-0 items-center justify-center rounded-full border px-3 text-xs font-black ${recording ? "min-w-[82px] border-red-500 bg-red-500 text-white" : "w-12 border-black/10 bg-[#f3f0e8] text-black"} disabled:opacity-40`}
                    aria-label={recording ? "Stop and send voice note" : "Record voice note"}
                  >
                    {recording ? recordingTime(recordingSeconds) : <MicrophoneIcon />}
                  </button>
                  <div className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-[#f6f4ee] px-4 py-2 focus-within:border-[#f6b800] focus-within:bg-white">
                    <textarea
                      value={text}
                      onChange={(event) => updateTyping(event.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      placeholder={
                        conversationBlocked
                          ? "Messaging is blocked"
                          : dailyLimitReached
                            ? "Daily free message limit reached"
                            : recording
                              ? "Recording voice note…"
                              : uploading
                                ? "Sending attachment…"
                                : "Type a message"
                      }
                      rows={1}
                      maxLength={4000}
                      disabled={sending || uploading || dailyLimitReached || conversationBlocked}
                      className="max-h-32 min-h-8 w-full resize-none bg-transparent py-1 text-sm font-medium outline-none placeholder:text-black/35 disabled:opacity-50"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={
                      !text.trim() || sending || uploading || dailyLimitReached || conversationBlocked
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
                <div className="loadlink-chat-composer-meta mx-auto mt-2 flex max-w-3xl flex-wrap items-center justify-center gap-2 text-center text-[10px] font-semibold text-black/40">
                  <span>Photos, documents and voice notes up to 5 MB</span>
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
                        {messagesUsedToday}/{dailyMessageLimit} messages used today
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

        <aside className="loadlink-details-panel hidden min-h-0 overflow-y-auto border-l border-black/10 bg-white p-5 xl:block">
          {selectedConversation ? (
            <ConversationDetails conversation={selectedConversation} blockState={blockState} blockBusy={blockBusy} archiveBusy={archiveBusy} onToggleArchive={toggleArchive} onToggleBlock={toggleBlock} />
          ) : null}
        </aside>
      </div>
    </main>
  );
}

function VoiceAttachment({ message, accessKey, mine, onError }: { message: ChatMessage; accessKey: string; mine: boolean; onError: (message: string) => void }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveform, setWaveform] = useState<WaveformBar[]>(() => defaultWaveformBars());
  const audioRef = useRef<HTMLAudioElement>(null);
  const autoplayRef = useRef(false);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  useEffect(() => {
    if (!url || !autoplayRef.current) return;
    autoplayRef.current = false;
    const timer = window.setTimeout(() => {
      void audioRef.current?.play().catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [url]);

  async function loadVoiceNote(playAfterLoad = false) {
    if (!message.attachment_id || loading) return;
    if (url) {
      if (playAfterLoad) void audioRef.current?.play().catch(() => undefined);
      return;
    }
    setLoading(true);
    try {
      const result = await supabase.rpc("get_listing_guest_attachment", {
        p_attachment_id: message.attachment_id,
        p_access_key: accessKey,
      });
      if (result.error) throw result.error;
      const payload = ((result.data || []) as AttachmentPayload[])[0];
      if (!payload) throw new Error("Voice note unavailable.");
      const blob = base64ToBlob(payload.file_base64, payload.file_type);
      setWaveform(await audioWaveform(blob));
      autoplayRef.current = playAfterLoad;
      setUrl(URL.createObjectURL(blob));
    } catch (error) {
      onError(cleanError(error, "Voice note could not be opened."));
    } finally {
      setLoading(false);
    }
  }

  async function togglePlayback() {
    if (!url) {
      await loadVoiceNote(true);
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) await audio.play().catch(() => undefined);
    else audio.pause();
  }

  function seek(event: ReactMouseEvent<HTMLButtonElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  }

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <div className={`loadlink-voice-note mb-2 w-full min-w-[220px] rounded-2xl border px-3 py-2.5 ${mine ? "border-white/15 bg-white/10" : "border-black/10 bg-[#f7f4ed]"}`}>
      {url ? (
        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          className="hidden"
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
          onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setCurrentTime(0); }}
        />
      ) : null}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void togglePlayback()}
          disabled={loading}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm transition active:scale-95 ${mine ? "bg-[#f6b800] text-black" : "bg-black text-[#f6b800]"}`}
          aria-label={playing ? "Pause voice note" : "Play voice note"}
        >
          {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/25 border-t-current" /> : <PlayPauseIcon playing={playing} />}
        </button>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={seek}
            disabled={!url || !duration}
            className="flex h-9 w-full items-center gap-[2px] overflow-hidden disabled:cursor-default"
            aria-label="Seek voice note"
          >
            {waveform.map((bar, index) => {
              const active = index / waveform.length <= progress;
              return (
                <span
                  key={`${message.id}-wave-${index}`}
                  className={`w-[3px] min-w-[2px] rounded-full transition-colors ${active ? "bg-[#f6b800]" : mine ? "bg-white/35" : "bg-black/25"}`}
                  style={{ height: `${bar.height}%` }}
                />
              );
            })}
          </button>
          <div className={`mt-0.5 flex items-center justify-between gap-3 text-[10px] font-bold ${mine ? "text-white/58" : "text-black/48"}`}>
            <span>{url ? timeLabel(currentTime) : "Voice note"}</span>
            <span>{duration ? timeLabel(duration) : fileSizeLabel(message.file_size)}</span>
          </div>
        </div>
      </div>
    </div>
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
    <span className={`relative ${size} shrink-0`} style={{ aspectRatio: "1 / 1" }}>
      <span className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full bg-black text-xs font-black text-[#f6b800] ring-1 ring-[#f6b800]/35">
        {photo && !imageFailed ? (
          <img
            src={photo}
            alt={`${name} profile`}
            className="absolute inset-0 block h-full w-full rounded-full object-cover"
            style={{ aspectRatio: "1 / 1" }}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
      </span>
      {online ? (
        <span
          className="absolute bottom-[-1px] right-[-1px] h-3.5 w-3.5 rounded-full border-2 border-white bg-[#25b85a] shadow-sm"
          aria-label="Active in messages"
        />
      ) : null}
    </span>
  );
}

function ConversationDetails({
  conversation,
  blockState,
  blockBusy,
  archiveBusy,
  onToggleArchive,
  onToggleBlock,
}: {
  conversation: Conversation;
  blockState: BlockState;
  blockBusy: boolean;
  archiveBusy: boolean;
  onToggleArchive: () => Promise<void>;
  onToggleBlock: () => Promise<void>;
}) {
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
          online={isRecentlyActive(conversation.other_last_seen)}
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
          <p className="text-[10px] font-black uppercase tracking-wide text-black/35">Listing</p>
          <p className="mt-1 text-sm font-black leading-5">{conversation.listing_title}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-black/35">Response pattern</p>
          <p className="mt-1 text-sm font-semibold leading-5">{replyText(conversation.average_reply_minutes)}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-black/35">Messaging plan</p>
          <p className="mt-1 text-sm font-semibold leading-5">
            {conversation.is_pro
              ? "Pro · unlimited daily messaging"
              : `${toCount(conversation.messages_used_today)}/${Math.max(1, toCount(conversation.daily_message_limit) || 50)} messages used today`}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        <button
          type="button"
          onClick={() => void onToggleArchive()}
          disabled={archiveBusy}
          className="flex items-center justify-center gap-2 rounded-xl border border-[#b88900]/45 bg-[#fff8de] px-4 py-3 text-xs font-black uppercase tracking-wide text-[#705300] disabled:opacity-45"
        >
          <ArchiveIcon />
          {archiveBusy ? "Saving…" : conversation.archived ? "Restore to inbox" : "Archive conversation"}
        </button>
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

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => void onToggleBlock()} disabled={blockBusy || blockState.blocked_by_other} className={`flex h-11 items-center justify-center border text-[10px] font-black uppercase ${blockState.blocked_by_me ? "border-red-500 bg-red-50 text-red-600" : "border-black/15 text-black"} disabled:opacity-45`}>
          {blockBusy ? "Saving…" : blockState.blocked_by_me ? "Unblock" : blockState.blocked_by_other ? "Blocked" : "Block user"}
        </button>
        <button type="button" onClick={() => void onReport()} disabled={reportBusy} className="flex h-11 items-center justify-center border border-red-500/45 text-[10px] font-black uppercase text-red-600 disabled:opacity-45">
          {reportBusy ? "Sending…" : "Report chat"}
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-[#e5c34c]/35 bg-[#fff8de] p-4">
        <p className="text-xs font-black">Stay safe</p>
        <p className="mt-2 text-xs font-medium leading-5 text-black/55">
          Confirm listing details before paying. Avoid sending passwords, PINs or one-time verification codes.
        </p>
      </div>
    </div>
  );
}

function PlayPauseIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6.5" y="5" width="4" height="14" rx="1" />
      <rect x="13.5" y="5" width="4" height="14" rx="1" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.8v12.4c0 .85.94 1.36 1.65.9l9.1-6.2a1.08 1.08 0 0 0 0-1.8l-9.1-6.2A1.08 1.08 0 0 0 8 5.8Z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 10.7v5.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="7.5" r="1.1" fill="currentColor" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7.5h16v11A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-11Z" stroke="currentColor" strokeWidth="2" />
      <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h15A1.5 1.5 0 0 1 21 4.5v3H3v-3ZM9 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

function MicrophoneIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="8" y="3" width="8" height="12" rx="4" stroke="currentColor" strokeWidth="2" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
