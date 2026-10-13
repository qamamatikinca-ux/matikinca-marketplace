export type CallHistoryRow = {
  id: string; conversation_id: string; caller_user_id: string; callee_user_id: string;
  started_at: string; ended_at: string | null; last_heartbeat_at: string | null;
  status: string; end_reason: string | null;
};
export type CallHistorySignal = { session_id: string; signal_type: string; created_at: string; payload: Record<string, unknown> | null };
export type ChatCall = CallHistoryRow & { outgoing: boolean; label: string; detail: string; missed: boolean; ongoing: boolean };
export function callDuration(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return value < 60 ? `${value}s` : `${Math.floor(value / 60)}m${value % 60 ? ` ${value % 60}s` : ""}`;
}
export function describeCall(row: CallHistoryRow, userId: string, signals: CallHistorySignal[], now = Date.now()): ChatCall {
  const outgoing = row.caller_user_id === userId;
  const rowReason = row.end_reason;
  const activity = signals.filter(signal => signal.session_id === row.id);
  const hangup = activity.find(signal => signal.signal_type === "hangup");
  const reason = String(rowReason || hangup?.payload?.reason || row.status).toLowerCase();
  const answer = activity.find(signal => signal.signal_type === "answer");
  const rawSeconds = hangup?.payload?.connected_seconds;
  const measured = typeof rawSeconds === "number" && Number.isFinite(rawSeconds) && rawSeconds >= 0 && (rawSeconds > 0 || Boolean(hangup?.payload?.connected_at));
  const stale = now - Date.parse(row.last_heartbeat_at || row.started_at) > 90_000;
  const ongoing = row.status === "active" && !row.ended_at && !hangup && !stale;
  const failed = /connection_failed|network|error|fail/.test(reason);
  const declined = /declin|reject/.test(reason);
  const cancelled = /cancel/.test(reason);
  const noAnswer = /not_answered|no_answer|ring_timeout/.test(reason) || (!ongoing && !measured && !answer && !failed && !declined && !cancelled);
  let label = outgoing ? "Outgoing voice call" : "Incoming voice call";
  let detail = "Call ended";
  if (ongoing) detail = answer ? "Call in progress" : outgoing ? "Calling…" : "Incoming call";
  else if (declined) { label = "Declined voice call"; detail = outgoing ? "Call declined" : "You declined"; }
  else if (failed) { label = "Call could not connect"; detail = "Connection interrupted"; }
  else if (cancelled || noAnswer) { label = outgoing ? cancelled ? "Cancelled voice call" : "Unanswered voice call" : "Missed voice call"; detail = outgoing ? "Not connected" : "Tap to call back"; }
  else if (row.status === "active" && stale && !hangup) detail = "Call interrupted";
  else if (measured) detail = Number(rawSeconds) === 0 ? "Connected briefly" : callDuration(Number(rawSeconds));
  else if (answer && row.ended_at) {
    const seconds = (Date.parse(row.ended_at) - Date.parse(answer.created_at)) / 1000;
    detail = Number.isFinite(seconds) && seconds >= 0 ? `About ${callDuration(seconds)}` : "Call ended";
  }
  return { ...row, outgoing, label, detail, missed: !outgoing && (noAnswer || cancelled), ongoing };
}
export function mergeChatTimeline<T extends { id: string; created_at: string }>(messages: T[], calls: ChatCall[]) {
  const entries: ({ kind: "message"; message: T; created_at: string; key: string } | { kind: "call"; call: ChatCall; created_at: string; key: string })[] = [
    ...messages.map(message => ({ kind: "message" as const, message, created_at: message.created_at, key: `message:${message.id}` })),
    ...calls.map(call => ({ kind: "call" as const, call, created_at: call.started_at, key: `call:${call.id}` })),
  ];
  return entries.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || a.key.localeCompare(b.key));
}
