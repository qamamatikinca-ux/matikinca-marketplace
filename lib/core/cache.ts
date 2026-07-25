type Entry<T> = { value: T; expiresAt: number };
const cache = new Map<string, Entry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key) as Entry<T> | undefined;
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) { cache.delete(key); return null; }
  return entry.value;
}

export function cacheSet<T>(key: string, value: T, ttlMs = 30_000) {
  cache.set(key, { value, expiresAt: Date.now() + Math.max(1_000, ttlMs) });
  return value;
}

export function cacheDelete(prefix: string) {
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
}
