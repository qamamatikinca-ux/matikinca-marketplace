"use client";
import LoadLinkIcon from "@/components/LoadLinkIcon";
import type { ChatCall } from "@/lib/callHistory";
export default function ChatCallCard({ call, onCall }: { call: ChatCall; onCall: () => void }) {
  return <div className={`ll-chat-call-row ${call.outgoing ? "ll-chat-call-outgoing" : ""}`}>
    <button type="button" className={`ll-chat-call-card ${call.missed ? "ll-chat-call-missed" : ""}`} onClick={onCall} disabled={call.ongoing} aria-label={`${call.label}. ${call.detail}. ${call.ongoing ? "" : "Start a voice call"}`}>
      <span className="ll-chat-call-icon" aria-hidden="true"><LoadLinkIcon name="phone" size={20} /></span>
      <span className="ll-chat-call-copy"><strong>{call.label}</strong><small><span aria-hidden="true">{call.outgoing ? "↗" : "↙"}</span> {call.detail}</small></span>
      <time dateTime={call.started_at}>{new Intl.DateTimeFormat("en-ZA", { hour: "2-digit", minute: "2-digit" }).format(new Date(call.started_at))}</time>
    </button>
  </div>;
}
