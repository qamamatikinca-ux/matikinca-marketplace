"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function durationLabel(started: string, ended: string | null) {
  if (!ended) return "0 min";
  const seconds = Math.max(0, Math.round((new Date(ended).getTime() - new Date(started).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes}m ${rest}s` : `${minutes} min`;
}

export default function LoadLinkCallHistoryStrip20260821() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [rows, setRows] = useState<CallRow[]>([]);
  const [userId, setUserId] = useState("");
  const [thread, setThread] = useState("");

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
        if (active) { setThread(""); setRows([]); }
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
        .limit(3);
      if (!error && active) setRows((data || []) as CallRow[]);
      findHost();
    };

    void load();
    timer = window.setInterval(() => void load(), 4000);
    const observer = new MutationObserver(findHost);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("popstate", load);
    return () => {
      active = false;
      window.clearInterval(timer);
      observer.disconnect();
      window.removeEventListener("popstate", load);
    };
  }, []);

  if (!host || !thread || !rows.length) return null;

  return createPortal(
    <div className="ll-final-call-history" aria-label="Recent call activity">
      {rows.map((row) => {
        const outgoing = row.caller_user_id === userId;
        const declined = /declin|reject/i.test(row.end_reason || "");
        const failed = /fail|unavailable|error/i.test(row.end_reason || "");
        const title = declined ? (outgoing ? "Call declined" : "Incoming call declined") : failed ? "Call not connected" : outgoing ? "Outgoing call ended" : "Incoming call ended";
        return (
          <div className="ll-final-call-event" key={row.id}>
            <span className="ll-final-call-icon" aria-hidden="true">↗</span>
            <span><strong>{title}</strong><small>{durationLabel(row.started_at, row.ended_at)} · LoadLink audio</small></span>
          </div>
        );
      })}
    </div>,
    host,
  );
}
