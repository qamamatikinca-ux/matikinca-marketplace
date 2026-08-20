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
type PlanCode = "standard" | "pro" | "dealer";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STANDARD_CALL_SECONDS = 15 * 60;

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
    } catch {}
  }
  throw new Error(message);
}

function callErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error || "");
  if (/CALL_REQUEST_NOT_ACCEPTED/i.test(raw)) return "Accept this potential deal before starting a LoadLink call.";
  if (/CALL_CONVERSATION_BLOCKED/i.test(raw)) return "This conversation is blocked, so calling is unavailable.";
  if (/CALL_ALREADY_ACTIVE/i.test(raw)) return "A LoadLink call is already active in this conversation.";
  if (/CALL_USER_UNAVAILABLE|ACCOUNT_ACCESS_RESTRICTED/i.test(raw)) return "This LoadLink contact is currently unavailable for calls.";
  if (/CALL_CONVERSATION_UNAVAILABLE|CALL_USER_NOT_FOUND/i.test(raw)) return "This conversation is not available for an in-app call.";
  if (/AUTH_REQUIRED|jwt|session|unauthor/i.test(raw)) return "Your sign-in session expired. Sign in again to call.";
  if (/permission|notallowed|microphone/i.test(raw)) return "Microphone permission is required for a LoadLink call.";
  return raw || "The LoadLink call could not start.";
}

function PhoneGlyph() {
  return <svg viewBox="0 0 24 24" width="21" height="21" fill="none" aria-hidden="true"><path d="M6.5 3.8 9 3l2.1 5-1.7 1.5c1 2.1 2.9 4 5 5l1.5-1.7 5 2.1-.8 2.5c-.4 1.2-1.5 2-2.8 2C10.2 19.4 4.6 13.8 4.6 6.6c0-1.3.8-2.4 1.9-2.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>;
}
function MicGlyph() { return <svg viewBox="0 0 24 24" width="21" height="21" fill="none" aria-hidden="true"><rect x="8" y="3" width="8" height="12" rx="4" stroke="currentColor" strokeWidth="1.8"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>; }
function SpeakerGlyph() { return <svg viewBox="0 0 24 24" width="21" height="21" fill="none" aria-hidden="true"><path d="M4 10h4l5-4v12l-5-4H4v-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M16 9.2c1.5 1.6 1.5 4 0 5.6M18.5 7c2.8 2.8 2.8 7.2 0 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>; }
function ChatGlyph() { return <svg viewBox="0 0 24 24" width="21" height="21" fill="none" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M8 9h8M8 12.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>; }

export default function LoadLinkCallLayer() {
  const [chooserOpen, setChooserOpen] = useState(false);
  const [chooserPhone, setChooserPhone] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [incoming, setIncoming] = useState<IncomingRow | null>(null);
  const [active, setActive] = useState<CallSession | null>(null);
  const [status, setStatus] = useState("Connecting…");
  const [remaining, setRemaining] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [plan, setPlan] = useState<PlanCode>("standard");
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
    setSpeakerOn(true);
    setMinimized(false);
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
    if (row.signal_type === "hangup") { endLocal("Call ended"); return; }
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
    setRemaining(session.premium ? 0 : Number(session.remaining_seconds || STANDARD_CALL_SECONDS));
    if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
    if (countdownRef.current) window.clearInterval(countdownRef.current);
    if (!session.premium) countdownRef.current = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    heartbeatRef.current = window.setInterval(async () => {
      const current = activeRef.current;
      if (!current) return;
      try {
        const data = await invokeCall({ action: "heartbeat", session_id: current.session_id });
        if (!current.premium && data.state) setRemaining(Number(data.state.remaining_seconds || 0));
        if (data.state?.force_end) endLocal("Call time ended");
      } catch {}
    }, 5000);
  }, [endLocal]);

  const setupPeer = useCallback(async (session: CallSession, role: "caller" | "callee") => {
    roleRef.current = role;
    setActive(session);
    activeRef.current = session;
    setMinimized(false);
    setStatus(role === "caller" ? "Calling…" : "Connecting…");
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") throw new Error("This browser does not support LoadLink in-app audio calls.");

    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }, video: false });
    streamRef.current = stream;
    const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }], iceCandidatePoolSize: 4 });
    peerRef.current = peer;
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.setAttribute("playsinline", "true");
    audio.style.display = "none";
    document.body.appendChild(audio);
    remoteAudioRef.current = audio;
    peer.ontrack = (event) => { audio.srcObject = event.streams[0]; audio.muted = !speakerOn; void audio.play().catch(() => undefined); setStatus("Connected"); };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") setStatus("Connected");
      if (peer.connectionState === "failed") {
        setNotice("This network could not establish the in-app audio connection. Try again or use the phone network option.");
        void invokeCall({ action: "end", session_id: session.session_id, reason: "connection_failed" }).catch(() => undefined);
        endLocal("Connection failed");
      }
      if (peer.connectionState === "closed") endLocal("Call ended");
    };
    peer.onicecandidate = (event) => { if (event.candidate) void sendSignal(session.session_id, "ice", event.candidate.toJSON() as unknown as Record<string, unknown>).catch(() => undefined); };

    const channel = supabase.channel(`call-signals-${session.session_id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_signals", filter: `session_id=eq.${session.session_id}` }, (payload) => {
        void handleSignal(session.session_id, payload.new as unknown as SignalRow).catch((error) => setNotice(callErrorMessage(error)));
      }).subscribe();
    signalChannelRef.current = channel;

    const existing = await supabase.from("call_signals").select("signal_type,payload,sender_user_id").eq("session_id", session.session_id).order("created_at", { ascending: true });
    if (!existing.error) for (const row of existing.data || []) await handleSignal(session.session_id, row as unknown as SignalRow);
    if (role === "caller") {
      const offer = await peer.createOffer({ offerToReceiveAudio: true });
      await peer.setLocalDescription(offer);
      await sendSignal(session.session_id, "offer", { type: offer.type, sdp: offer.sdp ?? "" });
    }
    beginHeartbeat(session);
  }, [beginHeartbeat, endLocal, handleSignal, sendSignal, speakerOn]);

  const recoverIncoming = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from("call_sessions").select("id,conversation_id,caller_user_id,callee_user_id,max_seconds,started_at,status").eq("callee_user_id", userId).eq("status", "active").order("started_at", { ascending: false }).limit(1).maybeSingle();
    if (error || !data || activeRef.current) return;
    const row = data as IncomingRow;
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(row.started_at).getTime()) / 1000));
    if (row.max_seconds <= STANDARD_CALL_SECONDS && elapsed >= row.max_seconds) return;
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
        }).subscribe();
    });
    const auth = supabase.auth.onAuthStateChange((_event, session) => { userIdRef.current = session?.user?.id || ""; if (session?.user?.id) void recoverIncoming(session.user.id); });
    return () => { mounted = false; void sessionChannel?.unsubscribe(); auth.data.subscription.unsubscribe(); };
  }, [incoming?.id, recoverIncoming]);

  useEffect(() => {
    if (!location.pathname.startsWith("/messages")) return;
    const wireHeader = () => {
      const thread = currentConversationId();
      const header = document.querySelector<HTMLElement>(".loadlink-chat-header");
      if (!thread || !header) return;
      header.querySelectorAll<HTMLElement>('[data-loadlink-inapp-call="true"]').forEach((node) => node.remove());
      const phoneAnchor = header.querySelector<HTMLAnchorElement>('a[href^="tel:"]');
      if (phoneAnchor) {
        phoneAnchor.dataset.loadlinkCallTrigger = "true";
        phoneAnchor.dataset.loadlinkConversation = thread;
        phoneAnchor.setAttribute("aria-label", "Call contact");
      }
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-loadlink-call-trigger="true"]') : null;
      if (!target) return;
      const thread = target.dataset.loadlinkConversation || currentConversationId();
      if (!UUID_RE.test(thread)) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      const anchor = target instanceof HTMLAnchorElement ? target : null;
      const phone = anchor?.getAttribute("href")?.replace(/^tel:/i, "") || "";
      setConversationId(thread); setChooserPhone(validPhone(phone) ? phone : ""); setNotice(""); setChooserOpen(true);
      void supabase.rpc("loadlink_active_plan").then(({ data }) => setPlan(data === "dealer" ? "dealer" : data === "pro" ? "pro" : "standard"));
    };
    wireHeader();
    const observer = new MutationObserver(wireHeader); observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", onClick, true);
    return () => { observer.disconnect(); document.removeEventListener("click", onClick, true); };
  }, []);

  async function startInApp() {
    const conversation = conversationId || currentConversationId(); if (!conversation) return;
    setBusy(true); setNotice("");
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) { location.assign(`/login?next=${encodeURIComponent(location.pathname + location.search)}`); return; }
      userIdRef.current = authSession.user.id;
      const data = await invokeCall({ action: "start", conversation_id: conversation });
      const session = data.session; if (!session?.session_id) throw new Error("Call could not start.");
      setChooserOpen(false); await setupPeer(session, "caller");
    } catch (error) { setNotice(callErrorMessage(error)); endLocal("Call not connected"); } finally { setBusy(false); }
  }

  async function acceptIncoming() {
    if (!incoming) return; setBusy(true); setNotice("");
    try {
      const premium = incoming.max_seconds > STANDARD_CALL_SECONDS;
      const elapsed = Math.max(0, Math.floor((Date.now() - new Date(incoming.started_at).getTime()) / 1000));
      const session: CallSession = { session_id: incoming.id, max_seconds: incoming.max_seconds, remaining_seconds: premium ? 0 : Math.max(0, incoming.max_seconds - elapsed), premium, started_at: incoming.started_at };
      setIncoming(null); await setupPeer(session, "callee");
    } catch (error) { setNotice(callErrorMessage(error)); endLocal("Call not connected"); } finally { setBusy(false); }
  }

  async function hangup(reason = "ended") {
    const current = activeRef.current;
    if (current) { await sendSignal(current.session_id, "hangup", { reason }).catch(() => undefined); await invokeCall({ action: "end", session_id: current.session_id, reason }).catch(() => undefined); }
    endLocal("Call ended");
  }
  async function declineIncoming() { if (!incoming) return; await invokeCall({ action: "end", session_id: incoming.id, reason: "declined" }).catch(() => undefined); setIncoming(null); }
  function toggleMute() { const next = !muted; streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; }); setMuted(next); }
  function toggleSpeaker() { const next = !speakerOn; setSpeakerOn(next); if (remoteAudioRef.current) remoteAudioRef.current.muted = !next; }

  const timer = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  const premiumPlan = plan === "pro" || plan === "dealer";

  return <>
    {chooserOpen ? <div className="fixed inset-0 z-[2147483200] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center"><button className="absolute inset-0" aria-label="Close call options" onClick={() => setChooserOpen(false)} /><section className="relative z-10 w-full max-w-[410px] overflow-hidden rounded-[30px] border border-white/12 bg-[#090909] text-white shadow-[0_30px_100px_rgba(0,0,0,.55)]"><div className="border-b border-white/8 px-5 pb-5 pt-5"><div className="flex items-center justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f6b800] text-black"><PhoneGlyph /></div><button onClick={() => setChooserOpen(false)} className="h-10 w-10 rounded-full border border-white/12 text-xl text-white/75">×</button></div><p className="mt-5 text-[10px] font-black uppercase tracking-[.15em] text-[#f6b800]">Call options</p><h2 className="mt-1 text-[26px] font-black tracking-[-.035em]">Call this LoadLink contact</h2><p className="mt-2 text-xs font-semibold leading-5 text-white/50">Private in-app audio. Your plan decides the call-time limit.</p></div><div className="grid gap-2 p-4"><div className={`rounded-[20px] border p-4 ${!premiumPlan ? "border-[#f6b800]/65 bg-[#f6b800]/[.07]" : "border-white/10 bg-white/[.025]"}`}><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black">Standard</p><p className="mt-1 text-xs font-semibold text-white/48">Free LoadLink call · 15 minutes per call</p></div>{!premiumPlan ? <span className="rounded-full bg-[#f6b800] px-2.5 py-1 text-[9px] font-black uppercase text-black">Your plan</span> : null}</div></div><div className={`rounded-[20px] border p-4 ${premiumPlan ? "border-[#f6b800]/65 bg-[#f6b800]/[.07]" : "border-white/10 bg-white/[.025]"}`}><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black">Pro + Dealer</p><p className="mt-1 text-xs font-semibold text-white/48">Unlimited LoadLink calls</p></div>{premiumPlan ? <span className="rounded-full bg-[#f6b800] px-2.5 py-1 text-[9px] font-black uppercase text-black">Your plan</span> : <a href="/packages" className="rounded-full border border-white/15 px-2.5 py-1 text-[9px] font-black uppercase text-white/70">View plans</a>}</div></div>{notice ? <p className="rounded-2xl border border-red-500/20 bg-red-500/[.06] p-3 text-xs font-bold leading-5 text-red-300">{notice}</p> : null}<button disabled={busy} onClick={() => void startInApp()} className="mt-1 h-13 min-h-[52px] w-full rounded-[18px] bg-[#f6b800] text-sm font-black text-black disabled:opacity-50">{busy ? "Starting…" : premiumPlan ? "Start unlimited LoadLink call" : "Start free 15-minute call"}</button>{chooserPhone ? <a href={`tel:${chooserPhone}`} className="flex min-h-[48px] w-full items-center justify-center rounded-[18px] border border-white/12 text-xs font-black text-white/75">Use phone network instead</a> : null}</div></section></div> : null}

    {incoming ? <div className="fixed inset-0 z-[2147483250] flex items-end justify-center bg-black/78 p-4 backdrop-blur-md sm:items-center"><section className="w-full max-w-sm rounded-[30px] border border-white/10 bg-[#090909] p-6 text-center text-white shadow-2xl"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#f6b800]/45 bg-[#f6b800]/10 text-[#f6b800]"><PhoneGlyph /></div><p className="mt-5 text-[10px] font-black uppercase tracking-[.15em] text-[#f6b800]">Incoming LoadLink call</p><h2 className="mt-2 text-2xl font-black">Logistics contact</h2><p className="mt-2 text-xs font-semibold text-white/45">{incoming.max_seconds > STANDARD_CALL_SECONDS ? "Unlimited Pro / Dealer call" : "Standard · up to 15 minutes"}</p>{notice ? <p className="mt-4 text-xs font-bold text-red-300">{notice}</p> : null}<div className="mt-7 grid grid-cols-2 gap-3"><button disabled={busy} onClick={() => void declineIncoming()} className="h-14 rounded-[18px] border border-red-500/35 bg-red-500/10 font-black text-red-300">Decline</button><button disabled={busy} onClick={() => void acceptIncoming()} className="h-14 rounded-[18px] bg-[#f6b800] font-black text-black">Accept</button></div></section></div> : null}

    {active && minimized ? <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+78px)] z-[2147483300] mx-auto flex max-w-md items-center gap-3 rounded-[22px] border border-black/10 bg-white/95 p-2.5 text-black shadow-[0_18px_55px_rgba(0,0,0,.28)] backdrop-blur-xl dark:border-white/12 dark:bg-[#111]/95 dark:text-white"><button type="button" onClick={() => setMinimized(false)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f6b800] text-black"><PhoneGlyph /></span><span className="min-w-0"><span className="block truncate text-xs font-black">{status}</span><span className="mt-0.5 block text-[10px] font-bold text-black/45 dark:text-white/45">{active.premium ? "Unlimited call" : timer}</span></span></button><button type="button" onClick={() => void hangup()} className="h-10 rounded-full bg-red-600 px-4 text-[10px] font-black uppercase text-white">End</button></div> : null}

    {active && !minimized ? <div className="fixed inset-0 z-[2147483300] flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(246,184,0,.14),transparent_38%),#050505] p-5 text-white"><section className="w-full max-w-[390px]"><div className="flex items-center justify-between"><span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-white/55">Private audio</span><button onClick={() => setMinimized(true)} className="h-10 rounded-full border border-white/12 px-4 text-[10px] font-black text-white/70">Back to chat</button></div><div className="py-12 text-center"><div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-[#f6b800]/35 bg-[#f6b800]/[.07] text-[#f6b800] shadow-[0_0_70px_rgba(246,184,0,.08)]"><PhoneGlyph /></div><p className="mt-6 text-[10px] font-black uppercase tracking-[.16em] text-[#f6b800]">LoadLink audio</p><h2 className="mt-2 text-[30px] font-black tracking-[-.04em]">{status}</h2><p className="mt-3 text-4xl font-black tabular-nums">{active.premium ? "Unlimited" : timer}</p><p className="mt-2 text-[10px] font-bold uppercase tracking-[.1em] text-white/38">{active.premium ? "Pro / Dealer" : "Standard · 15 min maximum"}</p>{notice ? <p className="mx-auto mt-5 max-w-xs rounded-2xl border border-red-500/20 bg-red-500/[.06] p-3 text-xs font-bold leading-5 text-red-300">{notice}</p> : null}</div><div className="grid grid-cols-3 gap-3"><button type="button" onClick={toggleMute} className={`flex min-h-[78px] flex-col items-center justify-center gap-2 rounded-[22px] border text-[10px] font-black ${muted ? "border-[#f6b800] bg-[#f6b800] text-black" : "border-white/12 bg-white/[.04]"}`}><MicGlyph />{muted ? "Unmute" : "Mute"}</button><button type="button" onClick={toggleSpeaker} className={`flex min-h-[78px] flex-col items-center justify-center gap-2 rounded-[22px] border text-[10px] font-black ${speakerOn ? "border-[#f6b800]/55 bg-[#f6b800]/10 text-[#f6b800]" : "border-white/12 bg-white/[.04] text-white/55"}`}><SpeakerGlyph />{speakerOn ? "Speaker on" : "Speaker off"}</button><button type="button" onClick={() => setMinimized(true)} className="flex min-h-[78px] flex-col items-center justify-center gap-2 rounded-[22px] border border-white/12 bg-white/[.04] text-[10px] font-black"><ChatGlyph />Chat</button></div><button type="button" onClick={() => void hangup()} className="mt-4 flex min-h-[58px] w-full items-center justify-center gap-2 rounded-[20px] bg-red-600 text-sm font-black text-white"><PhoneGlyph />End call</button></section></div> : null}
  </>;
}
