export const ACTIVE_ACCOUNT_STORAGE_KEY = "loadlink-active-account-id";
export const LEGACY_STATE_OWNER_STORAGE_KEY = "loadlink-legacy-state-owner-id";

export function createPrivateKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function readStringArray(key: string) {
  if (typeof window === "undefined") return [] as string[];

  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]") as unknown;
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string" && item.length >= 20)
      : [];
  } catch {
    return [];
  }
}

export function getBuyerKey() {
  if (typeof window === "undefined") return "";

  const existing = localStorage.getItem("loadlink-chat-key");
  if (existing && existing.length >= 20) {
    rememberBuyerKey(existing);
    return existing;
  }

  const savedKeys = readStringArray("loadlink-chat-keys");
  if (savedKeys[0]) {
    localStorage.setItem("loadlink-chat-key", savedKeys[0]);
    return savedKeys[0];
  }

  const key = createPrivateKey();
  localStorage.setItem("loadlink-chat-key", key);
  rememberBuyerKey(key);
  return key;
}

export function rememberBuyerKey(key: string) {
  if (typeof window === "undefined" || key.length < 20) return;

  const keys = new Set(readStringArray("loadlink-chat-keys"));
  keys.add(key);
  localStorage.setItem("loadlink-chat-keys", JSON.stringify(Array.from(keys)));
}

export function getBuyerKeys() {
  if (typeof window === "undefined") return [] as string[];

  const keys = new Set(readStringArray("loadlink-chat-keys"));
  const primary = localStorage.getItem("loadlink-chat-key");
  if (primary && primary.length >= 20) keys.add(primary);

  if (keys.size === 0) keys.add(getBuyerKey());
  return Array.from(keys);
}

export function getOwnedJobKeys(): Record<string, string> {
  if (typeof window === "undefined") return {};

  try {
    const parsed = JSON.parse(localStorage.getItem("loadlink-owned-job-keys") || "{}") as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === "string" &&
          typeof entry[1] === "string" &&
          entry[1].length >= 20,
      ),
    );
  } catch {
    return {};
  }
}

export function setOwnedJobKeys(keys: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem("loadlink-owned-job-keys", JSON.stringify(keys));
}

export function getAccountOwnerKey(userId: string) {
  if (typeof window === "undefined" || !userId) return "";

  const storageKey = `loadlink-owner-key:${userId}`;
  const existing = localStorage.getItem(storageKey);
  if (existing && existing.length >= 20) return existing;

  const key = createPrivateKey();
  localStorage.setItem(storageKey, key);
  return key;
}

export function getOwnerKeys() {
  if (typeof window === "undefined") return [] as string[];

  const keys = new Set<string>();
  const activeAccountId = localStorage.getItem(ACTIVE_ACCOUNT_STORAGE_KEY);
  const legacyStateOwnerId = localStorage.getItem(LEGACY_STATE_OWNER_STORAGE_KEY);

  if (activeAccountId) {
    const accountOwnerKey = localStorage.getItem(`loadlink-owner-key:${activeAccountId}`);
    if (accountOwnerKey && accountOwnerKey.length >= 20) keys.add(accountOwnerKey);

    if (legacyStateOwnerId === activeAccountId) {
      const legacyDeviceKey = localStorage.getItem("loadlink-device-key");
      if (legacyDeviceKey && legacyDeviceKey.length >= 20) keys.add(legacyDeviceKey);
    }
  }

  Object.values(getOwnedJobKeys()).forEach((key) => {
    if (key.length >= 20) keys.add(key);
  });

  return Array.from(keys);
}
