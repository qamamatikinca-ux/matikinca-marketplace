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
import LogisticsMessageTools, { type StructuredQuote } from "@/components/LogisticsMessageTools";
import { useLoadLinkTheme } from "@/lib/useLoadLinkTheme";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { currentRelativePath, isAuthenticatedUser, loginHref } from "@/lib/auth";
import { getBuyerKey, getBuyerKeys, getOwnerKeys } from "@/lib/chatKeys";
import { recordUserActivity, syncAccountState } from "@/lib/accountState";
import { errorMessage, getFreshAuthenticatedUser } from "@/lib/reliableSupabase";
import {
  DEFAULT_MESSAGE_PRIVACY,
  profileRowToMessagePrivacy,
  readMessagePrivacy,
  type MessagePrivacyPreferences,
  writeMessagePrivacy,
} from "@/lib/messagePrivacy";
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
  request_status?: "pending" | "accepted" | "declined" | null;
};

type Conversation = ConversationRow & {
  accessKey: string;
  role: Role;
  unreadCount: number;
};

type QuoteBranding = { name: string; logo: string | null };
type QuotePayload = StructuredQuote & {
  status?: "pending" | "accepted" | "declined";
  listing_title?: string;
  dealership_name?: string;
  dealership_logo?: string | null;
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
  edited_at?: string | null;
  deleted_at?: string | null;
  message_kind?: "text" | "quote" | "system" | null;
  structured_payload?: QuotePayload | Record<string, unknown> | null;
  starred_by_me?: boolean | null;
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
  if (difference < 120_000) return "Active in messages";
  if (difference < 3_600_000)
    return `Active in messages ${Math.max(1, Math.round(difference / 60_000))} min ago`;
  if (difference < 86_400_000)
    return `Active in messages ${Math.max(1, Math.round(difference / 3_600_000))} hr ago`;

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

function fileToBase64(file: File, onProgress?: (progress: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The selected file could not be read."));
    reader.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 68));
    };
    reader.onload = () => {
      onProgress?.(72);
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
  // LOADLINK V2.5.3 SESSION WALLPAPER
  useEffect(() => {
    const count = 10;
    const lastKey = "loadlink-chat-wallpaper-last-v253";
    const last = Number(window.localStorage.getItem(lastKey));
    const random = window.crypto?.getRandomValues
      ? window.crypto.getRandomValues(new Uint32Array(1))[0]
      : Math.floor(Math.random() * 0xffffffff);

    let next = (random % count) + 1;
    if (Number.isInteger(last) && last >= 1 && last <= count && next === last) {
      next = (next % count) + 1;
    }

    const file = String(next).padStart(2, "0");
    document.documentElement.style.setProperty(
      "--loadlink-chat-wallpaper-v253",
      `url("/images/chat-wallpapers/chat-${file}.svg")`,
    );
    window.localStorage.setItem(lastKey, String(next));

    return () => {
      document.documentElement.style.removeProperty("--loadlink-chat-wallpaper-v253");
    };
  }, []);

  const router = useRouter();
  const { darkMode, toggleTheme } = useLoadLinkTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState<"inbox" | "potential" | "archived">("inbox");
  const [chatSearch, setChatSearch] = useState("");
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState("");
  const [messageMenuId, setMessageMenuId] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [failedUpload, setFailedUpload] = useState<{ file: File; caption?: string } | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [blockState, setBlockState] = useState<BlockState>({ blocked_by_me: false, blocked_by_other: false });
  const [blockBusy, setBlockBusy] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [composerActionsOpen, setComposerActionsOpen] = useState(false);
  const [potentialDealReviewOpen, setPotentialDealReviewOpen] = useState(false);
  const [quoteBranding, setQuoteBranding] = useState<QuoteBranding>({ name: "", logo: null });
  const [messagePrivacy, setMessagePrivacy] = useState<MessagePrivacyPreferences>(
    () => DEFAULT_MESSAGE_PRIVACY,
  );
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

  useEffect(() => {
    const timer = window.setInterval(() => setPresenceNow(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    const syncHeight = () => {
      const height = Math.max(320, Math.round(viewport?.height || window.innerHeight));
      document.documentElement.style.setProperty("--loadlink-message-vh", `${height}px`);
    };
    syncHeight();
    viewport?.addEventListener("resize", syncHeight);
    viewport?.addEventListener("scroll", syncHeight);
    window.addEventListener("resize", syncHeight);
    window.addEventListener("orientationchange", syncHeight);
    return () => {
      viewport?.removeEventListener("resize", syncHeight);
      viewport?.removeEventListener("scroll", syncHeight);
      window.removeEventListener("resize", syncHeight);
      window.removeEventListener("orientationchange", syncHeight);
      document.documentElement.style.removeProperty("--loadlink-message-vh");
    };
  }, []);

  const selectedConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === selectedId) ||
      null,
    [conversations, selectedId],
  );

  useEffect(() => {
    if (!selectedId) return;
    try {
      setText(window.localStorage.getItem(`loadlink-message-draft:${selectedId}`) || "");
    } catch {
      setText("");
    }
  }, [selectedId]);

  useEffect(() => {
    setComposerActionsOpen(false);
    setPotentialDealReviewOpen(false);
  }, [selectedId]);

  useEffect(() => {
    let cancelled = false;
    setQuoteBranding({ name: "", logo: null });
    if (!selectedConversation?.listing_id) return;

    (async () => {
      try {
        const listingResult = await supabase
          .from("job_listings")
          .select("dealership_id,poster_photo,posted_by")
          .eq("id", selectedConversation.listing_id)
          .maybeSingle();
        if (cancelled || listingResult.error || !listingResult.data) return;
        const listing = listingResult.data as { dealership_id?: string | null; poster_photo?: string | null; posted_by?: string | null };
        if (!listing.dealership_id) return;

        const dealerResult = await supabase
          .from("dealership_profiles")
          .select("name,profile_image_url")
          .eq("id", listing.dealership_id)
          .maybeSingle();
        if (cancelled) return;
        if (!dealerResult.error && dealerResult.data) {
          const dealer = dealerResult.data as { name?: string | null; profile_image_url?: string | null };
          setQuoteBranding({
            name: String(dealer.name || listing.posted_by || "Dealership").trim(),
            logo: String(dealer.profile_image_url || listing.poster_photo || "").trim() || null,
          });
        } else {
          setQuoteBranding({
            name: String(listing.posted_by || "Dealership").trim(),
            logo: String(listing.poster_photo || "").trim() || null,
          });
        }
      } catch {
        // Dealership branding is optional and must never block chat.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedConversation?.listing_id]);

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
  const dailyMessageLimit = selectedConversation
    ? Math.max(1, toCount(selectedConversation.daily_message_limit) || 50)
    : 50;
  const isPro = Boolean(selectedConversation?.is_pro);
  const dailyLimitReached = Boolean(
    selectedConversation && !isPro && messagesUsedToday >= dailyMessageLimit,
  );
  const conversationBlocked = blockState.blocked_by_me || blockState.blocked_by_other;
  const potentialDealPending = Boolean(selectedConversation?.role === "owner" && selectedConversation.request_status === "pending");
  const potentialDealDeclined = Boolean(selectedConversation?.request_status === "declined");

  const visibleConversations = useMemo(() => {
    const search = query.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const pendingDeal = conversation.role === "owner" && conversation.request_status === "pending";
      if (folder === "archived" && !conversation.archived) return false;
      if (folder === "potential" && (!pendingDeal || conversation.archived)) return false;
      if (folder === "inbox" && (conversation.archived || pendingDeal || (conversation.role === "owner" && conversation.request_status === "declined"))) return false;
      if (!search) return true;
      return `${conversation.other_name} ${conversation.listing_title} ${conversation.last_message || ""}`
        .toLowerCase()
        .includes(search);
    });
  }, [conversations, folder, query]);

  const archivedCount = useMemo(
    () => conversations.filter((conversation) => Boolean(conversation.archived)).length,
    [conversations],
  );
  const potentialDealCount = useMemo(
    () => conversations.filter((conversation) => conversation.role === "owner" && conversation.request_status === "pending" && !conversation.archived).length,
    [conversations],
  );
  const searchedMessages = useMemo(() => {
    const needle = chatSearch.trim().toLowerCase();
    return messages.filter((message) => {
      if (starredOnly && !message.starred_by_me) return false;
      if (!needle) return true;
      const structured = message.structured_payload ? JSON.stringify(message.structured_payload) : "";
      return `${message.body || ""} ${message.file_name || ""} ${structured}`.toLowerCase().includes(needle);
    });
  }, [chatSearch, messages, starredOnly]);

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

    const locallyArchived = readLocalArchivedIds();
    const merged = new Map<string, Conversation>();
    [...buyerRows, ...ownerRows].forEach((row) => {
      const hasNewMessage = row.unreadCount > 0;
      if (hasNewMessage) locallyArchived.delete(row.id);
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
        const signature = rows.map((row) => `${row.id}:${row.created_at}:${row.body}:${row.attachment_id || ""}:${row.edited_at || ""}:${row.deleted_at || ""}:${row.starred_by_me ? 1 : 0}:${row.message_kind || ""}:${JSON.stringify(row.structured_payload || {})}`).join("|");
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
          const nextPrivacy = profileRowToMessagePrivacy(
            privacyRow as Record<string, unknown>,
          );
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
    }, 5000);
    const touchPresence = () => {
      if (document.visibilityState === "hidden") return;
      if (!messagePrivacy.activityVisible) return;
      supabase.rpc("touch_listing_guest_presence", {
        p_thread_id: selectedConversation.id,
        p_access_key: selectedConversation.accessKey,
        p_is_typing:
          messagePrivacy.typingIndicators && typingActiveRef.current,
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
  }, [
    loadMessages,
    messagePrivacy.activityVisible,
    messagePrivacy.typingIndicators,
    selectedId,
  ]);

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
    if (editingMessageId) {
      await saveEditedMessage();
      return;
    }
    if (potentialDealDeclined) {
      setError("This potential deal was declined and can no longer receive messages.");
      return;
    }
    if (potentialDealPending) {
      setError("Accept this potential deal before replying.");
      return;
    }
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

    if (
      /\b(?:otp|one[- ]time pin|password|banking pin|card pin|cvv)\b/i.test(text) &&
      !window.confirm(
        "LoadLink will never ask for your password, OTP, PIN or CVV. Send this message only if it does not expose private security information.",
      )
    ) {
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
      void sendPushNotification(selectedConversation, text.trim());
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

  async function sendPushNotification(conversation: Conversation, preview: string) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      await fetch("/api/push/message", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          threadId: conversation.id,
          preview: preview.slice(0, 180),
        }),
      });
    } catch {
      // Push delivery is best-effort and must never block messaging.
    }
  }

  async function sendStructuredQuote(quote: StructuredQuote) {
    if (!selectedConversation || sending || uploading || conversationBlocked || dailyLimitReached || potentialDealPending || potentialDealDeclined) return;
    setSending(true);
    setError("");
    try {
      const result = await supabase.rpc("send_listing_guest_structured_message", {
        p_thread_id: selectedConversation.id,
        p_access_key: selectedConversation.accessKey,
        p_kind: "quote",
        p_payload: {
          ...quote,
          listing_title: selectedConversation.listing_title,
          status: "pending",
          ...(quoteBranding.name ? { dealership_name: quoteBranding.name } : {}),
          ...(quoteBranding.logo ? { dealership_logo: quoteBranding.logo } : {}),
        },
      });
      if (result.error) throw result.error;
      void sendPushNotification(selectedConversation, `New rate quote · R${quote.amount}`);
      forceScrollRef.current = true;
      await loadMessages(selectedConversation);
      await loadConversations(selectedConversation.id);
    } catch (quoteError) {
      setError(cleanError(quoteError, "The structured quote could not be sent. Run LOADLINK-MESSAGES-V2.sql if the message upgrade is not installed yet."));
    } finally {
      setSending(false);
    }
  }

  function beginEdit(message: ChatMessage) {
    if (!selectedConversation || message.sender_role !== selectedConversation.role || message.deleted_at) return;
    const age = Date.now() - new Date(message.created_at).getTime();
    if (!Number.isFinite(age) || age > 15 * 60_000) {
      setError("Messages can be edited for 15 minutes after sending.");
      return;
    }
    setEditingMessageId(message.id);
    updateTyping(message.body);
    window.requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('[data-loadlink-message-composer="true"]')?.focus());
  }

  async function saveEditedMessage() {
    if (!selectedConversation || !editingMessageId || !text.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const result = await supabase.rpc("edit_listing_guest_message", {
        p_message_id: editingMessageId,
        p_access_key: selectedConversation.accessKey,
        p_body: text.trim(),
      });
      if (result.error) throw result.error;
      setEditingMessageId("");
      setText("");
      await loadMessages(selectedConversation);
      await loadConversations(selectedConversation.id);
    } catch (editError) {
      setError(cleanError(editError, "The message could not be edited."));
    } finally {
      setSending(false);
    }
  }

  async function deleteMessage(message: ChatMessage) {
    if (!selectedConversation || message.sender_role !== selectedConversation.role || message.deleted_at) return;
    if (!window.confirm("Delete this message for everyone? This is available for 15 minutes after sending.")) return;
    setError("");
    try {
      const result = await supabase.rpc("delete_listing_guest_message", {
        p_message_id: message.id,
        p_access_key: selectedConversation.accessKey,
      });
      if (result.error) throw result.error;
      if (editingMessageId === message.id) { setEditingMessageId(""); setText(""); }
      await loadMessages(selectedConversation);
      await loadConversations(selectedConversation.id);
    } catch (deleteError) {
      setError(cleanError(deleteError, "The message could not be deleted."));
    }
  }

  async function toggleStar(message: ChatMessage) {
    if (!selectedConversation) return;
    const next = !Boolean(message.starred_by_me);
    setMessages((current) => current.map((item) => item.id === message.id ? { ...item, starred_by_me: next } : item));
    const result = await supabase.rpc("set_listing_guest_message_star", {
      p_message_id: message.id,
      p_access_key: selectedConversation.accessKey,
      p_starred: next,
    });
    if (result.error) {
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, starred_by_me: !next } : item));
      setError(cleanError(result.error, "The starred-message setting could not be saved."));
    }
  }

  async function respondToQuote(message: ChatMessage, status: "accepted" | "declined") {
    if (!selectedConversation || message.sender_role === selectedConversation.role) return;
    setError("");
    try {
      const result = await supabase.rpc("respond_listing_guest_quote", {
        p_message_id: message.id,
        p_access_key: selectedConversation.accessKey,
        p_status: status,
      });
      if (result.error) throw result.error;
      void sendPushNotification(selectedConversation, status === "accepted" ? "Your LoadLink quote was accepted" : "Your LoadLink quote was declined");
      await loadMessages(selectedConversation);
    } catch (quoteError) {
      setError(cleanError(quoteError, "The quote response could not be saved."));
    }
  }

  async function updatePotentialDeal(status: "accepted" | "declined") {
    if (!selectedConversation || selectedConversation.role !== "owner") return;
    setError("");
    try {
      const result = await supabase.rpc("set_listing_guest_request_status", {
        p_thread_id: selectedConversation.id,
        p_access_key: selectedConversation.accessKey,
        p_status: status,
      });
      if (result.error) throw result.error;
      await loadConversations(selectedConversation.id);
      if (status === "accepted") setFolder("inbox");
      else returnToInbox();
    } catch (requestError) {
      setError(cleanError(requestError, "The potential-deal request could not be updated."));
    }
  }

  function updateTyping(nextText: string) {
    setText(nextText);
    typingActiveRef.current =
      messagePrivacy.typingIndicators && Boolean(nextText.trim());
    if (!selectedConversation || !messagePrivacy.typingIndicators) return;

    const now = Date.now();
    if (!nextText.trim() || now - lastTypingPingRef.current > 2500) {
      lastTypingPingRef.current = now;
      supabase.rpc("touch_listing_guest_presence", {
        p_thread_id: selectedConversation.id,
        p_access_key: selectedConversation.accessKey,
        p_is_typing:
          messagePrivacy.typingIndicators && Boolean(nextText.trim()),
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
    if (potentialDealDeclined) {
      setError("This potential deal was declined and can no longer receive attachments.");
      return;
    }
    if (potentialDealPending) {
      setError("Accept this potential deal before sending an attachment.");
      return;
    }
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
    setUploadProgress(1);
    setFailedUpload(null);
    setError("");
    try {
      const user = await getFreshAuthenticatedUser();
      if (!user) throw new Error("Your sign-in session expired.");
      const base64 = await fileToBase64(file, setUploadProgress);
      setUploadProgress(78);
      const result = await supabase.rpc("send_listing_guest_attachment", {
        p_thread_id: selectedConversation.id,
        p_access_key: selectedConversation.accessKey,
        p_file_name: file.name,
        p_file_type: fileType,
        p_file_base64: base64,
        p_caption: caption ?? (text.trim() || null),
      });
      if (result.error) throw result.error;
      setUploadProgress(100);
      void sendPushNotification(selectedConversation, fileType.startsWith("audio/") ? "Voice note" : file.name);
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
      setFailedUpload({ file, caption });
      setError(cleanError(uploadError, fileType.startsWith("audio/") ? "The voice note could not be sent. You can retry it below." : "The file could not be sent. You can retry it below."));
    } finally {
      setUploading(false);
      window.setTimeout(() => setUploadProgress(0), 350);
    }
  }

  async function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await sendAttachment(file);
  }

  async function startRecording() {
    if (!selectedConversation || recording || uploading || sending || conversationBlocked || dailyLimitReached || potentialDealPending || potentialDealDeclined) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice notes are not supported by this browser. You can attach an audio file instead.");
      return;
    }
    setError("");
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
      setError(willArchive ? "Conversation archived." : "Conversation restored to the inbox.");
      if (willArchive && folder !== "archived") returnToInbox();
      if (!willArchive && folder === "archived") returnToInbox();
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
    const reason = window.prompt(
      "Briefly explain what is unsafe, misleading or inappropriate about this conversation.",
    );
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
      setError(
        cleanError(
          reportError,
          "The conversation report could not be submitted.",
        ),
      );
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
    setChatSearch("");
    setChatSearchOpen(false);
    setStarredOnly(false);
    setEditingMessageId("");
    setMessageMenuId("");
    window.history.replaceState({}, "", `/messages?thread=${conversation.id}`);
  }

  function returnToInbox() {
    selectedIdRef.current = "";
    setSelectedId("");
    setMessages([]);
    setShowDetails(false);
    setChatSearch("");
    setChatSearchOpen(false);
    setStarredOnly(false);
    setEditingMessageId("");
    setMessageMenuId("");
    window.history.replaceState({}, "", "/messages");
  }

  if (loading) {
    return (
      <main
        className={`min-h-[100svh] ${
          darkMode ? "bg-black text-white" : "bg-[#f4efe3] text-black"
        }`}
      >
        <MessageVisualScene mode="loading" darkMode={darkMode} />
      </main>
    );
  }

  return (
    <main
      data-theme={darkMode ? "dark" : "light"}
      style={{ height: "var(--loadlink-message-vh, 100dvh)", minHeight: "var(--loadlink-message-vh, 100svh)" }}
      className={`${styles.messageApp} loadlink-messages flex flex-col overflow-hidden ${
        darkMode ? "bg-[#050505] text-white" : "bg-[#eeeae0] text-black"
      }`}
    >
      <header className={`relative h-[72px] shrink-0 border-b md:h-20 ${darkMode ? "border-white/10 bg-black text-white" : "border-black/10 bg-white text-black"}`}>
        <div className="absolute left-3 top-1/2 z-10 -translate-y-1/2 md:left-5">
          <SiteMenu darkMode={darkMode} className={darkMode ? "text-white" : "text-black"} />
        </div>
        <HomeLogoLink
          theme="auto"
          showGlow={false}
          className="loadlink-official-header-logo pointer-events-auto absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          logoClassName="loadlink-messages-header-logo"
        />
        <div className="absolute right-3 top-1/2 z-10 -translate-y-1/2 md:right-5">
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
                <h1 className="text-2xl font-bold tracking-[-.025em]">Messages</h1>
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
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-black/[.04] p-1" role="tablist" aria-label="Conversation folders">
              <button type="button" role="tab" aria-selected={folder === "inbox"} onClick={() => { setFolder("inbox"); setQuery(""); }} className={`rounded-lg px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[.04em] transition ${folder === "inbox" ? "bg-black text-white shadow-sm" : "text-black/45"}`}>Inbox</button>
              <button type="button" role="tab" aria-selected={folder === "potential"} onClick={() => { setFolder("potential"); setQuery(""); }} className={`rounded-lg px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[.04em] transition ${folder === "potential" ? "bg-black text-white shadow-sm" : "text-black/45"}`}>Potential Deals{potentialDealCount ? ` (${potentialDealCount})` : ""}</button>
              <button type="button" role="tab" aria-selected={folder === "archived"} onClick={() => { setFolder("archived"); setQuery(""); }} className={`rounded-lg px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[.04em] transition ${folder === "archived" ? "bg-black text-white shadow-sm" : "text-black/45"}`}>Archived{archivedCount ? ` (${archivedCount})` : ""}</button>
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
                  {folder === "archived" ? "No archived conversations" : folder === "potential" ? "No potential deals yet" : "No conversations yet"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-black/55">
                  {folder === "archived"
                    ? "Archived conversations stay available here until you restore them."
                    : folder === "potential"
                      ? "New enquiries from people you have not accepted yet will appear here."
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
                  <h2 className="truncate text-base font-bold md:text-lg">
                    {selectedConversation.other_name}
                  </h2>
                  <p
                    className={`truncate text-xs font-bold ${selectedConversation.other_typing ? "text-[#168b42]" : "text-black/45"}`}
                  >
                    {activityText(selectedConversation, presenceNow)}
                  </p>
                  <p className="hidden truncate text-[11px] font-semibold text-black/40 sm:block">
                    {replyText(selectedConversation.average_reply_minutes)}
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
                    onClick={() => void toggleBlock()}
                    disabled={blockBusy}
                    className={`hidden h-10 items-center justify-center rounded-full border px-4 text-[10px] font-black uppercase md:flex ${blockState.blocked_by_me ? "border-red-500 bg-red-50 text-red-600" : "border-black/10 bg-white text-black"}`}
                  >
                    {blockBusy ? "Saving…" : blockState.blocked_by_me ? "Unblock" : "Block"}
                  </button>
                  <button type="button" onClick={() => setChatSearchOpen((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-black" aria-label="Search this conversation" aria-expanded={chatSearchOpen}><SearchIcon /></button>
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

              <div className={`loadlink-listing-context flex min-h-[40px] items-center gap-2 border-b px-3 py-1.5 md:px-5 ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black text-[#f6b800]"><BriefcaseIcon /></span>
                <p className="min-w-0 flex-1 truncate text-[11px] font-semibold">{selectedConversation.listing_title}</p>
                <Link href={`/jobs#job-${selectedConversation.listing_id}`} className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[9px] font-semibold uppercase ${darkMode ? "border-white/15 text-white/75" : "border-black/10 text-black/70"}`}>View</Link>
              </div>

              {potentialDealPending ? (
                <>
                  <div className="flex min-h-[44px] items-center justify-between gap-3 border-b border-[#f6b800]/25 bg-[#fff9e8] px-3 py-2 text-[10px] font-semibold text-black md:px-5">
                    <span className="min-w-0 truncate"><strong>Potential deal</strong><span className="text-black/50"> · new listing enquiry</span></span>
                    <button type="button" onClick={() => setPotentialDealReviewOpen((value) => !value)} className="shrink-0 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-[9px] font-black uppercase">{potentialDealReviewOpen ? "Close" : "Review"}</button>
                  </div>
                  {potentialDealReviewOpen ? (
                    <div className="flex flex-wrap gap-2 border-b border-black/10 bg-white px-3 py-2.5 md:px-5">
                      <button type="button" onClick={() => void updatePotentialDeal("accepted")} className="rounded-lg bg-black px-3 py-2 text-[9px] font-black uppercase text-white">Accept deal</button>
                      <button type="button" onClick={() => void updatePotentialDeal("declined")} className="rounded-lg border border-black/15 px-3 py-2 text-[9px] font-black uppercase">Decline</button>
                      <button type="button" onClick={() => void toggleBlock()} disabled={blockBusy} className="rounded-lg border border-black/15 px-3 py-2 text-[9px] font-black uppercase disabled:opacity-50">{blockState.blocked_by_me ? "Unblock" : "Block"}</button>
                      <button type="button" onClick={() => void reportConversation()} disabled={reportBusy} className="rounded-lg border border-black/15 px-3 py-2 text-[9px] font-black uppercase disabled:opacity-50">Report</button>
                    </div>
                  ) : null}
                </>
              ) : null}

              {potentialDealDeclined ? (
                <div className="border-b border-black/10 bg-[#f5f3ed] px-4 py-3 text-xs font-bold text-black/55 md:px-5">This potential deal was declined. The conversation is read-only.</div>
              ) : null}

              {chatSearchOpen ? (
                <div className="flex items-center gap-2 border-b border-black/10 bg-white px-3 py-2 md:px-5"><SearchIcon /><input autoFocus value={chatSearch} onChange={(event) => setChatSearch(event.target.value)} placeholder="Search messages, rates or files" className="h-10 min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" /><button type="button" onClick={() => setStarredOnly((value) => !value)} className={`h-9 shrink-0 rounded-xl border px-2 text-[9px] font-black ${starredOnly ? "border-black bg-black text-white" : "border-black/10 text-black/50"}`}>{starredOnly ? "★ Starred" : "☆ Starred"}</button><span className="hidden text-[10px] font-bold text-black/40 sm:inline">{chatSearch.trim() || starredOnly ? `${searchedMessages.length} found` : ""}</span><button type="button" onClick={() => { setChatSearch(""); setStarredOnly(false); setChatSearchOpen(false); }} className="h-9 w-9 rounded-full border border-black/10 text-sm font-black">×</button></div>
              ) : null}

              {conversationBlocked ? (
                <div className="flex items-center justify-between gap-3 border-b border-red-300 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
                  <span>{blockState.blocked_by_me ? "You blocked this user. Unblock them to continue the conversation." : "This user blocked the conversation. New messages are disabled."}</span>
                  {blockState.blocked_by_me ? <button type="button" onClick={() => void toggleBlock()} className="shrink-0 border border-red-500 px-3 py-2 text-[10px] font-black uppercase">Unblock</button> : null}
                </div>
              ) : null}

              {showDetails ? (
                <div className="pointer-events-none fixed inset-0 z-[95] xl:hidden" aria-hidden={false}>
                  <section
                    role="dialog"
                    aria-modal="false"
                    aria-label="Conversation details"
                    style={{ height: "var(--loadlink-message-vh, 100dvh)" }}
                    className={`pointer-events-auto absolute right-0 top-0 flex w-[min(92vw,420px)] flex-col border-l shadow-[-18px_0_45px_rgba(0,0,0,.18)] ${darkMode ? "border-white/10 bg-[#0b0b0b] text-white" : "border-black/10 bg-white text-black"}`}
                  >
                    <div className={`sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b px-4 ${darkMode ? "border-white/10 bg-[#0b0b0b]" : "border-black/10 bg-white"}`}>
                      <div><strong className="text-sm font-bold">Conversation info</strong><p className={`mt-0.5 text-[9px] font-medium ${darkMode ? "text-white/45" : "text-black/45"}`}>Details and account actions</p></div>
                      <button type="button" onClick={() => setShowDetails(false)} className={`flex h-9 w-9 items-center justify-center rounded-full border text-lg ${darkMode ? "border-white/15 text-white" : "border-black/10 text-black"}`} aria-label="Close conversation info">×</button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                      <ConversationDetails darkMode={darkMode} conversation={selectedConversation} blockState={blockState} blockBusy={blockBusy} reportBusy={reportBusy} archiveBusy={archiveBusy} onToggleArchive={toggleArchive} onToggleBlock={toggleBlock} onReport={reportConversation} />
                    </div>
                  </section>
                </div>
              ) : null}

              <div
                ref={messageViewportRef}
                className={`loadlink-message-viewport loadlink-chat-wallpaper relative min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-5 md:px-8 ${darkMode ? "bg-[#090909]" : "bg-[#f6f3eb]"}`}
              >
                {messagesLoading && messages.length === 0 ? (
                  <div className="flex h-full min-h-[180px] items-center justify-center"><div className="flex items-center gap-3 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-bold text-black/55"><span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />Loading conversation…</div></div>
                ) : searchedMessages.length ? (
                  <div className="mx-auto max-w-3xl space-y-3">
                    {searchedMessages.map((message, index) => {
                      const mine = message.sender_role === selectedConversation.role;
                      const previous = searchedMessages[index - 1];
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
                              className={`relative max-w-[82%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[72%] ${
                                mine
                                  ? "rounded-br-sm bg-black text-white"
                                  : "rounded-bl-sm border border-black/5 bg-white text-black"
                              }`}
                            >
                              {message.deleted_at ? (
                                <p className={`text-sm italic ${mine ? "text-white/55" : "text-black/45"}`}>Message deleted</p>
                              ) : message.message_kind === "quote" && message.structured_payload ? (
                                <QuoteMessageCard message={message} mine={mine} canRespond={!mine} branding={quoteBranding} onRespond={(status) => void respondToQuote(message, status)} />
                              ) : message.attachment_id ? (
                                message.file_type?.startsWith("audio/") ? (
                                  <VoiceAttachment message={message} accessKey={selectedConversation.accessKey} mine={mine} onError={setError} />
                                ) : (
                                  <DocumentAttachmentCard message={message} mine={mine} onOpen={() => void downloadAttachment(message)} />
                                )
                              ) : null}
                              {!message.deleted_at && message.message_kind !== "quote" && message.body && (!message.attachment_id || message.body !== "Shared an attachment") ? (
                                <p className="whitespace-pre-wrap break-words text-sm font-medium leading-6">{message.body}</p>
                              ) : null}
                              <div className={`mt-1.5 flex items-center justify-end gap-1 text-[9px] font-semibold ${mine ? "text-white/45" : "text-black/35"}`}>
                                {message.edited_at && !message.deleted_at ? <span>edited ·</span> : null}<span>{formatClock(message.created_at)}</span>{mine ? <span aria-label="Sent">✓</span> : null}
                                {!message.deleted_at ? <button type="button" onClick={() => setMessageMenuId((current) => current === message.id ? "" : message.id)} className={`ml-1 flex h-5 w-6 items-center justify-center rounded-md text-[13px] leading-none ${mine ? "text-white/55 hover:bg-white/10" : "text-black/40 hover:bg-black/5"}`} aria-label="Message options" aria-expanded={messageMenuId === message.id}>•••</button> : null}
                              </div>
                              {!message.deleted_at && messageMenuId === message.id ? (
                                <div className={`absolute bottom-7 right-2 z-20 min-w-[126px] overflow-hidden rounded-xl border p-1 shadow-xl ${mine ? "border-white/15 bg-[#171717] text-white" : "border-black/10 bg-white text-black"}`}>
                                  <button type="button" onClick={() => { void toggleStar(message); setMessageMenuId(""); }} className={`block w-full rounded-lg px-3 py-2 text-left text-[10px] font-semibold ${mine ? "hover:bg-white/10" : "hover:bg-black/[.04]"}`}>{message.starred_by_me ? "★ Unstar" : "☆ Star"}</button>
                                  {mine && message.message_kind !== "quote" && Date.now() - new Date(message.created_at).getTime() <= 15 * 60_000 ? <><button type="button" onClick={() => { beginEdit(message); setMessageMenuId(""); }} className={`block w-full rounded-lg px-3 py-2 text-left text-[10px] font-semibold ${mine ? "hover:bg-white/10" : "hover:bg-black/[.04]"}`}>Edit</button><button type="button" onClick={() => { setMessageMenuId(""); void deleteMessage(message); }} className="block w-full rounded-lg px-3 py-2 text-left text-[10px] font-semibold text-red-500 hover:bg-red-500/10">Delete</button></> : null}
                                </div>
                              ) : null}
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
                      <h3 className="mt-5 text-2xl font-black">{chatSearch.trim() || starredOnly ? (starredOnly && !chatSearch.trim() ? "No starred messages" : "No matching messages") : "Start the conversation"}</h3>
                      <p className="mt-2 text-sm leading-6 text-black/50">{chatSearch.trim() || starredOnly ? "Try a different search or turn off the Starred filter." : "Ask about availability, location, timing, price or the requirements for this listing."}</p>
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
                className="loadlink-chat-composer border-t border-black/10 bg-white p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:p-4"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_FILE_TYPES.join(",")}
                  onChange={uploadFile}
                  className="hidden"
                />
                {editingMessageId ? <div className="mx-auto mb-2 flex max-w-3xl items-center justify-between gap-3 rounded-xl border border-black/10 bg-[#f7f4ed] px-3 py-2 text-[10px] font-bold"><span>Editing message · changes are allowed for 15 minutes after sending.</span><button type="button" onClick={() => { setEditingMessageId(""); setText(""); }} className="font-black uppercase">Cancel</button></div> : null}
                {uploading && uploadProgress ? <div className="mx-auto mb-2 max-w-3xl"><div className="h-1.5 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-[#f6b800] transition-[width]" style={{ width: `${uploadProgress}%` }} /></div><p className="mt-1 text-right text-[9px] font-bold text-black/40">Uploading {uploadProgress}%</p></div> : null}
                {failedUpload && !uploading ? <div className="mx-auto mb-2 flex max-w-3xl items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700"><span className="min-w-0 truncate">{failedUpload.file.type.startsWith("audio/") ? "Voice note" : failedUpload.file.name} failed to send.</span><span className="flex shrink-0 gap-2"><button type="button" onClick={() => void sendAttachment(failedUpload.file, failedUpload.caption)} className="rounded-lg bg-red-600 px-3 py-1.5 font-black text-white">Retry</button><button type="button" onClick={() => setFailedUpload(null)} className="rounded-lg border border-red-300 px-2 py-1.5 font-black">Dismiss</button></span></div> : null}
                <div className="mx-auto flex max-w-3xl items-end gap-2">
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setComposerActionsOpen((value) => !value)}
                      disabled={sending || uploading || dailyLimitReached || conversationBlocked || potentialDealPending || potentialDealDeclined}
                      className={`flex h-11 w-11 items-center justify-center rounded-full border text-xl font-light disabled:opacity-40 ${composerActionsOpen ? "border-black bg-black text-white" : "border-black/10 bg-[#f3f0e8] text-black"}`}
                      aria-label="Open message actions"
                      aria-expanded={composerActionsOpen}
                    >
                      {composerActionsOpen ? "×" : "+"}
                    </button>
                    {composerActionsOpen ? (
                      <div className="absolute bottom-[calc(100%+.5rem)] left-0 z-30 w-48 overflow-hidden rounded-2xl border border-black/10 bg-white p-1.5 shadow-xl">
                        <button type="button" onClick={() => { setComposerActionsOpen(false); fileInputRef.current?.click(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-black/[.04]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f3f0e8]"><PaperclipIcon /></span><span className="min-w-0"><span className="block text-xs font-semibold">Attach file</span><span className="mt-0.5 block text-[9px] font-medium text-black/40">Photos and documents · 5 MB max</span></span></button>
                        <LogisticsMessageTools
                          threadId={selectedConversation.id}
                          listingTitle={selectedConversation.listing_title}
                          role={selectedConversation.role}
                          darkMode={darkMode}
                          disabled={sending || uploading || dailyLimitReached || conversationBlocked || potentialDealPending || potentialDealDeclined}
                          trigger="menu"
                          onClose={() => setComposerActionsOpen(false)}
                          onSendQuote={sendStructuredQuote}
                          onInsert={(message) => updateTyping(text.trim() ? `${text.trim()}

${message}` : message)}
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-[#f6f4ee] px-3.5 py-2 focus-within:border-[#f6b800] focus-within:bg-white">
                    <textarea
                      value={text}
                      onChange={(event) => updateTyping(event.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      data-loadlink-message-composer="true"
                      placeholder={
                        potentialDealDeclined
                          ? "Potential deal declined"
                          : potentialDealPending
                            ? "Accept this potential deal to reply"
                            : conversationBlocked
                          ? "Messaging is blocked"
                          : dailyLimitReached
                            ? "Daily free message limit reached"
                            : recording
                              ? "Recording voice note…"
                              : uploading
                                ? "Sending attachment…"
                                : "Message"
                      }
                      rows={1}
                      maxLength={4000}
                      disabled={sending || uploading || dailyLimitReached || conversationBlocked || potentialDealPending || potentialDealDeclined}
                      className="max-h-28 min-h-7 w-full resize-none bg-transparent py-1 text-sm font-medium outline-none placeholder:text-black/35 disabled:opacity-50"
                    />
                  </div>
                  {text.trim() || editingMessageId ? (
                    <button
                      type="submit"
                      disabled={!text.trim() || sending || uploading || dailyLimitReached || conversationBlocked || potentialDealPending || potentialDealDeclined}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f6b800] text-black shadow-sm transition active:scale-95 disabled:bg-black/10 disabled:text-black/25"
                      aria-label={editingMessageId ? "Save edited message" : "Send message"}
                    >
                      {sending ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black" /> : <SendIcon />}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => recording ? stopRecording(false) : void startRecording()}
                      disabled={sending || uploading || dailyLimitReached || conversationBlocked || potentialDealPending || potentialDealDeclined}
                      className={`flex h-11 shrink-0 items-center justify-center rounded-full border text-xs font-black ${recording ? "min-w-[76px] border-red-500 bg-red-500 px-3 text-white" : "w-11 border-black/10 bg-[#f3f0e8] text-black"} disabled:opacity-40`}
                      aria-label={recording ? "Stop and send voice note" : "Record voice note"}
                    >
                      {recording ? recordingTime(recordingSeconds) : <MicrophoneIcon />}
                    </button>
                  )}
                </div>
                {!isPro && messagesUsedToday >= Math.max(40, dailyMessageLimit - 10) ? (
                  <div className={`mx-auto mt-1.5 max-w-3xl text-center text-[9px] font-semibold ${dailyLimitReached ? "text-red-600" : "text-black/42"}`}>
                    {messagesUsedToday}/{dailyMessageLimit} messages used today{dailyLimitReached ? " · daily limit reached" : ""}
                  </div>
                ) : null}
              </form>
            </>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div className="max-w-md">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-black text-[#f6b800]">
                  <MessageIcon large />
                </div>
                <h2 className="mt-6 text-4xl font-black tracking-[-.05em]">
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
            <ConversationDetails darkMode={darkMode} conversation={selectedConversation} blockState={blockState} blockBusy={blockBusy} reportBusy={reportBusy} archiveBusy={archiveBusy} onToggleArchive={toggleArchive} onToggleBlock={toggleBlock} onReport={reportConversation} />
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
  const [loadFailed, setLoadFailed] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);
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
    setLoadFailed(false);
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
      setLoadFailed(true);
      onError(cleanError(error, "Voice note could not be opened. Tap Retry on the voice note."));
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
    if (audio.paused) { audio.playbackRate = playbackRate; await audio.play().catch(() => undefined); }
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
            <span className="flex items-center gap-2">{loadFailed ? <button type="button" onClick={() => void loadVoiceNote(false)} className="font-black underline">Retry</button> : null}<button type="button" onClick={() => { const next = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1; setPlaybackRate(next); if (audioRef.current) audioRef.current.playbackRate = next; }} className="rounded-full border border-current/20 px-2 py-0.5 font-black">{playbackRate}×</button><span>{duration ? timeLabel(duration) : fileSizeLabel(message.file_size)}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}

function documentKind(message: ChatMessage) {
  const name = (message.file_name || "").toLowerCase();
  if (/\bpod\b|proof[- _]?of[- _]?delivery/.test(name)) return "Proof of delivery";
  if (/invoice|tax[- _]?invoice/.test(name)) return "Invoice";
  if (/quote|quotation/.test(name)) return "Quotation";
  if (message.file_type?.startsWith("image/")) return "Photo";
  return "Document";
}

function DocumentAttachmentCard({ message, mine, onOpen }: { message: ChatMessage; mine: boolean; onOpen: () => void }) {
  const kind = documentKind(message);
  return (
    <button type="button" onClick={onOpen} className={`mb-2 w-full rounded-2xl border p-3 text-left ${mine ? "border-white/15 bg-white/10" : "border-black/10 bg-[#f7f4ed]"}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${mine ? "bg-[#f6b800] text-black" : "bg-black text-[#f6b800]"}`}><PaperclipIcon /></span>
        <span className="min-w-0 flex-1"><span className={`block text-[9px] font-black uppercase tracking-wide ${mine ? "text-white/50" : "text-black/45"}`}>{kind}</span><strong className="mt-0.5 block truncate text-xs font-black">{message.file_name || kind}</strong><span className={`mt-0.5 block text-[10px] font-semibold ${mine ? "text-white/55" : "text-black/45"}`}>{fileSizeLabel(message.file_size)} · Open</span></span>
      </div>
    </button>
  );
}

function QuoteMessageCard({ message, mine, canRespond, branding, onRespond }: { message: ChatMessage; mine: boolean; canRespond: boolean; branding: QuoteBranding; onRespond: (status: "accepted" | "declined") => void }) {
  const payload = (message.structured_payload || {}) as QuotePayload;
  const status = payload.status || "pending";
  const unitText = payload.unit === "km" ? "per km" : payload.unit === "ton" ? "per ton" : payload.unit === "day" ? "per day" : "total trip";
  const brandName = String(payload.dealership_name || branding.name || "").trim();
  const brandLogo = String(payload.dealership_logo || branding.logo || "").trim();
  const statusClass = status === "accepted" ? "bg-emerald-500/15 text-emerald-500" : status === "declined" ? "bg-red-500/15 text-red-500" : mine ? "bg-white/10 text-white/60" : "bg-black/5 text-black/55";
  return (
    <div className={`min-w-[236px] overflow-hidden rounded-2xl border ${mine ? "border-white/15 bg-white/[.06]" : "border-black/10 bg-[#fffaf0]"}`}>
      <div className={`flex items-center gap-2 border-b px-3 py-2 ${mine ? "border-white/10" : "border-black/10"}`}>
        {brandLogo ? <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1"><img src={brandLogo} alt={brandName ? `${brandName} logo` : "Dealership logo"} className="h-full w-full object-contain" /></span> : null}
        <div className="min-w-0 flex-1"><strong className="block truncate text-[10px] font-black">{brandName || "Rate quote"}</strong><span className={`block text-[8px] font-semibold ${mine ? "text-white/45" : "text-black/40"}`}>{brandName ? "Dealership quote" : "Structured quote"}</span></div>
        <span className="flex h-7 w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-white px-1.5"><img src="/images/loadlink-logo-light.png" alt="LoadLink" className="h-full w-full object-contain" /></span>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-3"><strong className="text-[10px] font-black uppercase tracking-wide">Quote</strong><span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase ${statusClass}`}>{status}</span></div>
        <p className="mt-2 text-2xl font-black">R{payload.amount || "—"} <span className={`text-[9px] font-bold ${mine ? "text-white/50" : "text-black/45"}`}>{unitText}</span></p>
        <div className={`mt-2 grid gap-1 text-[9px] font-semibold ${mine ? "text-white/65" : "text-black/60"}`}>{payload.vehicle ? <span><strong>Vehicle:</strong> {payload.vehicle}</span> : null}{payload.route ? <span><strong>Route:</strong> {payload.route}</span> : null}{payload.availability ? <span><strong>Available:</strong> {payload.availability}</span> : null}<span><strong>VAT:</strong> {(payload.vat || "not_applicable").replace("_", " ")}</span>{payload.terms ? <span><strong>Terms:</strong> {payload.terms}</span> : null}</div>
        {canRespond && status === "pending" ? <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => onRespond("declined")} className={`h-9 rounded-xl border text-[9px] font-black uppercase ${mine ? "border-white/20" : "border-black/15"}`}>Decline</button><button type="button" onClick={() => onRespond("accepted")} className="h-9 rounded-xl bg-[#f6b800] text-[9px] font-black uppercase text-black">Accept</button></div> : null}
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
  darkMode,
  conversation,
  blockState,
  blockBusy,
  reportBusy,
  archiveBusy,
  onToggleArchive,
  onToggleBlock,
  onReport,
}: {
  darkMode: boolean;
  conversation: Conversation;
  blockState: BlockState;
  blockBusy: boolean;
  reportBusy: boolean;
  archiveBusy: boolean;
  onToggleArchive: () => Promise<void>;
  onToggleBlock: () => Promise<void>;
  onReport: () => Promise<void>;
}) {
  const muted = darkMode ? "text-white/48" : "text-black/45";
  const faint = darkMode ? "text-white/35" : "text-black/35";
  const line = darkMode ? "border-white/10" : "border-black/10";
  const soft = darkMode ? "border-white/10 bg-white/[.035]" : "border-black/10 bg-black/[.02]";

  return (
    <div className={darkMode ? "text-white" : "text-black"}>
      <div className="flex items-center gap-3">
        <Avatar
          name={conversation.other_name}
          photo={conversation.other_photo}
          size="h-12 w-12"
          online={isRecentlyActive(conversation.other_last_seen)}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold">{conversation.other_name}</h3>
          <p className={`mt-0.5 truncate text-xs font-medium ${muted}`}>{activityText(conversation)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          href={`/jobs#job-${conversation.listing_id}`}
          className="flex h-10 items-center justify-center rounded-xl bg-[#f6b800] px-3 text-center text-[10px] font-bold text-black"
        >
          View listing
        </Link>
        <button
          type="button"
          onClick={() => void onToggleArchive()}
          disabled={archiveBusy}
          className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border px-3 text-[10px] font-semibold ${darkMode ? "border-white/15 text-white" : "border-black/12 text-black"} disabled:opacity-45`}
        >
          <ArchiveIcon />
          {archiveBusy ? "Saving…" : conversation.archived ? "Restore" : "Archive"}
        </button>
        <button
          type="button"
          onClick={() => void onToggleBlock()}
          disabled={blockBusy || blockState.blocked_by_other}
          className={`flex h-10 items-center justify-center rounded-xl border px-3 text-[10px] font-semibold ${blockState.blocked_by_me ? "border-red-500/50 text-red-500" : darkMode ? "border-white/15 text-white/80" : "border-black/12 text-black/75"} disabled:opacity-45`}
        >
          {blockBusy ? "Saving…" : blockState.blocked_by_me ? "Unblock" : blockState.blocked_by_other ? "Blocked" : "Block"}
        </button>
        <button
          type="button"
          onClick={() => void onReport()}
          disabled={reportBusy}
          className="flex h-10 items-center justify-center rounded-xl border border-red-500/40 px-3 text-[10px] font-semibold text-red-500 disabled:opacity-45"
        >
          {reportBusy ? "Sending…" : "Report"}
        </button>
      </div>

      {conversation.other_phone ? (
        <a href={`tel:${conversation.other_phone.replace(/\s/g, "")}`} className={`mt-2 flex h-10 items-center justify-center rounded-xl border text-[10px] font-semibold ${darkMode ? "border-white/15 text-white/80" : "border-black/12 text-black/75"}`}>
          Call contact
        </a>
      ) : null}

      <div className={`mt-5 rounded-2xl border p-4 ${soft}`}>
        <p className={`text-[9px] font-semibold uppercase tracking-[.12em] ${faint}`}>Listing</p>
        <p className="mt-1 text-sm font-semibold leading-5">{conversation.listing_title}</p>
        <div className={`my-4 border-t ${line}`} />
        <p className={`text-[9px] font-semibold uppercase tracking-[.12em] ${faint}`}>Response pattern</p>
        <p className="mt-1 text-sm font-medium leading-5">{replyText(conversation.average_reply_minutes)}</p>
        <div className={`my-4 border-t ${line}`} />
        <p className={`text-[9px] font-semibold uppercase tracking-[.12em] ${faint}`}>Privacy</p>
        <p className="mt-1 text-sm font-semibold">Private conversation</p>
        <p className={`mt-1 text-xs font-medium leading-5 ${muted}`}>Messages and attachments are visible only to participants in this conversation.</p>
        <div className={`my-4 border-t ${line}`} />
        <p className={`text-[9px] font-semibold uppercase tracking-[.12em] ${faint}`}>Messaging plan</p>
        <p className="mt-1 text-sm font-medium leading-5">
          {conversation.is_pro
            ? "Pro · unlimited daily messaging"
            : `${toCount(conversation.messages_used_today)}/${Math.max(1, toCount(conversation.daily_message_limit) || 50)} messages used today`}
        </p>
        {!conversation.is_pro ? <Link href="/account/packages" className="mt-2 inline-flex rounded-lg bg-[#f6b800] px-2.5 py-1.5 text-[9px] font-semibold text-black">View messaging plans</Link> : null}
      </div>

      <div className={`mt-4 rounded-xl border p-3 ${soft}`}>
        <p className="text-xs font-semibold">Safety reminder</p>
        <p className={`mt-1 text-[11px] font-medium leading-5 ${muted}`}>Confirm listing details before paying. Never send passwords, PINs or one-time verification codes.</p>
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

function SearchIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" /><path d="m16 16 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>; }
function BriefcaseIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16v12H4V7Zm5 0V4h6v3M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>; }

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
