"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { describeCall, type CallHistoryRow, type CallHistorySignal, type ChatCall } from "@/lib/callHistory";

export function useChatCalls(conversationId: string) {
  const [state, setState] = useState<{ conversationId: string; userId: string; calls: ChatCall[]; error: string }>({ conversationId: "", userId: "", calls: [], error: "" });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true, busy = false, queued = false, userId = "", generation = 0, authRevision = 0;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const controller = new AbortController();
    const load = async () => {
      if (!alive || !userId || !conversationId || !navigator.onLine) return;
      if (busy) { queued = true; return; }
      busy = true;
      const identity = userId, version = generation;
      try {
        const { data, error } = await supabase.from("call_sessions")
          .select("id,conversation_id,caller_user_id,callee_user_id,started_at,ended_at,last_heartbeat_at,status,end_reason")
          .eq("conversation_id", conversationId).order("started_at", { ascending: false }).limit(100).abortSignal(controller.signal);
        if (error) throw error;
        const rows = (data || []) as CallHistoryRow[];
        let signals: CallHistorySignal[] = [];
        if (rows.length) {
          const ids = rows.map(row => row.id);
          // SDP answers can be large; history only needs their timestamp.
          const [answers, hangups] = await Promise.all([
            supabase.from("call_signals").select("session_id,signal_type,created_at").in("session_id", ids)
              .eq("signal_type", "answer").order("created_at", { ascending: true }).abortSignal(controller.signal),
            supabase.from("call_signals").select("session_id,signal_type,created_at,payload").in("session_id", ids)
              .eq("signal_type", "hangup").order("created_at", { ascending: true }).abortSignal(controller.signal),
          ]);
          if (answers.error) throw answers.error;
          if (hangups.error) throw hangups.error;
          signals = [...(answers.data || []).map(row => ({ ...row, payload: null })), ...(hangups.data || [])] as CallHistorySignal[];
        }
        if (alive && version === generation && identity === userId) setState({ conversationId, userId, calls: rows.map(row => describeCall(row, identity, signals)), error: "" });
      } catch {
        if (alive && version === generation) setState(previous => ({ ...previous, conversationId, userId, error: "Call history could not refresh." }));
      } finally { busy = false; if (queued && alive) { queued = false; void load(); } }
    };
    const bind = (nextUserId: string) => {
      if (!alive || userId === nextUserId) return;
      generation += 1; userId = nextUserId;
      if (channel) void supabase.removeChannel(channel);
      channel = null;
      setState({ conversationId, userId, calls: [], error: "" });
      if (!userId || !conversationId) return;
      channel = supabase.channel(`chat-call-history-${conversationId}-${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "call_sessions", filter: `conversation_id=eq.${conversationId}` }, () => void load())
        .subscribe();
      void load();
    };
    const initialAuthRevision = authRevision;
    void supabase.auth.getSession().then(({ data }) => { if (authRevision === initialAuthRevision) bind(data.session?.user.id || ""); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { authRevision += 1; queueMicrotask(() => bind(session?.user.id || "")); });
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    const timer = window.setInterval(refresh, 10_000);
    window.addEventListener("loadlink-call-history-updated", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive = false; controller.abort(); subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
      window.clearInterval(timer);
      window.removeEventListener("loadlink-call-history-updated", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [conversationId, retry]);
  return { calls: state.conversationId === conversationId ? state.calls : [], error: state.conversationId === conversationId ? state.error : "", retry: () => setRetry(value => value + 1) };
}
