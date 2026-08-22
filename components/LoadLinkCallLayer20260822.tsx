"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import LoadLinkIcon from "@/components/LoadLinkIcon";
import { supabase } from "@/lib/supabaseClient";

type CallSession = {
  session_id: string;
  max_seconds: number;
  remaining_seconds: number;
  premium: boolean;
  started_at: string;
  callee_user_id?: string;
};

type IncomingRow = {
  id: string;
  conversation_id: string;
  caller_user_id: string;
  callee_user_id: string;
  max_seconds: number;
  started_at: string;
  status: string;
  end_reason?: string | null;
};

type ContactIdentity = {
  userId: string;
  name: string;
  avatarUrl: string;
};

type SignalType = "offer" | "answer" | "ice" | "hangup";
type SignalRow = {
  signal_type: SignalType;
  payload: Record<string, unknown>;
  sender_user_id: string;
};

type InvokePayload = {
  session?: CallSession;
  state?: { remaining_seconds?: number; force_end?: boolean; status?: string };
  ok?: boolean;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STANDARD_CALL_SECONDS = 15 * 60;
const RING_TIMEOUT_MS = 35_000;
const CONNECT_TIMEOUT_MS = 25_000;
const EMPTY_CONTACT: ContactIdentity = { userId: "", name: "LoadLink contact", avatarUrl: "" };

function currentConversationId() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get("thread") || params.get("conversation") || "";
  return UUID_RE.test(value) ? value : "";
}

function validPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

function initials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase() || "LL";
}

function formatTimer(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function readHeaderIdentity(): ContactIdentity {
  const header = document.querySelector<HTMLElement>(".loadlink-chat-header");
  if (!header) return EMPTY_CONTACT;

  const image = header.querySelector<HTMLImageElement>("img");
  const candidates = Array.from(header.querySelectorAll<HTMLElement>("h1,h2,h3,strong,[data-loadlink-contact-name]"));
  const name = candidates
    .map((node) => (node.textContent || "").replace(/\s+/g, " ").trim())
    .find((value) => value && value.length <= 70 && !/activity status|search|back to|loadlink/i.test(value)) || "LoadLink contact";

  return {
    userId: "",
    name,
    avatarUrl: image?.currentSrc || image?.src || "",
  };
}

function reasonLabel(reason: string | null | undefined, contactName: string, role: "caller" | "callee") {
  const value = String(reason || "").toLowerCase();
  if (/not_answered|no_answer|ring_timeout/.test(value)) {
    return role === "caller" ? `No answer from ${contactName}` : `Missed call from ${contactName}`;
  }
  if (/declin|reject/.test(value)) {
    return role === "caller" ? `${contactName} declined the call` : "Call declined";
  }
  if (/connection_failed|network|fail|error/.test(value)) return "Call could not connect";
  if (/server_limit|limit_reached|time_limit/.test(value)) return "Call time ended";
  if (/cancel/.test(value)) return role === "caller" ? "Call cancelled" : `${contactName} cancelled the call`;
  return "Call ended";
}

async function invokeCall(body: Record<string, unknown>): Promise<InvokePayload> {
  const { data, error } = await supabase.functions.invoke("loadlink-call-service", { body });
  if (!error) return (data || {}) as InvokePayload;

  let message = error.message || "LoadLink call service is unavailable.";
  const context = (error as unknown as { context?: Response }).context;
  if (context) {
    try {
      const payload = await context.clone().json() as { error?: string };
      if (payload?.error) message = payload.error;
    } catch {}
  }
  throw new Error(message);
}

function callErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error || "");
  if (/CALL_REQUEST_NOT_ACCEPTED/i.test(raw)) return "Accept this potential deal before starting a call.";
  if (/CALL_CONVERSATION_BLOCKED/i.test(raw)) return "Calling is unavailable in this blocked conversation.";
  if (/CALL_ALREADY_ACTIVE/i.test(raw)) return "A call is already active in this conversation.";
  if (/CALL_CONTACT_NOT_BOUND/i.test(raw)) return "This conversation needs both LoadLink accounts linked before an in-app call can start.";
  if (/CALL_USER_UNAVAILABLE|ACCOUNT_ACCESS_RESTRICTED/i.test(raw)) return "This contact is currently unavailable for calls.";
  if (/CALL_CONVERSATION_UNAVAILABLE|CALL_USER_NOT_FOUND|CALL_FORBIDDEN/i.test(raw)) return "This conversation cannot start an in-app call.";
  if (/AUTH_REQUIRED|jwt|session|unauthor/i.test(raw)) return "Your sign-in session expired. Sign in again to call.";
  if (/permission|notallowed|microphone/i.test(raw)) return "Allow microphone access to use LoadLink calls.";
  if (/browser does not support/i.test(raw)) return "This browser does not support in-app audio calls.";
  return raw || "The call could not start.";
}

function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ];

  const turnUrl = process.env.NEXT_PUBLIC_LOADLINK_TURN_URL;
  const turnUsername = process.env.NEXT_PUBLIC_LOADLINK_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_LOADLINK_TURN_CREDENTIAL;
  if (turnUrl && turnUsername && turnCredential) {
    servers.push({ urls: turnUrl, username: turnUsername, credential: turnCredential });
  }
  return servers;
}

function waitForSubscription(channel: RealtimeChannel) {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("Call signalling took too long to connect."));
    }, 8_000);

    channel.subscribe((state) => {
      if (settled) return;
      if (state === "SUBSCRIBED") {
        settled = true;
        window.clearTimeout(timer);
        resolve();
      } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") {
        settled = true;
        window.clearTimeout(timer);
        reject(new Error("Call signalling could not connect."));
      }
    });
  });
}

function Avatar({ contact, size = "large" }: { contact: ContactIdentity; size?: "small" | "medium" | "large" }) {
  const dimensions = size === "small" ? "h-10 w-10" : size === "medium" ? "h-16 w-16" : "h-28 w-28";
  return (
    <div data-loadlink-call-avatar="true" className={`${dimensions} shrink-0 overflow-hidden rounded-full border border-[#f6b800]/45 bg-[#171717] text-[#f6b800] shadow-[0_18px_55px_rgba(0,0,0,.28)]`}>
      {contact.avatarUrl ? (
        <img src={contact.avatarUrl} alt="" className="block h-full w-full object-cover object-center" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xl font-black tracking-[-.04em]">{initials(contact.name)}</span>
      )}
    </div>
  );
}

export default function LoadLinkCallLayer20260822() {
  const [chooserOpen, setChooserOpen] = useState(false);
  const [chooserPhone, setChooserPhone] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [incoming, setIncoming] = useState<IncomingRow | null>(null);
  const [active, setActive] = useState<CallSession | null>(null);
  const [contact, setContact] = useState<ContactIdentity>(EMPTY_CONTACT);
  const [status, setStatus] = useState("Connecting…");
  const [remaining, setRemaining] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const userIdRef = useRef("");
  const roleRef = useRef<"caller" | "callee">("caller");
  const contactRef = useRef<ContactIdentity>(EMPTY_CONTACT);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const signalChannelRef = useRef<RealtimeChannel | null>(null);
  const sessionChannelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const durationRef = useRef<number | null>(null);
  const ringTimeoutRef = useRef<number | null>(null);
  const connectTimeoutRef = useRef<number | null>(null);
  const signalRecoveryRef = useRef<number | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const activeRef = useRef<CallSession | null>(null);
  const connectedRef = useRef(false);
  const answerSeenRef = useRef(false);
  const endingRef = useRef(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    contactRef.current = contact;
  }, [contact]);

  const dispatchHistoryUpdate = useCallback(() => {
    window.dispatchEvent(new CustomEvent("loadlink-call-history-updated", {
      detail: { conversationId: conversationId || incoming?.conversation_id || currentConversationId() },
    }));
  }, [conversationId, incoming?.conversation_id]);

  const clearTimer = (ref: React.MutableRefObject<number | null>) => {
    if (ref.current) window.clearInterval(ref.current);
    ref.current = null;
  };

  const clearTimeoutRef = (ref: React.MutableRefObject<number | null>) => {
    if (ref.current) window.clearTimeout(ref.current);
    ref.current = null;
  };

  const endLocal = useCallback((message = "Call ended") => {
    clearTimer(heartbeatRef);
    clearTimer(countdownRef);
    clearTimer(durationRef);
    clearTimer(signalRecoveryRef);
    clearTimeoutRef(ringTimeoutRef);
    clearTimeoutRef(connectTimeoutRef);
    void signalChannelRef.current?.unsubscribe();
    void sessionChannelRef.current?.unsubscribe();
    signalChannelRef.current = null;
    sessionChannelRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.remove();
      remoteAudioRef.current = null;
    }
    pendingIceRef.current = [];
    activeRef.current = null;
    connectedRef.current = false;
    answerSeenRef.current = false;
    endingRef.current = false;
    setActive(null);
    setRemaining(0);
    setDurationSeconds(0);
    setMuted(false);
    setSpeakerOn(true);
    setMinimized(false);
    setStatus(message);
  }, []);

  const loadContactForSession = useCallback(async (sessionId: string, fallback?: ContactIdentity) => {
    if (fallback) {
      setContact(fallback);
      contactRef.current = fallback;
    }
    const { data, error } = await supabase.rpc("loadlink_call_contact_identity", { p_session_id: sessionId });
    if (error) return;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return;
    const next: ContactIdentity = {
      userId: String((row as { user_id?: string }).user_id || ""),
      name: String((row as { full_name?: string }).full_name || fallback?.name || "LoadLink contact"),
      avatarUrl: String((row as { avatar_url?: string | null }).avatar_url || fallback?.avatarUrl || ""),
    };
    setContact(next);
    contactRef.current = next;
  }, []);

  const sendSignal = useCallback(async (sessionId: string, type: SignalType, payload: Record<string, unknown>) => {
    const userId = userIdRef.current;
    if (!userId) throw new Error("Your call identity is not available yet.");
    const { error } = await supabase.from("call_signals").insert({
      session_id: sessionId,
      sender_user_id: userId,
      signal_type: type,
      payload,
    });
    if (error) throw error;
  }, []);

  const markConnected = useCallback(() => {
    if (connectedRef.current) return;
    connectedRef.current = true;
    setStatus("Connected");
    clearTimeoutRef(ringTimeoutRef);
    clearTimeoutRef(connectTimeoutRef);
    setDurationSeconds(0);
    durationRef.current = window.setInterval(() => setDurationSeconds((value) => value + 1), 1000);
  }, []);

  const terminateCurrent = useCallback(async (reason: string, label: string, shouldSignal = true) => {
    if (endingRef.current) return;
    endingRef.current = true;
    const current = activeRef.current;
    if (current) {
      if (shouldSignal) await sendSignal(current.session_id, "hangup", { reason }).catch(() => undefined);
      await invokeCall({ action: "end", session_id: current.session_id, reason }).catch(() => undefined);
    }
    dispatchHistoryUpdate();
    endLocal(label);
  }, [dispatchHistoryUpdate, endLocal, sendSignal]);

  const scheduleConnectTimeout = useCallback(() => {
    clearTimeoutRef(connectTimeoutRef);
    connectTimeoutRef.current = window.setTimeout(() => {
      if (connectedRef.current || !activeRef.current) return;
      setNotice("The audio path could not be established on this network.");
      void terminateCurrent("connection_failed", "Call could not connect");
    }, CONNECT_TIMEOUT_MS);
  }, [terminateCurrent]);

  const handleSignal = useCallback(async (sessionId: string, row: SignalRow) => {
    if (!peerRef.current || row.sender_user_id === userIdRef.current) return;
    const peer = peerRef.current;

    if (row.signal_type === "hangup") {
      const reason = String(row.payload?.reason || "ended");
      dispatchHistoryUpdate();
      endLocal(reasonLabel(reason, contactRef.current.name, roleRef.current));
      return;
    }

    if (row.signal_type === "offer" && roleRef.current === "callee") {
      if (peer.remoteDescription) return;
      await peer.setRemoteDescription(row.payload as unknown as RTCSessionDescriptionInit);
      for (const candidate of pendingIceRef.current.splice(0)) {
        await peer.addIceCandidate(candidate).catch(() => undefined);
      }
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await sendSignal(sessionId, "answer", { type: answer.type, sdp: answer.sdp ?? "" });
      answerSeenRef.current = true;
      setStatus("Connecting…");
      scheduleConnectTimeout();
      return;
    }

    if (row.signal_type === "answer" && roleRef.current === "caller") {
      if (peer.remoteDescription) return;
      await peer.setRemoteDescription(row.payload as unknown as RTCSessionDescriptionInit);
      answerSeenRef.current = true;
      clearTimeoutRef(ringTimeoutRef);
      for (const candidate of pendingIceRef.current.splice(0)) {
        await peer.addIceCandidate(candidate).catch(() => undefined);
      }
      setStatus("Connecting…");
      scheduleConnectTimeout();
      return;
    }

    if (row.signal_type === "ice") {
      const candidate = row.payload as unknown as RTCIceCandidateInit;
      if (!peer.remoteDescription) pendingIceRef.current.push(candidate);
      else await peer.addIceCandidate(candidate).catch(() => undefined);
    }
  }, [dispatchHistoryUpdate, endLocal, scheduleConnectTimeout, sendSignal]);

  const beginHeartbeat = useCallback((session: CallSession) => {
    setRemaining(session.premium ? 0 : Number(session.remaining_seconds || STANDARD_CALL_SECONDS));
    clearTimer(heartbeatRef);
    clearTimer(countdownRef);

    if (!session.premium) {
      countdownRef.current = window.setInterval(() => {
        setRemaining((value) => Math.max(0, value - 1));
      }, 1000);
    }

    heartbeatRef.current = window.setInterval(async () => {
      const current = activeRef.current;
      if (!current) return;
      try {
        const data = await invokeCall({ action: "heartbeat", session_id: current.session_id });
        if (!current.premium && data.state) setRemaining(Number(data.state.remaining_seconds || 0));
        if (data.state?.force_end) {
          dispatchHistoryUpdate();
          endLocal(data.state.status === "limit_reached" ? "Call time ended" : reasonLabel(data.state.status, contactRef.current.name, roleRef.current));
        }
      } catch {}
    }, 5000);
  }, [dispatchHistoryUpdate, endLocal]);

  const setupPeer = useCallback(async (session: CallSession, role: "caller" | "callee", fallbackContact?: ContactIdentity) => {
    roleRef.current = role;
    endingRef.current = false;
    connectedRef.current = false;
    answerSeenRef.current = false;
    setActive(session);
    activeRef.current = session;
    setMinimized(false);
    setNotice("");
    setStatus(role === "caller" ? "Calling…" : "Connecting…");
    void loadContactForSession(session.session_id, fallbackContact);

    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
      throw new Error("This browser does not support LoadLink in-app audio calls.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      video: false,
    });
    streamRef.current = stream;

    const peer = new RTCPeerConnection({
      iceServers: iceServers(),
      iceCandidatePoolSize: 10,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
    });
    peerRef.current = peer;
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.setAttribute("playsinline", "true");
    audio.style.display = "none";
    document.body.appendChild(audio);
    remoteAudioRef.current = audio;

    peer.ontrack = (event) => {
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      audio.srcObject = remoteStream;
      audio.muted = !speakerOn;
      void audio.play().catch(() => undefined);
      markConnected();
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") markConnected();
      if (peer.connectionState === "connecting") setStatus("Connecting…");
      if (peer.connectionState === "disconnected" && connectedRef.current) setStatus("Reconnecting…");
      if (peer.connectionState === "failed") {
        setNotice("The in-app audio connection failed on this network.");
        void terminateCurrent("connection_failed", "Call could not connect");
      }
    };

    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === "connected" || peer.iceConnectionState === "completed") markConnected();
      if (peer.iceConnectionState === "failed") {
        setNotice("The network could not establish a direct audio path.");
        void terminateCurrent("connection_failed", "Call could not connect");
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        void sendSignal(session.session_id, "ice", event.candidate.toJSON() as unknown as Record<string, unknown>).catch(() => undefined);
      }
    };

    const signalChannel = supabase.channel(`call-signals-v2-${session.session_id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_signals", filter: `session_id=eq.${session.session_id}` },
        (payload) => {
          void handleSignal(session.session_id, payload.new as unknown as SignalRow).catch((error) => {
            setNotice(callErrorMessage(error));
          });
        },
      );
    signalChannelRef.current = signalChannel;

    // The old call layer could miss the offer when the recipient answered during
    // the short gap between creating the channel and Realtime becoming subscribed.
    // Waiting for SUBSCRIBED before the recovery query closes that race.
    await waitForSubscription(signalChannel);

    const sessionChannel = supabase.channel(`call-session-state-v2-${session.session_id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "call_sessions", filter: `id=eq.${session.session_id}` },
        (payload) => {
          const row = payload.new as unknown as IncomingRow;
          if (row.status === "active") return;
          dispatchHistoryUpdate();
          endLocal(reasonLabel(row.end_reason || row.status, contactRef.current.name, roleRef.current));
        },
      );
    sessionChannelRef.current = sessionChannel;
    void waitForSubscription(sessionChannel).catch(() => undefined);

    const recoverSignals = async () => {
      const existing = await supabase
        .from("call_signals")
        .select("signal_type,payload,sender_user_id")
        .eq("session_id", session.session_id)
        .order("created_at", { ascending: true });
      if (!existing.error) {
        for (const row of existing.data || []) {
          await handleSignal(session.session_id, row as unknown as SignalRow).catch(() => undefined);
        }
      }
    };

    await recoverSignals();
    let recoverAttempts = 0;
    signalRecoveryRef.current = window.setInterval(() => {
      if (connectedRef.current || recoverAttempts >= 8) {
        clearTimer(signalRecoveryRef);
        return;
      }
      recoverAttempts += 1;
      void recoverSignals();
    }, 1000);

    if (role === "caller") {
      const offer = await peer.createOffer({ offerToReceiveAudio: true });
      await peer.setLocalDescription(offer);
      await sendSignal(session.session_id, "offer", { type: offer.type, sdp: offer.sdp ?? "" });
      ringTimeoutRef.current = window.setTimeout(() => {
        if (connectedRef.current || answerSeenRef.current || !activeRef.current) return;
        void terminateCurrent("not_answered", `No answer from ${contactRef.current.name}`);
      }, RING_TIMEOUT_MS);
    } else {
      scheduleConnectTimeout();
    }

    beginHeartbeat(session);
  }, [beginHeartbeat, dispatchHistoryUpdate, endLocal, handleSignal, loadContactForSession, markConnected, scheduleConnectTimeout, sendSignal, speakerOn, terminateCurrent]);

  const recoverIncoming = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("call_sessions")
      .select("id,conversation_id,caller_user_id,callee_user_id,max_seconds,started_at,status,end_reason")
      .eq("callee_user_id", userId)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data || activeRef.current) return;
    const row = data as IncomingRow;
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(row.started_at).getTime()) / 1000));
    if (elapsed > 55) {
      await invokeCall({ action: "end", session_id: row.id, reason: "not_answered" }).catch(() => undefined);
      dispatchHistoryUpdate();
      return;
    }
    if (row.max_seconds <= STANDARD_CALL_SECONDS && elapsed >= row.max_seconds) return;
    setIncoming(row);
    void loadContactForSession(row.id);
  }, [dispatchHistoryUpdate, loadContactForSession]);

  useEffect(() => {
    let incomingChannel: RealtimeChannel | null = null;
    let mounted = true;

    void supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!mounted || !user) return;
      userIdRef.current = user.id;
      void recoverIncoming(user.id);
      incomingChannel = supabase
        .channel(`incoming-calls-v2-${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "call_sessions", filter: `callee_user_id=eq.${user.id}` },
          (payload) => {
            const row = payload.new as unknown as IncomingRow;
            if (row.status === "active" && !activeRef.current) {
              setIncoming(row);
              void loadContactForSession(row.id);
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "call_sessions", filter: `callee_user_id=eq.${user.id}` },
          (payload) => {
            const row = payload.new as unknown as IncomingRow;
            setIncoming((current) => current?.id === row.id && row.status !== "active" ? null : current);
          },
        )
        .subscribe();
    });

    const auth = supabase.auth.onAuthStateChange((_event, session) => {
      userIdRef.current = session?.user?.id || "";
      if (session?.user?.id) void recoverIncoming(session.user.id);
    });

    return () => {
      mounted = false;
      void incomingChannel?.unsubscribe();
      auth.data.subscription.unsubscribe();
    };
  }, [loadContactForSession, recoverIncoming]);

  useEffect(() => {
    if (!location.pathname.startsWith("/messages")) return;

    const wireHeader = () => {
      const thread = currentConversationId();
      const header = document.querySelector<HTMLElement>(".loadlink-chat-header");
      if (!thread || !header) return;
      const phoneAnchor = header.querySelector<HTMLAnchorElement>('a[href^="tel:"]');
      if (!phoneAnchor) return;
      phoneAnchor.dataset.loadlinkCallTrigger = "true";
      phoneAnchor.dataset.loadlinkConversation = thread;
      phoneAnchor.setAttribute("aria-label", "Start LoadLink call");
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-loadlink-call-trigger="true"]')
        : null;
      if (!target) return;
      const thread = target.dataset.loadlinkConversation || currentConversationId();
      if (!UUID_RE.test(thread)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const anchor = target instanceof HTMLAnchorElement ? target : null;
      const phone = anchor?.getAttribute("href")?.replace(/^tel:/i, "") || "";
      const nextContact = readHeaderIdentity();
      setContact(nextContact);
      contactRef.current = nextContact;
      setConversationId(thread);
      setChooserPhone(validPhone(phone) ? phone : "");
      setNotice("");
      setChooserOpen(true);
    };

    wireHeader();
    const observer = new MutationObserver(wireHeader);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", onClick, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  async function startInApp() {
    const conversation = conversationId || currentConversationId();
    if (!conversation || busy) return;
    setBusy(true);
    setNotice("");
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        location.assign(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
        return;
      }
      userIdRef.current = authSession.user.id;
      const fallback = contactRef.current.name !== EMPTY_CONTACT.name ? contactRef.current : readHeaderIdentity();
      const data = await invokeCall({ action: "start", conversation_id: conversation });
      const session = data.session;
      if (!session?.session_id) throw new Error("Call could not start.");
      setChooserOpen(false);
      await setupPeer(session, "caller", fallback);
    } catch (error) {
      const message = callErrorMessage(error);
      setNotice(message);
      if (activeRef.current) await terminateCurrent("connection_failed", "Call not connected");
    } finally {
      setBusy(false);
    }
  }

  async function acceptIncoming() {
    if (!incoming || busy) return;
    const row = incoming;
    setBusy(true);
    setNotice("");
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) throw new Error("Your sign-in session expired. Sign in again to call.");
      userIdRef.current = authSession.user.id;
      const premium = row.max_seconds > STANDARD_CALL_SECONDS;
      const elapsed = Math.max(0, Math.floor((Date.now() - new Date(row.started_at).getTime()) / 1000));
      const session: CallSession = {
        session_id: row.id,
        max_seconds: row.max_seconds,
        remaining_seconds: premium ? 0 : Math.max(0, row.max_seconds - elapsed),
        premium,
        started_at: row.started_at,
      };
      const fallback = contactRef.current;
      setIncoming(null);
      await setupPeer(session, "callee", fallback);
    } catch (error) {
      const message = callErrorMessage(error);
      setNotice(message);
      if (activeRef.current) await terminateCurrent("connection_failed", "Call not connected");
    } finally {
      setBusy(false);
    }
  }

  async function declineIncoming() {
    if (!incoming || busy) return;
    const row = incoming;
    setBusy(true);
    await invokeCall({ action: "end", session_id: row.id, reason: "declined" }).catch(() => undefined);
    setIncoming(null);
    setBusy(false);
    dispatchHistoryUpdate();
  }

  function toggleMute() {
    const next = !muted;
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  }

  function toggleSpeaker() {
    const next = !speakerOn;
    setSpeakerOn(next);
    if (remoteAudioRef.current) remoteAudioRef.current.muted = !next;
  }

  const duration = formatTimer(durationSeconds);
  const remainingLabel = active && !active.premium ? `${formatTimer(remaining)} left on Standard` : "LoadLink in-app audio";

  return (
    <>
      {chooserOpen ? (
        <div data-loadlink-call-chooser="true" className="fixed inset-0 z-[2147483200] flex items-end justify-center bg-black/55 p-3 backdrop-blur-[18px] sm:items-center">
          <button className="absolute inset-0" aria-label="Close call" onClick={() => setChooserOpen(false)} />
          <section className="relative z-10 w-full max-w-[390px] rounded-[28px] border border-white/12 bg-[#101010]/94 p-5 text-white shadow-[0_28px_100px_rgba(0,0,0,.56)] backdrop-blur-3xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3.5">
                <Avatar contact={contact} size="medium" />
                <div className="min-w-0">
                  <p className="truncate text-[20px] font-black tracking-[-.035em]">{contact.name}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/48">Private LoadLink audio call</p>
                </div>
              </div>
              <button type="button" onClick={() => setChooserOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[.04] text-white/65" aria-label="Close call">
                <LoadLinkIcon name="close" size={17} strokeWidth={1.8} />
              </button>
            </div>

            {notice ? <p className="mt-4 rounded-[14px] border border-red-400/20 bg-red-400/[.07] px-3 py-2.5 text-[12px] font-bold leading-5 text-red-100">{notice}</p> : null}

            <button type="button" disabled={busy} onClick={() => void startInApp()} className="mt-5 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-[17px] bg-[#f6b800] px-4 text-[14px] font-black text-black transition active:scale-[.985] disabled:opacity-50">
              <LoadLinkIcon name="phone" size={19} strokeWidth={2} />
              {busy ? "Starting call…" : `Call ${contact.name}`}
            </button>
            {chooserPhone ? <a href={`tel:${chooserPhone}`} className="mt-2 flex min-h-[42px] w-full items-center justify-center text-[11px] font-bold text-white/45">Use phone network instead</a> : null}
          </section>
        </div>
      ) : null}

      {incoming ? (
        <div data-loadlink-call-incoming="true" className="fixed inset-0 z-[2147483250] flex items-end justify-center bg-black/62 p-4 backdrop-blur-[20px] sm:items-center">
          <section className="w-full max-w-[370px] rounded-[30px] border border-white/12 bg-[#101010]/96 p-6 text-center text-white shadow-[0_30px_100px_rgba(0,0,0,.58)] backdrop-blur-3xl">
            <div className="flex justify-center"><Avatar contact={contact} size="large" /></div>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[.16em] text-white/42">Incoming LoadLink call</p>
            <h2 className="mt-2 truncate text-[28px] font-black tracking-[-.045em]">{contact.name}</h2>
            <p className="mt-2 text-[12px] font-semibold text-white/48">In-app audio · this conversation</p>
            {notice ? <p className="mt-3 text-[12px] font-bold text-red-100">{notice}</p> : null}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button disabled={busy} onClick={() => void declineIncoming()} className="h-14 rounded-[17px] border border-red-400/35 bg-red-400/[.08] text-[13px] font-black text-red-100">Decline</button>
              <button disabled={busy} onClick={() => void acceptIncoming()} className="h-14 rounded-[17px] bg-[#f6b800] text-[13px] font-black text-black">Accept</button>
            </div>
          </section>
        </div>
      ) : null}

      {active && minimized ? (
        <div data-loadlink-call-minimized="true" className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+78px)] z-[2147483300] mx-auto flex max-w-md items-center gap-3 rounded-[19px] border border-black/10 bg-white/94 p-2.5 text-black shadow-[0_18px_55px_rgba(0,0,0,.24)] backdrop-blur-2xl dark:border-white/12 dark:bg-[#111]/94 dark:text-white">
          <button type="button" onClick={() => setMinimized(false)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <Avatar contact={contact} size="small" />
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-black">{contact.name}</span>
              <span className="mt-0.5 block truncate text-[10px] font-bold text-black/45 dark:text-white/45">{status} · {duration}</span>
            </span>
          </button>
          <button type="button" onClick={() => void terminateCurrent(connectedRef.current ? "ended" : "cancelled", "Call ended")} className="h-10 rounded-full bg-[#e34545] px-4 text-[10px] font-black uppercase text-white">End</button>
        </div>
      ) : null}

      {active && !minimized ? (
        <div data-loadlink-call-active="true" className="fixed inset-0 z-[2147483300] bg-[#050505] text-white">
          <section className="mx-auto flex min-h-[100dvh] w-full max-w-[460px] flex-col px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))]">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[.14em] text-white/35">LoadLink audio</p>
              <button onClick={() => setMinimized(true)} className="h-10 rounded-full border border-white/12 bg-white/[.04] px-4 text-[11px] font-black text-white/65">Back to chat</button>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              <Avatar contact={contact} size="large" />
              <h2 className="mt-7 max-w-full truncate text-[32px] font-black tracking-[-.05em]">{contact.name}</h2>
              <p className={`mt-2 text-[13px] font-black ${status === "Connected" ? "text-[#f6b800]" : "text-white/48"}`}>{status}</p>
              <p className="mt-5 text-[48px] font-black tracking-[-.055em] tabular-nums">{duration}</p>
              <p className="mt-2 text-[11px] font-bold text-white/38">{remainingLabel}</p>
              {notice ? <p className="mx-auto mt-5 max-w-xs rounded-[14px] border border-red-400/20 bg-red-400/[.06] px-3 py-2.5 text-[11px] font-bold leading-5 text-red-100">{notice}</p> : null}
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <button type="button" onClick={toggleMute} className={`flex min-h-[82px] flex-col items-center justify-center gap-2 rounded-[21px] border text-[11px] font-black ${muted ? "border-[#f6b800] bg-[#f6b800] text-black" : "border-white/12 bg-white/[.04]"}`}>
                <LoadLinkIcon name="mic" size={21} />
                {muted ? "Unmute" : "Mute"}
              </button>
              <button type="button" onClick={toggleSpeaker} className={`flex min-h-[82px] flex-col items-center justify-center gap-2 rounded-[21px] border text-[11px] font-black ${speakerOn ? "border-[#f6b800]/45 bg-[#f6b800]/[.08] text-[#f6b800]" : "border-white/12 bg-white/[.04] text-white/55"}`}>
                <LoadLinkIcon name="volume" size={21} />
                Speaker
              </button>
              <button type="button" onClick={() => setMinimized(true)} className="flex min-h-[82px] flex-col items-center justify-center gap-2 rounded-[21px] border border-white/12 bg-white/[.04] text-[11px] font-black">
                <LoadLinkIcon name="message" size={21} />
                Chat
              </button>
            </div>
            <button type="button" onClick={() => void terminateCurrent(connectedRef.current ? "ended" : "cancelled", "Call ended")} className="mt-3 flex min-h-[58px] w-full items-center justify-center gap-2 rounded-[19px] bg-[#e34545] text-[14px] font-black text-white shadow-[0_14px_34px_rgba(227,69,69,.22)]">
              <LoadLinkIcon name="phone" size={19} />
              End call
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
