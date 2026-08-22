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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function durationLabel(started: string, ended: string | null) {
  if (!ended) return "No connection";
  const seconds = Math.max(0, Math.round((new Date(ended).getTime() - new Date(started).getTime()) / 1000));
  if (seconds < 2) return "No connection";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes}m ${rest}s` : `${minutes} min`;
}

function titleFor(row: CallRow, outgoing: boolean, contactName: string) {
  const reason = String(row.end_reason || row.status || "").toLowerCase();
  if (/not_answered|no_answer|ring_timeout/.test(reason)) {
    return outgoing ? `Call not answered by ${contactName}` : `Missed call from ${contactName}`;
  }
  if (/declin|reject/.test(reason)) {
    return outgoing ? `${contactName} declined the call` : `You declined ${contactName}'s call`;
  }
  if (/connection_failed|network|fail|error/.test(reason)) return `Call with ${contactName} could not connect`;
  if (/cancel/.test(reason)) return outgoing ? `Call to ${contactName} cancelled` : `${contactName} cancelled the call`;
  if (/server_limit|limit_reached|time_limit/.test(reason)) return `Call with ${contactName} reached the time limit`;
  return `Call with ${contactName} ended`;
}

export default function LoadLinkCallHistoryStrip20260821() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [rows, setRows] = useState<CallRow[]>([]);
  const [userId, setUserId] = useState("");
  const [thread, setThread] = useState("");
  const [identities, setIdentities] = useState<Record<string, ContactIdentity>>({});

  useEffect(() => {
    if (!window.location.pathname.startsWith("/messages")) return;
    let active = true;
    let timer = 0;

    const findHost = () => {
      const anchor = document.querySelector<HTMLElement>('[data-loadlink-job-timing-toast="v272"]');
      if (!anchor?.parentElement) return;
      let node = anchor.parentElement.querySelector<HTMLElement>("[data-loadlink-call-history-host]");
      if (!node) {
        node = document.createElement("div");
        node.dataset.loadlinkCallHistoryHost = "true";
        anchor.parentElement.insertBefore(node, anchor);
      }
      if (active) setHost(node);
    };

    const load = async () => {
      const params = new URLSearchParams(window.location.search);
      const conversation = params.get("thread") || params.get("conversation") || "";
      if (!UUID_RE.test(conversation)) {
        if (active) { setThread(""); setRows([]); setIdentities({}); }
        findHost();
        return;
      }

      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id || "";
      if (active) { setUserId(uid); setThread(conversation); }
      if (!uid) return;

      const { data, error } = await supabase
        .from("call_sessions")
        .select("id,caller_user_id,callee_user_id,started_at,ended_at,status,end_reason")
        .eq("conversation_id", conversation)
        .neq("status", "active")
        .order("started_at", { ascending: false })
        .limit(5);

      if (!error && active) {
        const nextRows = (data || []) as CallRow[];
        setRows(nextRows);
        const identityPairs = await Promise.all(nextRows.map(async (row) => {
          const { data: identityData } = await supabase.rpc("loadlink_call_contact_identity", { p_session_id: row.id });
          const identity = Array.isArray(identityData) ? identityData[0] : identityData;
          return [row.id, {
            name: String((identity as { full_name?: string } | null)?.full_name || "LoadLink contact"),
            avatarUrl: String((identity as { avatar_url?: string | null } | null)?.avatar_url || ""),
          }] as const;
        }));
        if (active) setIdentities(Object.fromEntries(identityPairs));
      }
      findHost();
    };

    void load();
    timer = window.setInterval(() => void load(), 5000);
    const observer = new MutationObserver(findHost);
    observer.observe(document.body, { childList: true, subtree: true });
    const refresh = () => void load();
    window.addEventListener("popstate", refresh);
    window.addEventListener("loadlink-call-history-updated", refresh as EventListener);
    return () => {
      active = false;
      window.clearInterval(timer);
      observer.disconnect();
      window.removeEventListener("popstate", refresh);
      window.removeEventListener("loadlink-call-history-updated", refresh as EventListener);
    };
  }, []);

  const visibleRows = useMemo(() => rows.slice().reverse(), [rows]);
  if (!host || !thread || !visibleRows.length) return null;

  return createPortal(
    <div className="ll-final-call-history" aria-label="Call activity in this chat">
      {visibleRows.map((row) => {
        const outgoing = row.caller_user_id === userId;
        const identity = identities[row.id] || { name: "LoadLink contact", avatarUrl: "" };
        const reason = String(row.end_reason || row.status || "").toLowerCase();
        const connected = !/not_answered|no_answer|ring_timeout|declin|reject|connection_failed|network|fail|error|cancel/.test(reason);
        return (
          <div className="ll-final-call-event" key={row.id} data-loadlink-call-event="true">
            <span className="ll-final-call-icon" aria-hidden="true"><LoadLinkIcon name="phone" size={15} strokeWidth={2} /></span>
            <span className="ll-final-call-event-copy">
              <strong>{titleFor(row, outgoing, identity.name)}</strong>
              <small>{connected ? durationLabel(row.started_at, row.ended_at) : "No audio connection"} · LoadLink audio</small>
            </span>
          </div>
        );
      })}
    </div>,
    host,
  );
}
