/**
 * Short-lived, per-account chat snapshots. A snapshot is a convenience for rendering
 * a previously verified inbox immediately; it never authorizes an RPC or sends data.
 * Supabase validates access to every conversation and attachment independently.
 */
const PREFIX = "loadlink-private-chat-session-v3:";
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const MAX_INBOX_ROWS = 250;
const MAX_MESSAGE_ROWS = 350;

function read<T>(key: string, limit: number): T[] {
  if (typeof window === "undefined" || !key) return [];
  try {
    const raw = window.sessionStorage.getItem(PREFIX + key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return [];
    const record = parsed as { updated?: number; data?: unknown };
    if (!Number.isFinite(record.updated) || Date.now() - Number(record.updated) > MAX_AGE_MS || !Array.isArray(record.data)) {
      window.sessionStorage.removeItem(PREFIX + key);
      return [];
    }
    return record.data.slice(0, limit).filter((value: unknown) => value && typeof value === "object") as T[];
  } catch { return []; }
}

function write(key: string, value: unknown[], limit: number): void {
  if (typeof window === "undefined" || !key) return;
  try {
    window.sessionStorage.setItem(PREFIX + key, JSON.stringify({
      updated: Date.now(), data: value.slice(-limit),
    }));
  } catch { /* browsers may deny or clear storage; online chat still works */ }
}

export function readInboxSnapshot<T>(userId: string): T[] {
  return userId ? read<T>("inbox:" + userId, MAX_INBOX_ROWS) : [];
}

export function writeInboxSnapshot<T>(userId: string, rows: T[]): void {
  if (userId) write("inbox:" + userId, rows, MAX_INBOX_ROWS);
}

export function readMessageSnapshot<T>(userId: string, conversationId: string): T[] {
  return userId && conversationId ? read<T>("thread:" + userId + ":" + conversationId, MAX_MESSAGE_ROWS) : [];
}

export function writeMessageSnapshot<T>(userId: string, conversationId: string, messages: T[]): void {
  if (userId && conversationId) write("thread:" + userId + ":" + conversationId, messages, MAX_MESSAGE_ROWS);
}
