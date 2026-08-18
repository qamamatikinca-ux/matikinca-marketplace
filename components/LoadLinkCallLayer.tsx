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

export default function LoadLinkCallLayer() {
  const [chooserPhone, setChooserPhone] = useState("");
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
    await supabase.from("call_signals").insert({ session_id: sessionId, sender_user_id: userId, signal_type: type, payload });
  }, []);

  const handleSignal = useCallback(async (sessionId: string, row: SignalRow) => {
    if (!peerRef.current || row.sender_user_id === userIdRef.current) return;
    const peer = peerRef.current;
    if (row.signal_type === "hangup") {
      endLocal("Call ended");
      return;
    }
    if (row.signal_type === "offer" && roleRef.current === "callee") {
      const description = row.payload as unknown as RTCSessionDescriptionInit;
      await peer.setRemoteDescription(description);
      for (const candidate of pendingIceRef.current.splice(0)) await peer.addIceCandidate(candidate).catch(() => undefined);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await sendSignal(sessionId, "answer", answer.toJSON() as unknown as Record<string, unknown>);
      setStatus("Connected");
      return;
    }
    if (row.signal_type === "answer" && roleRef.current === "caller") {
      const description = row.payload as unknown as RTCSessionDescriptionInit;
      await peer.setRemoteDescription(description);
      for (const candidate of pendingIceRef.current.splice(0)) await peer.addIceCandidate(candidate).catch(() => undefined);
      setStatus("Connected");
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
      const { data, error } = await supabase.functions.invoke("loadlink-call-service", { body: { action: "heartbeat", session_id: current.session_id } });
      if (error) return;
      const state = data?.state as { remaining_seconds?: number; force_end?: boolean } | undefined;
      if (state) setRemaining(Number(state.remaining_seconds || 0));
      if (state?.force_end) endLocal("20-minute call limit reached");
    }, 5000);
  }, [endLocal]);

  const setupPeer = useCallback(async (session: CallSession, role: "caller" | "callee") => {
    roleRef.current = role;
    setActive(session);
    activeRef.current = session;
    setStatus(role === "caller" ? "Calling…" : "Connecting…");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      video: false,
    });
    streamRef.current = stream;

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
    });
    peerRef.current = peer;
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.setAttribute("playsinline", "true");
    document.body.appendChild(audio);
    remoteAudioRef.current = audio;

    peer.ontrack = (event) => {
      audio.srcObject = event.streams[0];
      void audio.play().catch(() => undefined);
      setStatus("Connected");
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") setStatus("Connected");
      if (["failed", "closed"].includes(peer.connectionState)) endLocal("Call ended");
    };
    peer.onicecandidate = (event) => {
      if (event.candidate) void sendSignal(session.session_id, "ice", event.candidate.toJSON() as unknown as Record<string, unknown>);
    };

    const channel = supabase.channel(`call-signals-${session.session_id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_signals", filter: `session_id=eq.${session.session_id}` }, (payload) => {
        void handleSignal(session.session_id, payload.new as unknown as SignalRow);
      })
      .subscribe();
    signalChannelRef.current = channel;

    const existing = await supabase.from("call_signals")
      .select("signal_type,payload,sender_user_id")
      .eq("session_id", session.session_id)
      .order("created_at", { ascending: true });
    for (const row of existing.data || []) await handleSignal(session.session_id, row as unknown as SignalRow);

    if (role === "caller") {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await sendSignal(session.session_id, "offer", offer.toJSON() as unknown as Record<string, unknown>);
    }
    beginHeartbeat(session);
  }, [beginHeartbeat, endLocal, handleSignal, sendSignal]);

  useEffect(() => {
    let sessionChannel: RealtimeChannel | null = null;
    void supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      userIdRef.current = user.id;
      sessionChannel = supabase.channel(`incoming-calls-${user.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_sessions", filter: `callee_user_id=eq.${user.id}` }, (payload) => {
          const row = payload.new as unknown as IncomingRow;
          if (row.status === "active" && !activeRef.current) setIncoming(row);
        })
        .subscribe();
    });
    const auth = supabase.auth.onAuthStateChange((_event, session) => {
      userIdRef.current = session?.user?.id || "";
    });
    return () => {
      void sessionChannel?.unsubscribe();
      auth.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const intercept = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest<HTMLAnchorElement>('a[href^="tel:"]');
      if (!anchor || !location.pathname.startsWith("/messages")) return;
      const conversation = new URLSearchParams(location.search).get("conversation");
      if (!conversation || !/^[0-9a-f-]{36}$/i.test(conversation)) return;
      event.preventDefault();
      event.stopPropagation();
      setChooserPhone(anchor.href.replace(/^tel:/i, ""));
      setNotice("");
    };
    document.addEventListener("click", intercept, true);
    return () => document.removeEventListener("click", intercept, true);
  }, []);

  async function startInApp() {
    const conversation = new URLSearchParams(location.search).get("conversation");
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
      const { data, error } = await supabase.functions.invoke("loadlink-call-service", {
        body: { action: "start", conversation_id: conversation },
      });
      if (error) throw error;
      const session = data?.session as CallSession | undefined;
      if (!session?.session_id) throw new Error("Call could not start.");
      setChooserPhone("");
      await setupPeer(session, "caller");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Call could not start.");
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
      setNotice(error instanceof Error ? error.message : "Call could not connect.");
    } finally {
      setBusy(false);
    }
  }

  async function hangup(reason = "ended") {
    const current = activeRef.current;
    if (current) {
      await sendSignal(current.session_id, "hangup", { reason });
      try {
        await supabase.functions.invoke("loadlink-call-service", { body: { action: "end", session_id: current.session_id, reason } });
      } catch { /* local cleanup still wins */ }
    }
    endLocal("Call ended");
  }

  async function declineIncoming() {
    if (!incoming) return;
    try {
      await supabase.functions.invoke("loadlink-call-service", { body: { action: "end", session_id: incoming.id, reason: "declined" } });
    } catch { /* decline locally too */ }
    setIncoming(null);
  }

  function toggleMute() {
    const next = !muted;
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  }

  const timer = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

  return <>
    {chooserPhone ? <div className="fixed inset-0 z-[2147483200] flex items-end justify-center bg-black/60 p-3 sm:items-center"><button className="absolute inset-0" aria-label="Close call options" onClick={() => setChooserPhone("")} /><section className="relative z-10 w-full max-w-sm rounded-[26px] border border-white/10 bg-[#0b0b0b] p-5 text-white shadow-2xl"><h2 className="text-xl font-black">Call</h2><p className="mt-1 text-sm text-white/50">Choose how you want to call this LoadLink contact.</p>{notice ? <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs font-bold text-red-400">{notice}</p> : null}<button disabled={busy} onClick={() => void startInApp()} className="mt-5 h-12 w-full rounded-xl bg-[#f6b800] text-sm font-black text-black disabled:opacity-50">{busy ? "Starting…" : "LoadLink call"}</button><a href={`tel:${chooserPhone}`} className="mt-2 flex h-12 w-full items-center justify-center rounded-xl border border-white/15 text-sm font-black">Phone network call</a><p className="mt-3 text-[10px] leading-5 text-white/40">Standard LoadLink in-app call time is limited to 20 minutes. Pro/Dealer calls receive extended call time.</p></section></div> : null}

    {incoming ? <div className="fixed inset-0 z-[2147483250] flex items-center justify-center bg-black/80 p-5"><section className="w-full max-w-sm text-center text-white"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#f6b800]/50 bg-[#f6b800]/10 text-2xl font-black text-[#f6b800]">LL</div><p className="mt-6 text-xs font-black uppercase tracking-[.14em] text-white/45">Incoming LoadLink call</p><h2 className="mt-2 text-3xl font-black">Logistics contact</h2><div className="mt-8 grid grid-cols-2 gap-3"><button disabled={busy} onClick={() => void declineIncoming()} className="h-14 rounded-full bg-red-600 font-black">Decline</button><button disabled={busy} onClick={() => void acceptIncoming()} className="h-14 rounded-full bg-[#f6b800] font-black text-black">Accept</button></div></section></div> : null}

    {active ? <div className="fixed inset-0 z-[2147483300] flex items-center justify-center bg-[#050505] p-5 text-white"><section className="w-full max-w-sm text-center"><div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-[#f6b800]/40 bg-[#f6b800]/[.06] text-3xl font-black text-[#f6b800]">LL</div><h2 className="mt-7 text-3xl font-black">LoadLink call</h2><p className="mt-2 text-sm font-semibold text-white/45">{status}</p><p className="mt-6 text-4xl font-black tabular-nums">{timer}</p>{!active.premium ? <p className="mt-2 text-[10px] font-semibold text-white/40">Standard call time remaining</p> : <p className="mt-2 text-[10px] font-semibold text-[#f6b800]">Pro call session</p>}<div className="mt-10 flex justify-center gap-5"><button onClick={toggleMute} className={`flex h-16 w-16 items-center justify-center rounded-full border text-xs font-black ${muted ? "border-[#f6b800] bg-[#f6b800] text-black" : "border-white/15 bg-white/[.05]"}`}>{muted ? "Unmute" : "Mute"}</button><button onClick={() => void hangup()} className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-xs font-black">End</button></div></section></div> : null}
  </>;
}
