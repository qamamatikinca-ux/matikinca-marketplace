"use client";

/**
 * Per-account, tab-scoped chat previews. No shared HTTP cache and no durable
 * browser storage of private message bodies or access keys.
 * Chat permissions remain enforced by the Supabase RPCs.
 */
const PREFIX = "loadlink-private-chat-preview-v2:";

export function readChatPreview<T>(userId: string, name: string): T[] | null {
  if (typeof window === "undefined" || !userId || !name) return null;
  try {
    const raw = sessionStorage.getItem(PREFIX + userId + ":" + name);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { expiresAt?: number; data?: unknown };
    if (!parsed.expiresAt || parsed.expiresAt < Date.now() || !Array.isArray(parsed.data)) return null;
    return parsed.data as T[];
  } catch { return null; }
}

export function writeChatPreview<T>(userId: string, name: string, data: T[], ttlMinutes = 30): void {
  if (typeof window === "undefined" || !userId || !name) return;
  try {
    sessionStorage.setItem(PREFIX + userId + ":" + name, JSON.stringify({
      expiresAt: Date.now() + ttlMinutes * 60_000,
      data,
    }));
  } catch { /* Storage can be disabled or full; the network path still works. */ }
}

export function clearChatPreviews(userId: string) {
  if (typeof window === "undefined" || !userId) return;
  try {
    const prefix = PREFIX + userId + ":";
    for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(prefix)) sessionStorage.removeItem(key);
    }
  } catch {}
}
