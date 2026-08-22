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

type ContactIdentity = { userId: string; name: string; avatarUrl: string };
type SignalType = "offer" | "answer" | "ice" | "hangup";
type SignalRow = { id?: number; signal_type: SignalType; payload: Record<string, unknown>; sender_user_id: string };
type InvokePayload = { session?: CallSession; state?: { remaining_seconds?: number; force_end?: boolean; status?: string } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STANDARD_CALL_SECONDS = 15 * 60;
const RING_TIMEOUT_MS = 35_000;
const CONNECT_TIMEOUT_MS = 30_000;
const EMPTY_CONTACT: ContactIdentity = { userId: "", name: "LoadLink contact", avatarUrl: "" };

function currentConversationId() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get("thread") || params.get("conversation") || "";
  return UUID_RE.test(value) ? value : "";
}

function formatTimer(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function initials(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "LL";
}

function readHeaderIdentity(): ContactIdentity {
  const header = document.querySelector<HTMLElement>(".loadlink-chat-header");
  if (!header) return EMPTY_CONTACT;
  const image = header.querySelector<HTMLImageElement>("img");
  const name = Array.from(header.querySelectorAll<HTMLElement>("h1,h2,h3,strong,[data-loadlink-contact-name]"))
    .map((node) => (node.textContent || "").replace(/\s+/g, " ").trim())
    .find((value) => value && value.length <= 70 && !/activity status|search|back to|loadlink/i.test(value)) || "LoadLink contact";
  return { userId: "", name, avatarUrl: image?.currentSrc || image?.src || "" };
}

function reasonLabel(reason: string | null | undefined, contactName: string, role: "caller" | "callee") {
  const value = String(reason || "").toLowerCase();
  if (/not_answered|no_answer|ring_timeout/.test(value)) return role === "caller" ? `No answer from ${contactName}` : `Missed call from ${contactName}`;
  if (/declin|reject/.test(value)) return role === "caller" ? `${contactName} declined the call` : "Call declined";
  if (/connection_failed|network|fail|error/.test(value)) return "Call could not connect";
  if (/server_limit|limit_reached|time_limit/.test(value)) return "Call time ended";
  if (/cancel/.test(value)) return role === "caller" ? "Call cancelled" : `${contactName} cancelled the call`;
  return "Call ended";
}

function callErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error || "");
  if (/CALL_REQUEST_NOT_ACCEPTED/i.test(raw)) return "Accept this potential deal before starting a call.";
  if (/CALL_CONVERSATION_BLOCKED/i.test(raw)) return "Calling is unavailable in this blocked conversation.";
  if (/CALL_ALREADY_ACTIVE/i.test(raw)) return "A call is already active in this conversation.";
  if (/CALL_CONTACT_NOT_BOUND/i.test(raw)) return "This conversation needs both LoadLink accounts linked before an in-app call can start.";
  if (/AUTH_REQUIRED|jwt|session|unauthor/i.test(raw)) return "Your sign-in session expired. Sign in again to call.";
  if (/permission|notallowed|microphone/i.test(raw)) return "Allow microphone access to use LoadLink calls.";
  return raw || "The call could not start.";
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

function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ];
  const turnUrl = process.env.NEXT_PUBLIC_LOADLINK_TURN_URL;
  const username = process.env.NEXT_PUBLIC_LOADLINK_TURN_USERNAME;
  const credential = process.env.NEXT_PUBLIC_LOADLINK_TURN_CREDENTIAL;
  if (turnUrl && username && credential) servers.push({ urls: turnUrl, username, credential });
  return servers;
}

function Avatar({ contact, size = "large" }: { contact: ContactIdentity; size?: "small" | "medium" | "large" }) {
  const dimensions = size === "small" ? "h-10 w-10" : size === "medium" ? "h-16 w-16" : "h-24 w-24";
  return (
    <div data-loadlink-call-avatar="true" className={`${dimensions} shrink-0 overflow-hidden rounded-full border border-[#f6b800]/45 bg-[#171717] text-[#f6b800]`}>
      {contact.avatarUrl ? <img src={contact.avatarUrl} alt="" className="block h-full w-full object-cover object-center" /> : <span className="flex h-full w-full items-center justify-center text-xl font-black">{initials(contact.name)}</span>}
    </div>
  );
}

export default function LoadLinkCallLayerReliable20260822() {
  const [chooserOpen, setChooserOpen] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [incoming, setIncoming] = useState<IncomingRow | null>(null);
  const [active, setActive] = useState<CallSession | null>(null);
  const [contact, setContact] = useState<ContactIdentity>(EMPTY_CONTACT);
  const [status, setStatus] = useState("Connecting…");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [remaining, setRemaining] = useState(0);

  const userIdRef = useRef("");
  const roleRef = useRef<"caller" | "callee">("caller");
  const contactRef = useRef<ContactIdentity>(EMPTY_CONTACT);
  const activeRef = useRef<CallSession | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const signalChannelRef = useRef<RealtimeChannel | null>(null);
  const incomingChannelRef = useRef<RealtimeChannel | null>(null);
  const signalPollRef = useRef<number | null>(null);
  const incomingPollRef = useRef<number | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const durationRef = useRef<number | null>(null);
  const ringTimeoutRef = useRef<number | null>(null);
  const connectTimeoutRef = useRef<number | null>(null);
  const connectedRef = useRef(false);
  const answerSeenRef = useRef(false);
  const endingRef = useRef(false);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const processedSignalIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { contactRef.current = contact; }, [contact]);

  const dispatchHistoryUpdate = useCallback(() => {
    window.dispatchEvent(new CustomEvent("loadlink-call-history-updated", { detail: { conversationId: conversationId || incoming?.conversation_id || currentConversationId() } }));
  }, [conversationId, incoming?.conversation_id]);

  const endLocal = useCallback((message = "Call ended") => {
    if (signalPollRef.current) window.clearInterval(signalPollRef.current);
    if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
    if (durationRef.current) window.clearInterval(durationRef.current);
    if (ringTimeoutRef.current) window.clearTimeout(ringTimeoutRef.current);
    if (connectTimeoutRef.current) window.clearTimeout(connectTimeoutRef.current);
    signalPollRef.current = heartbeatRef.current = durationRef.current = null;
    ringTimeoutRef.current = connectTimeoutRef.current = null;
    void signalChannelRef.current?.unsubscribe();
    signalChannelRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.remove();
      remoteAudioRef.current = null;
    }
    pendingIceRef.current = [];
    processedSignalIdsRef.current.clear();
    connectedRef.current = false;
    answerSeenRef.current = false;
    endingRef.current = false;
    activeRef.current = null;
    setActive(null);
    setStatus(message);
    setDurationSeconds(0);
    setRemaining(0);
    setMuted(false);
    setSpeakerOn(true);
    setMinimized(false);
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

  const sendSignal = useCallback(async (sessionId: string, signalType: SignalType, payload: Record<string, unknown>) => {
    if (!userIdRef.current) throw new Error("Your call identity is unavailable.");
    const { error } = await supabase.from("call_signals").insert({ session_id: sessionId, sender_user_id: userIdRef.current, signal_type: signalType, payload });
    if (error) throw error;
  }, []);

  const markConnected = useCallback(() => {
    if (connectedRef.current) return;
    connectedRef.current = true;
    setStatus("Connected");
    if (ringTimeoutRef.current) window.clearTimeout(ringTimeoutRef.current);
    if (connectTimeoutRef.current) window.clearTimeout(connectTimeoutRef.current);
    ringTimeoutRef.current = connectTimeoutRef.current = null;
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

  const handleSignal = useCallback(async (sessionId: string, row: SignalRow) => {
    if (!peerRef.current || row.sender_user_id === userIdRef.current) return;
    const signalId = Number(row.id || 0);
    if (signalId && processedSignalIdsRef.current.has(signalId)) return;
    if (signalId) processedSignalIdsRef.current.add(signalId);
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
      for (const candidate of pendingIceRef.current.splice(0)) await peer.addIceCandidate(candidate).catch(() => undefined);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await sendSignal(sessionId, "answer", { type: answer.type, sdp: answer.sdp || "" });
      answerSeenRef.current = true;
      setStatus("Connecting…");
      if (connectTimeoutRef.current) window.clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = window.setTimeout(() => {
        if (!connectedRef.current && activeRef.current) void terminateCurrent("connection_failed", "Call could not connect");
      }, CONNECT_TIMEOUT_MS);
      return;
    }

    if (row.signal_type === "answer" && roleRef.current === "caller") {
      if (peer.remoteDescription) return;
      await peer.setRemoteDescription(row.payload as unknown as RTCSessionDescriptionInit);
      answerSeenRef.current = true;
      if (ringTimeoutRef.current) window.clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
      for (const candidate of pendingIceRef.current.splice(0)) await peer.addIceCandidate(candidate).catch(() => undefined);
      setStatus("Connecting…");
      if (connectTimeoutRef.current) window.clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = window.setTimeout(() => {
        if (!connectedRef.current && activeRef.current) void terminateCurrent("connection_failed", "Call could not connect");
      }, CONNECT_TIMEOUT_MS);
      return;
    }

    if (row.signal_type === "ice") {
      const candidate = row.payload as unknown as RTCIceCandidateInit;
      if (!peer.remoteDescription) pendingIceRef.current.push(candidate);
      else await peer.addIceCandidate(candidate).catch(() => undefined);
    }
  }, [dispatchHistoryUpdate, endLocal, sendSignal, terminateCurrent]);

  const pollSignals = useCallback(async (sessionId: string) => {
    const { data, error } = await supabase.from("call_signals").select("id,signal_type,payload,sender_user_id").eq("session_id", sessionId).order("id", { ascending: true });
    if (error) return;
    for (const row of data || []) await handleSignal(sessionId, row as SignalRow).catch(() => undefined);
  }, [handleSignal]);

  const startSignalTransport = useCallback((sessionId: string) => {
    void signalChannelRef.current?.unsubscribe();
    const channel = supabase.channel(`call-signals-resilient-${sessionId}`).on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "call_signals", filter: `session_id=eq.${sessionId}` },
      (payload) => { void handleSignal(sessionId, payload.new as SignalRow).catch(() => undefined); },
    );
    signalChannelRef.current = channel;
    channel.subscribe();

    if (signalPollRef.current) window.clearInterval(signalPollRef.current);
    void pollSignals(sessionId);
    signalPollRef.current = window.setInterval(() => {
      if (!activeRef.current) return;
      void pollSignals(sessionId);
    }, 1200);
  }, [handleSignal, pollSignals]);

  const beginHeartbeat = useCallback((session: CallSession) => {
    setRemaining(session.premium ? 0 : Number(session.remaining_seconds || STANDARD_CALL_SECONDS));
    if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
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

  const setupPeer = useCallback(async (session: CallSession, role: "caller" | "callee", fallback?: ContactIdentity) => {
    roleRef.current = role;
    endingRef.current = false;
    connectedRef.current = false;
    answerSeenRef.current = false;
    processedSignalIdsRef.current.clear();
    pendingIceRef.current = [];
    setActive(session);
    activeRef.current = session;
    setStatus(role === "caller" ? "Calling…" : "Connecting…");
    setNotice("");
    setMinimized(false);
    void loadContactForSession(session.session_id, fallback);

    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") throw new Error("This browser does not support LoadLink in-app audio calls.");

    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
    localStreamRef.current = stream;

    const peer = new RTCPeerConnection({ iceServers: iceServers(), iceCandidatePoolSize: 6, bundlePolicy: "max-bundle", rtcpMuxPolicy: "require" });
    peerRef.current = peer;
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.setAttribute("playsinline", "true");
    audio.style.display = "none";
    document.body.appendChild(audio);
    remoteAudioRef.current = audio;

    peer.ontrack = (event) => {
      audio.srcObject = event.streams[0] || new MediaStream([event.track]);
      audio.muted = !speakerOn;
      void audio.play().catch(() => undefined);
      markConnected();
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") markConnected();
      else if (peer.connectionState === "connecting") setStatus("Connecting…");
      else if (peer.connectionState === "disconnected" && connectedRef.current) setStatus("Reconnecting…");
      else if (peer.connectionState === "failed") void terminateCurrent("connection_failed", "Call could not connect");
    };
    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === "connected" || peer.iceConnectionState === "completed") markConnected();
      if (peer.iceConnectionState === "failed") void terminateCurrent("connection_failed", "Call could not connect");
    };
    peer.onicecandidate = (event) => {
      if (event.candidate) void sendSignal(session.session_id, "ice", event.candidate.toJSON() as unknown as Record<string, unknown>).catch(() => undefined);
    };

    startSignalTransport(session.session_id);

    if (role === "caller") {
      const offer = await peer.createOffer({ offerToReceiveAudio: true });
      await peer.setLocalDescription(offer);
      await sendSignal(session.session_id, "offer", { type: offer.type, sdp: offer.sdp || "" });
      await pollSignals(session.session_id);
      ringTimeoutRef.current = window.setTimeout(() => {
        if (!connectedRef.current && !answerSeenRef.current && activeRef.current) void terminateCurrent("not_answered", `No answer from ${contactRef.current.name}`);
      }, RING_TIMEOUT_MS);
    } else {
      await pollSignals(session.session_id);
      connectTimeoutRef.current = window.setTimeout(() => {
        if (!connectedRef.current && activeRef.current) void terminateCurrent("connection_failed", "Call could not connect");
      }, CONNECT_TIMEOUT_MS);
    }

    beginHeartbeat(session);
  }, [beginHeartbeat, loadContactForSession, markConnected, pollSignals, sendSignal, speakerOn, startSignalTransport, terminateCurrent]);

  const recoverIncoming = useCallback(async (userId: string) => {
    if (activeRef.current) return;
    const { data, error } = await supabase.from("call_sessions").select("id,conversation_id,caller_user_id,callee_user_id,max_seconds,started_at,status,end_reason").eq("callee_user_id", userId).eq("status", "active").order("started_at", { ascending: false }).limit(1).maybeSingle();
    if (error) return;
    if (!data) {
      setIncoming(null);
      return;
    }
    const row = data as IncomingRow;
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(row.started_at).getTime()) / 1000));
    if (elapsed > 55) {
      setIncoming(null);
      return;
    }
    setIncoming(row);
    void loadContactForSession(row.id);
  }, [loadContactForSession]);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!mounted || !data.user) return;
      userIdRef.current = data.user.id;
      void recoverIncoming(data.user.id);
      incomingChannelRef.current = supabase.channel(`incoming-calls-resilient-${data.user.id}`).on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_sessions", filter: `callee_user_id=eq.${data.user.id}` },
        (payload) => {
          const row = payload.new as IncomingRow;
          if (row.status === "active" && !activeRef.current) {
            setIncoming(row);
            void loadContactForSession(row.id);
          }
        },
      ).subscribe();
      incomingPollRef.current = window.setInterval(() => void recoverIncoming(data.user!.id), 3000);
    });
    return () => {
      mounted = false;
      if (incomingPollRef.current) window.clearInterval(incomingPollRef.current);
      void incomingChannelRef.current?.unsubscribe();
    };
  }, [loadContactForSession, recoverIncoming]);

  useEffect(() => {
    if (!location.pathname.startsWith("/messages")) return;
    const wire = () => {
      const thread = currentConversationId();
      const header = document.querySelector<HTMLElement>(".loadlink-chat-header");
      const phone = header?.querySelector<HTMLAnchorElement>('a[href^="tel:"]');
      if (!thread || !phone) return;
      phone.dataset.loadlinkCallTrigger = "true";
      phone.dataset.loadlinkConversation = thread;
      phone.setAttribute("aria-label", "Start LoadLink call");
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-loadlink-call-trigger="true"]') : null;
      if (!target) return;
      const thread = target.dataset.loadlinkConversation || currentConversationId();
      if (!UUID_RE.test(thread)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const nextContact = readHeaderIdentity();
      setContact(nextContact);
      contactRef.current = nextContact;
      setConversationId(thread);
      setNotice("");
      setChooserOpen(true);
    };
    wire();
    const observer = new MutationObserver(wire);
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
      if (!authSession) throw new Error("Your sign-in session expired. Sign in again to call.");
      userIdRef.current = authSession.user.id;
      const fallback = contactRef.current.name !== EMPTY_CONTACT.name ? contactRef.current : readHeaderIdentity();
      const data = await invokeCall({ action: "start", conversation_id: conversation });
      if (!data.session?.session_id) throw new Error("Call could not start.");
      setChooserOpen(false);
      await setupPeer(data.session, "caller", fallback);
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
      const session: CallSession = { session_id: row.id, max_seconds: row.max_seconds, remaining_seconds: premium ? 0 : Math.max(0, row.max_seconds - elapsed), premium, started_at: row.started_at };
      setIncoming(null);
      await setupPeer(session, "callee", contactRef.current);
    } catch (error) {
      setNotice(callErrorMessage(error));
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
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
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
          <section className="relative z-10 w-full max-w-[390px] rounded-[24px] border border-white/12 bg-[#101010]/96 p-5 text-white shadow-[0_28px_100px_rgba(0,0,0,.56)]">
            <div className="flex items-center gap-3">
              <Avatar contact={contact} size="medium" />
              <div className="min-w-0 flex-1"><p className="truncate text-xl font-black">{contact.name}</p><p className="mt-1 text-xs text-white/48">Private LoadLink audio call</p></div>
              <button type="button" onClick={() => setChooserOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12"><LoadLinkIcon name="close" size={17} /></button>
            </div>
            {notice ? <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[.07] px-3 py-2.5 text-xs font-bold text-red-100">{notice}</p> : null}
            <button type="button" disabled={busy} onClick={() => void startInApp()} className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#f6b800] px-4 text-sm font-black text-black disabled:opacity-50"><LoadLinkIcon name="phone" size={19} />{busy ? "Starting call…" : `Call ${contact.name}`}</button>
          </section>
        </div>
      ) : null}

      {incoming ? (
        <div data-loadlink-call-incoming="true" className="fixed inset-0 z-[2147483250] flex items-end justify-center bg-black/62 p-4 backdrop-blur-[20px] sm:items-center">
          <section className="w-full max-w-[370px] rounded-[26px] border border-white/12 bg-[#101010]/96 p-6 text-center text-white">
            <div className="flex justify-center"><Avatar contact={contact} /></div>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[.14em] text-white/42">Incoming LoadLink call</p>
            <h2 className="mt-2 truncate text-2xl font-black">{contact.name}</h2>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button disabled={busy} onClick={() => void declineIncoming()} className="h-14 rounded-2xl border border-red-400/35 bg-red-400/[.08] text-sm font-black text-red-100">Decline</button>
              <button disabled={busy} onClick={() => void acceptIncoming()} className="h-14 rounded-2xl bg-[#f6b800] text-sm font-black text-black">Accept</button>
            </div>
          </section>
        </div>
      ) : null}

      {active && minimized ? (
        <div data-loadlink-call-minimized="true" className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+78px)] z-[2147483300] mx-auto flex max-w-md items-center gap-3 rounded-[18px] border border-black/10 bg-white/95 p-2.5 text-black shadow-xl dark:border-white/12 dark:bg-[#111]/95 dark:text-white">
          <button type="button" onClick={() => setMinimized(false)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><Avatar contact={contact} size="small" /><span className="min-w-0"><span className="block truncate text-xs font-black">{contact.name}</span><span className="block truncate text-[10px] opacity-50">{status} · {duration}</span></span></button>
          <button type="button" onClick={() => void terminateCurrent(connectedRef.current ? "ended" : "cancelled", "Call ended")} className="h-10 rounded-full bg-[#e34545] px-4 text-xs font-black text-white">End</button>
        </div>
      ) : null}

      {active && !minimized ? (
        <div data-loadlink-call-active="true" className="fixed inset-0 z-[2147483300] bg-[#050505] text-white">
          <section className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col px-5 pb-[calc(18px+env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]">
            <div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[.12em] text-white/35">LoadLink audio</p><button onClick={() => setMinimized(true)} className="h-10 rounded-full border border-white/12 px-4 text-xs font-black text-white/65">Back to chat</button></div>
            <div className="flex flex-1 flex-col items-center justify-center py-6 text-center"><Avatar contact={contact} /><h2 className="mt-5 max-w-full truncate text-3xl font-black">{contact.name}</h2><p className={`mt-2 text-sm font-black ${status === "Connected" ? "text-[#f6b800]" : "text-white/48"}`}>{status}</p><p className="mt-5 text-4xl font-black tabular-nums">{duration}</p><p className="mt-2 text-[11px] font-bold text-white/38">{remainingLabel}</p>{notice ? <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[.06] px-3 py-2 text-xs font-bold text-red-100">{notice}</p> : null}</div>
            <div className="grid grid-cols-3 gap-3"><button type="button" onClick={toggleMute} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-full border text-xs font-black ${muted ? "border-[#f6b800] bg-[#f6b800] text-black" : "border-white/12 bg-white/[.04]"}`}><LoadLinkIcon name="mic" size={21} />{muted ? "Unmute" : "Mute"}</button><button type="button" onClick={toggleSpeaker} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-full border text-xs font-black ${speakerOn ? "border-[#f6b800]/45 text-[#f6b800]" : "border-white/12 text-white/55"}`}><LoadLinkIcon name="volume" size={21} />Speaker</button><button type="button" onClick={() => setMinimized(true)} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-full border border-white/12 text-xs font-black"><LoadLinkIcon name="message" size={21} />Chat</button></div>
            <button type="button" onClick={() => void terminateCurrent(connectedRef.current ? "ended" : "cancelled", "Call ended")} className="mx-auto mt-5 flex min-h-[52px] w-44 items-center justify-center gap-2 rounded-full bg-[#e34545] text-sm font-black text-white"><LoadLinkIcon name="phone" size={18} />End call</button>
          </section>
        </div>
      ) : null}
    </>
  );
}
