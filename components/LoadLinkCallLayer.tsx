"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
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
};

type SignalType = "offer" | "answer" | "ice" | "hangup";
type SignalRow = { signal_type: SignalType; payload: Record<string, unknown>; sender_user_id: string };

type InvokePayload = { session?: CallSession; state?: { remaining_seconds?: number; force_end?: boolean }; ok?: boolean };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function currentConversationId() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get("thread") || params.get("conversation") || "";
  return UUID_RE.test(value) ? value : "";
}

function validPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
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
    } catch {
      // Keep the transport error when the response is not JSON.
    }
  }
  throw new Error(message);
}

function callErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error || "");
  if (/CALL_REQUEST_NOT_ACCEPTED/i.test(raw)) return "Accept this potential deal before starting a LoadLink call.";
  if (/CALL_CONVERSATION_BLOCKED/i.test(raw)) return "This conversation is blocked, so calling is unavailable.";
  if (/CALL_LIMIT_REACHED|LIMIT_REACHED/i.test(raw)) return "Today’s standard LoadLink call allowance for this conversation has been used.";
  if (/CALL_ALREADY_ACTIVE/i.test(raw)) return "A LoadLink call is already active in this conversation.";
  if (/CALL_USER_UNAVAILABLE|ACCOUNT_ACCESS_RESTRICTED/i.test(raw)) return "This LoadLink contact is currently unavailable for calls.";
  if (/CALL_CONVERSATION_UNAVAILABLE|CALL_USER_NOT_FOUND/i.test(raw)) return "This conversation is not available for an in-app call.";
  if (/AUTH_REQUIRED|jwt|session|unauthor/i.test(raw)) return "Your sign-in session expired. Sign in again to call.";
  if (/permission|notallowed|microphone/i.test(raw)) return "Microphone permission is required for a LoadLink call.";
  return raw || "The LoadLink call could not start.";
}

export default function LoadLinkCallLayer() {
  const [chooserOpen, setChooserOpen] = useState(false);
  const [chooserPhone, setChooserPhone] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [incoming, setIncoming] = useState<IncomingRow | null>(null);
  const [active, setActive] = useState<CallSession | null>(null);
  const [status, setStatus] = useState("Connecting…");
  const [remaining, setRemaining] = useState(0);
  const [muted, setMuted] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const userIdRef = useRef("");
  const roleRef = useRef<"caller" | "callee">("caller");
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const signalChannelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const activeRef = useRef<CallSession | null>(null);

  useEffect(() => { activeRef.current = active; }, [active]);

  const endLocal = useCallback((message = "Call ended") => {
    if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
    if (countdownRef.current) window.clearInterval(countdownRef.current);
    heartbeatRef.current = null;
    countdownRef.current = null;
    void signalChannelRef.current?.unsubscribe();
    signalChannelRef.current = null;
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
    setActive(null);
    setRemaining(0);
    setMuted(false);
    setStatus(message);
  }, []);

  const sendSignal = useCallback(async (sessionId: string, type: SignalType, payload: Record<string, unknown>) => {
    const userId = userIdRef.current;
    if (!userId) return;
    const { error } = await supabase.from("call_signals").insert({ session_id: sessionId, sender_user_id: userId, signal_type: type, payload });
    if (error) throw error;
  }, []);

  const handleSignal = useCallback(async (sessionId: string, row: SignalRow) => {
    if (!peerRef.current || row.sender_user_id === userIdRef.current) return;
    const peer = peerRef.current;
    if (row.signal_type === "hangup") {
      endLocal("Call ended");
      return;
    }
    if (row.signal_type === "offer" && roleRef.current === "callee") {
      await peer.setRemoteDescription(row.payload as unknown as RTCSessionDescriptionInit);
      for (const candidate of pendingIceRef.current.splice(0)) await peer.addIceCandidate(candidate).catch(() => undefined);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await sendSignal(sessionId, "answer", { type: answer.type, sdp: answer.sdp ?? "" });
      setStatus("Connecting audio…");
      return;
    }
    if (row.signal_type === "answer" && roleRef.current === "caller") {
      await peer.setRemoteDescription(row.payload as unknown as RTCSessionDescriptionInit);
      for (const candidate of pendingIceRef.current.splice(0)) await peer.addIceCandidate(candidate).catch(() => undefined);
      setStatus("Connecting audio…");
      return;
    }
    if (row.signal_type === "ice") {
      const candidate = row.payload as unknown as RTCIceCandidateInit;
      if (!peer.remoteDescription) pendingIceRef.current.push(candidate);
      else await peer.addIceCandidate(candidate).catch(() => undefined);
    }
  }, [endLocal, sendSignal]);

  const beginHeartbeat = useCallback((session: CallSession) => {
    setRemaining(Number(session.remaining_seconds || session.max_seconds || 0));
    if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
    if (countdownRef.current) window.clearInterval(countdownRef.current);
    countdownRef.current = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    heartbeatRef.current = window.setInterval(async () => {
      const current = activeRef.current;
      if (!current) return;
      try {
        const data = await invokeCall({ action: "heartbeat", session_id: current.session_id });
        if (data.state) setRemaining(Number(data.state.remaining_seconds || 0));
        if (data.state?.force_end) endLocal("Call time ended");
      } catch {
        // A temporary heartbeat failure should not instantly tear down working audio.
      }
    }, 5000);
  }, [endLocal]);

  const setupPeer = useCallback(async (session: CallSession, role: "caller" | "callee") => {
    roleRef.current = role;
    setActive(session);
    activeRef.current = session;
    setStatus(role === "caller" ? "Calling…" : "Connecting…");

    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
      throw new Error("This browser does not support LoadLink in-app audio calls.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      video: false,
    });
    streamRef.current = stream;

    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
      iceCandidatePoolSize: 4,
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
      audio.srcObject = event.streams[0];
      void audio.play().catch(() => undefined);
      setStatus("Connected");
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") setStatus("Connected");
      if (peer.connectionState === "failed") {
        setNotice("This network could not establish the in-app audio connection. Try again or use the phone network option if it is available.");
        void invokeCall({ action: "end", session_id: session.session_id, reason: "connection_failed" }).catch(() => undefined);
        endLocal("Connection failed");
      }
      if (peer.connectionState === "closed") endLocal("Call ended");
    };
    peer.onicecandidate = (event) => {
      if (event.candidate) void sendSignal(session.session_id, "ice", event.candidate.toJSON() as unknown as Record<string, unknown>).catch(() => undefined);
    };

    const channel = supabase.channel(`call-signals-${session.session_id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_signals", filter: `session_id=eq.${session.session_id}` }, (payload) => {
        void handleSignal(session.session_id, payload.new as unknown as SignalRow).catch((error) => setNotice(callErrorMessage(error)));
      })
      .subscribe();
    signalChannelRef.current = channel;

    const existing = await supabase.from("call_signals")
      .select("signal_type,payload,sender_user_id")
      .eq("session_id", session.session_id)
      .order("created_at", { ascending: true });
    if (!existing.error) {
      for (const row of existing.data || []) await handleSignal(session.session_id, row as unknown as SignalRow);
    }

    if (role === "caller") {
      const offer = await peer.createOffer({ offerToReceiveAudio: true });
      await peer.setLocalDescription(offer);
      await sendSignal(session.session_id, "offer", { type: offer.type, sdp: offer.sdp ?? "" });
    }
    beginHeartbeat(session);
  }, [beginHeartbeat, endLocal, handleSignal, sendSignal]);

  const recoverIncoming = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from("call_sessions")
      .select("id,conversation_id,caller_user_id,callee_user_id,max_seconds,started_at,status")
      .eq("callee_user_id", userId)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data || activeRef.current) return;
    const row = data as IncomingRow;
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(row.started_at).getTime()) / 1000));
    if (elapsed >= row.max_seconds) return;
    setIncoming(row);
  }, []);

  useEffect(() => {
    let sessionChannel: RealtimeChannel | null = null;
    let mounted = true;

    void supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!mounted || !user) return;
      userIdRef.current = user.id;
      void recoverIncoming(user.id);
      sessionChannel = supabase.channel(`incoming-calls-${user.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_sessions", filter: `callee_user_id=eq.${user.id}` }, (payload) => {
          const row = payload.new as unknown as IncomingRow;
          if (row.status === "active" && !activeRef.current) setIncoming(row);
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "call_sessions", filter: `callee_user_id=eq.${user.id}` }, (payload) => {
          const row = payload.new as unknown as IncomingRow;
          if (incoming?.id === row.id && row.status !== "active") setIncoming(null);
        })
        .subscribe();
    });

    const auth = supabase.auth.onAuthStateChange((_event, session) => {
      userIdRef.current = session?.user?.id || "";
      if (session?.user?.id) void recoverIncoming(session.user.id);
    });
    return () => {
      mounted = false;
      void sessionChannel?.unsubscribe();
      auth.data.subscription.unsubscribe();
    };
  }, [incoming?.id, recoverIncoming]);

  useEffect(() => {
    if (!location.pathname.startsWith("/messages")) return;

    const wireHeader = () => {
      const thread = currentConversationId();
      const header = document.querySelector<HTMLElement>(".loadlink-chat-header");
      if (!thread || !header) return;
      const actions = header.querySelector<HTMLElement>("div.flex.shrink-0.items-center.gap-2");
      if (!actions) return;

      const phoneAnchor = actions.querySelector<HTMLAnchorElement>('a[href^="tel:"]');
      if (phoneAnchor) {
        phoneAnchor.dataset.loadlinkCallTrigger = "true";
        phoneAnchor.dataset.loadlinkConversation = thread;
      }

      if (!actions.querySelector('[data-loadlink-inapp-call="true"]')) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.loadlinkInappCall = "true";
        button.dataset.loadlinkConversation = thread;
        button.className = "flex h-10 items-center justify-center rounded-full border border-[#f6b800]/55 bg-[#f6b800] px-3 text-[10px] font-black uppercase text-black md:px-4";
        button.setAttribute("aria-label", "Start LoadLink call");
        button.textContent = "LoadLink call";
        actions.insertBefore(button, actions.firstChild);
      } else {
        const button = actions.querySelector<HTMLElement>('[data-loadlink-inapp-call="true"]');
        if (button) button.dataset.loadlinkConversation = thread;
      }
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-loadlink-inapp-call="true"], [data-loadlink-call-trigger="true"]') : null;
      if (!target) return;
      const thread = target.dataset.loadlinkConversation || currentConversationId();
      if (!UUID_RE.test(thread)) return;
      event.preventDefault();
      event.stopPropagation();
      const anchor = target instanceof HTMLAnchorElement ? target : null;
      const phone = anchor?.getAttribute("href")?.replace(/^tel:/i, "") || document.querySelector<HTMLAnchorElement>('.loadlink-chat-header a[href^="tel:"]')?.getAttribute("href")?.replace(/^tel:/i, "") || "";
      setConversationId(thread);
      setChooserPhone(validPhone(phone) ? phone : "");
      setNotice("");
      setChooserOpen(true);
    };

    wireHeader();
    const observer = new MutationObserver(wireHeader);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", onClick, true);
    const onHistory = () => window.setTimeout(wireHeader, 0);
    window.addEventListener("popstate", onHistory);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onHistory);
    };
  }, []);

  async function startInApp() {
    const conversation = conversationId || currentConversationId();
    if (!conversation) return;
    setBusy(true);
    setNotice("");
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        location.assign(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
        return;
      }
      userIdRef.current = authSession.user.id;
      const data = await invokeCall({ action: "start", conversation_id: conversation });
      const session = data.session;
      if (!session?.session_id) throw new Error("Call could not start.");
      setChooserOpen(false);
      await setupPeer(session, "caller");
    } catch (error) {
      setNotice(callErrorMessage(error));
      endLocal("Call not connected");
    } finally {
      setBusy(false);
    }
  }

  async function acceptIncoming() {
    if (!incoming) return;
    setBusy(true);
    setNotice("");
    try {
      const elapsed = Math.max(0, Math.floor((Date.now() - new Date(incoming.started_at).getTime()) / 1000));
      const session: CallSession = {
        session_id: incoming.id,
        max_seconds: incoming.max_seconds,
        remaining_seconds: Math.max(0, incoming.max_seconds - elapsed),
        premium: incoming.max_seconds > 1200,
        started_at: incoming.started_at,
      };
      setIncoming(null);
      await setupPeer(session, "callee");
    } catch (error) {
      setNotice(callErrorMessage(error));
      endLocal("Call not connected");
    } finally {
      setBusy(false);
    }
  }

  async function hangup(reason = "ended") {
    const current = activeRef.current;
    if (current) {
      await sendSignal(current.session_id, "hangup", { reason }).catch(() => undefined);
      await invokeCall({ action: "end", session_id: current.session_id, reason }).catch(() => undefined);
    }
    endLocal("Call ended");
  }

  async function declineIncoming() {
    if (!incoming) return;
    await invokeCall({ action: "end", session_id: incoming.id, reason: "declined" }).catch(() => undefined);
    setIncoming(null);
  }

  function toggleMute() {
    const next = !muted;
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  }

  const timer = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

  return <>
    {chooserOpen ? <div className="fixed inset-0 z-[2147483200] flex items-end justify-center bg-black/65 p-3 sm:items-center"><button className="absolute inset-0" aria-label="Close call options" onClick={() => setChooserOpen(false)} /><section className="relative z-10 w-full max-w-sm rounded-[26px] border border-white/10 bg-[#0b0b0b] p-5 text-white shadow-2xl"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#f6b800]">LoadLink calling</p><h2 className="mt-2 text-2xl font-black">Call this contact</h2><p className="mt-2 text-sm leading-6 text-white/50">Start a private in-app audio call from this accepted LoadLink conversation.</p>{notice ? <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs font-bold leading-5 text-red-300">{notice}</p> : null}<button disabled={busy} onClick={() => void startInApp()} className="mt-5 h-12 w-full rounded-xl bg-[#f6b800] text-sm font-black text-black disabled:opacity-50">{busy ? "Starting…" : "Start LoadLink call"}</button>{chooserPhone ? <a href={`tel:${chooserPhone}`} className="mt-2 flex h-12 w-full items-center justify-center rounded-xl border border-white/15 text-sm font-black">Use phone network instead</a> : null}<p className="mt-3 text-[10px] leading-5 text-white/40">Standard in-app call time is limited. Pro and Dealer accounts receive extended call time. Network compatibility can vary by carrier.</p></section></div> : null}

    {incoming ? <div className="fixed inset-0 z-[2147483250] flex items-center justify-center bg-black/85 p-5"><section className="w-full max-w-sm text-center text-white"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#f6b800]/50 bg-[#f6b800]/10 text-2xl font-black text-[#f6b800]">LL</div><p className="mt-6 text-xs font-black uppercase tracking-[.14em] text-white/45">Incoming LoadLink call</p><h2 className="mt-2 text-3xl font-black">Logistics contact</h2>{notice ? <p className="mt-4 text-xs font-bold text-red-300">{notice}</p> : null}<div className="mt-8 grid grid-cols-2 gap-3"><button disabled={busy} onClick={() => void declineIncoming()} className="h-14 rounded-full bg-red-600 font-black">Decline</button><button disabled={busy} onClick={() => void acceptIncoming()} className="h-14 rounded-full bg-[#f6b800] font-black text-black">Accept</button></div></section></div> : null}

    {active ? <div className="fixed inset-0 z-[2147483300] flex items-center justify-center bg-[#050505] p-5 text-white"><section className="w-full max-w-sm text-center"><div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-[#f6b800]/40 bg-[#f6b800]/[.06] text-3xl font-black text-[#f6b800]">LL</div><p className="mt-6 text-xs font-black uppercase tracking-[.14em] text-white/40">LoadLink audio call</p><h2 className="mt-2 text-3xl font-black">{status}</h2><p className="mt-3 text-4xl font-black tabular-nums text-[#f6b800]">{timer}</p><p className="mt-2 text-[10px] font-bold uppercase tracking-[.1em] text-white/35">{active.premium ? "Extended Pro / Dealer call" : "Standard call"}</p>{notice ? <p className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs font-bold leading-5 text-red-300">{notice}</p> : null}<div className="mt-9 grid grid-cols-2 gap-3"><button type="button" onClick={toggleMute} className={`h-14 rounded-full border font-black ${muted ? "border-[#f6b800] bg-[#f6b800] text-black" : "border-white/15 bg-white/[.05]"}`}>{muted ? "Unmute" : "Mute"}</button><button type="button" onClick={() => void hangup()} className="h-14 rounded-full bg-red-600 font-black">End call</button></div></section></div> : null}
  </>;
}
