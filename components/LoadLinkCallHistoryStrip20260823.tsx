"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import LoadLinkIcon from "@/components/LoadLinkIcon";
import { supabase } from "@/lib/supabaseClient";

type CallRow = {
  id: string;
  caller_user_id: string;
  callee_user_id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  end_reason: string | null;
};
type ContactIdentity = { name: string; avatarUrl: string };
type AnswerRow = { session_id: string; created_at: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function durationLabel(answeredAt: string | undefined, endedAt: string | null) {
  if (!answeredAt || !endedAt) return "No audio connection";
  const seconds = Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(answeredAt).getTime()) / 1000));
  if (seconds < 2) return "Connected briefly";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes}m ${rest}s` : `${minutes} min`;
}

function hasFailureReason(reason: string) {
  return /not_answered|no_answer|ring_timeout|declin|reject|connection_failed|network|fail|error|cancel/.test(reason);
}

function titleFor(row: CallRow, outgoing: boolean, contactName: string, answered: boolean) {
  const reason = String(row.end_reason || row.status || "").toLowerCase();
  if (!answered && !hasFailureReason(reason)) return outgoing ? `Call not answered by ${contactName}` : `Missed call from ${contactName}`;
  if (/not_answered|no_answer|ring_timeout/.test(reason)) return outgoing ? `Call not answered by ${contactName}` : `Missed call from ${contactName}`;
  if (/declin|reject/.test(reason)) return outgoing ? `${contactName} declined the call` : `You declined ${contactName}'s call`;
  if (/connection_failed|network|fail|error/.test(reason)) return `Call with ${contactName} could not connect`;
  if (/cancel/.test(reason)) return outgoing ? `Call to ${contactName} cancelled` : `${contactName} cancelled the call`;
  if (/server_limit|limit_reached|time_limit/.test(reason)) return `Call with ${contactName} reached the time limit`;
  return outgoing ? `Outgoing call with ${contactName}` : `Incoming call from ${contactName}`;
}

export default function LoadLinkCallHistoryStrip20260823() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [rows, setRows] = useState<CallRow[]>([]);
  const [userId, setUserId] = useState("");
  const [thread, setThread] = useState("");
  const [identities, setIdentities] = useState<Record<string, ContactIdentity>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!window.location.pathname.startsWith("/messages")) return;
    let active = true;
    let timer = 0;

    const findHost = () => {
      const viewport = document.querySelector<HTMLElement>(".loadlink-message-viewport");
      if (!viewport) return;
      let node = viewport.querySelector<HTMLElement>(":scope > [data-loadlink-call-history-host]");
      if (!node) {
        node = document.createElement("div");
        node.dataset.loadlinkCallHistoryHost = "true";
        node.setAttribute("aria-live", "polite");
        node.setAttribute("role", "log");
        viewport.appendChild(node);
      }
      if (active) setHost(node);
    };

    const load = async () => {
      const params = new URLSearchParams(window.location.search);
      const conversation = params.get("thread") || params.get("conversation") || "";
      findHost();
      if (!UUID_RE.test(conversation)) {
        if (active) { setThread(""); setRows([]); setIdentities({}); setAnswers({}); }
        return;
      }

      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id || "";
      if (!uid) return;
      if (active) { setUserId(uid); setThread(conversation); }

      const { data, error } = await supabase
        .from("call_sessions")
        .select("id,caller_user_id,callee_user_id,started_at,ended_at,status,end_reason")
        .eq("conversation_id", conversation)
        .neq("status", "active")
        .order("started_at", { ascending: false })
        .limit(4);
      if (error || !active) return;

      const rawRows = (data || []) as CallRow[];
      const sessionIds = rawRows.map((row) => row.id);
      const answerTimes: Record<string, string> = {};
      if (sessionIds.length) {
        const { data: answerData } = await supabase
          .from("call_signals")
          .select("session_id,created_at")
          .in("session_id", sessionIds)
          .eq("signal_type", "answer")
          .order("created_at", { ascending: true });
        ((answerData || []) as AnswerRow[]).forEach((answer) => {
          if (!answerTimes[answer.session_id]) answerTimes[answer.session_id] = answer.created_at;
        });
      }

      const nextRows = rawRows.map((row) => {
        const reason = String(row.end_reason || row.status || "").toLowerCase();
        return !answerTimes[row.id] && !hasFailureReason(reason) ? { ...row, end_reason: "not_answered" } : row;
      });
      const identityPairs = await Promise.all(nextRows.map(async (row) => {
        const { data: identityData } = await supabase.rpc("loadlink_call_contact_identity", { p_session_id: row.id });
        const identity = Array.isArray(identityData) ? identityData[0] : identityData;
        return [row.id, {
          name: String((identity as { full_name?: string } | null)?.full_name || "LoadLink contact"),
          avatarUrl: String((identity as { avatar_url?: string | null } | null)?.avatar_url || ""),
        }] as const;
      }));

      if (active) {
        setRows(nextRows);
        setAnswers(answerTimes);
        setIdentities(Object.fromEntries(identityPairs));
      }
    };

    void load();
    timer = window.setInterval(() => void load(), 4000);
    const observer = new MutationObserver(findHost);
    observer.observe(document.body, { childList: true, subtree: true });
    const refresh = () => window.setTimeout(() => void load(), 120);
    window.addEventListener("popstate", refresh);
    window.addEventListener("loadlink-call-history-updated", refresh as EventListener);
    window.addEventListener("loadlink-account-state-changed", refresh as EventListener);
    return () => {
      active = false;
      window.clearInterval(timer);
      observer.disconnect();
      window.removeEventListener("popstate", refresh);
      window.removeEventListener("loadlink-call-history-updated", refresh as EventListener);
      window.removeEventListener("loadlink-account-state-changed", refresh as EventListener);
    };
  }, []);

  const visibleRows = useMemo(() => rows.slice().reverse(), [rows]);
  if (!host || !thread || !visibleRows.length) return null;

  return createPortal(
    <div className="ll-final-call-history" aria-label="Call activity in this chat">
      {visibleRows.map((row) => {
        const outgoing = row.caller_user_id === userId;
        const identity = identities[row.id] || { name: "LoadLink contact", avatarUrl: "" };
        const answered = Boolean(answers[row.id]);
        const reason = String(row.end_reason || row.status || "").toLowerCase();
        const connected = answered && !hasFailureReason(reason);
        return (
          <div className="ll-final-call-event" key={row.id} data-loadlink-call-event="true">
            <span className="ll-final-call-icon" aria-hidden="true"><LoadLinkIcon name="phone" size={15} strokeWidth={2} /></span>
            <span className="ll-final-call-event-copy">
              <strong>{titleFor(row, outgoing, identity.name, answered)}</strong>
              <small>{connected ? durationLabel(answers[row.id], row.ended_at) : "No audio connection"} · {outgoing ? "Outgoing" : "Incoming"} · LoadLink audio</small>
            </span>
          </div>
        );
      })}
    </div>,
    host,
  );
}
