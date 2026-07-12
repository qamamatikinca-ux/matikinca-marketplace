import { isAuthenticatedUser } from "@/lib/auth";
import {
  ACTIVE_ACCOUNT_STORAGE_KEY,
  LEGACY_STATE_OWNER_STORAGE_KEY,
  createPrivateKey,
  getAccountOwnerKey,
  rememberBuyerKey,
  setOwnedJobKeys,
} from "@/lib/chatKeys";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type StoredItem = Record<string, unknown> & {
  id?: string;
  href?: string;
  title?: string;
  savedAt?: number;
};

type AccountSnapshot = {
  buyer_keys: string[];
  owned_job_keys: Record<string, string>;
  recent_viewed: StoredItem[];
  recent_portals: StoredItem[];
  liked_listings: StoredItem[];
};

type AccountStateRow = {
  buyer_keys: string[] | null;
  owned_job_keys: Record<string, string> | null;
  recent_viewed: StoredItem[] | null;
  recent_portals: StoredItem[] | null;
  liked_listings: StoredItem[] | null;
};

const EMPTY_SNAPSHOT: AccountSnapshot = {
  buyer_keys: [],
  owned_job_keys: {},
  recent_viewed: [],
  recent_portals: [],
  liked_listings: [],
};

function accountCacheKey(userId: string) {
  return `loadlink-account-cache:${userId}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "") as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function readArray(key: string) {
  const parsed = readJson<unknown>(key, []);
  return Array.isArray(parsed) ? (parsed as StoredItem[]) : [];
}

function readStringArray(key: string) {
  const parsed = readJson<unknown>(key, []);
  return Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === "string" && item.length >= 20)
    : [];
}

function readOwnedKeys() {
  const parsed = readJson<unknown>("loadlink-owned-job-keys", {});
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).filter(
      (entry): entry is [string, string] =>
        typeof entry[0] === "string" &&
        typeof entry[1] === "string" &&
        entry[1].length >= 20,
    ),
  );
}

function readGlobalSnapshot(): AccountSnapshot {
  const buyerKeys = new Set(readStringArray("loadlink-chat-keys"));
  const primaryBuyerKey = localStorage.getItem("loadlink-chat-key");
  if (primaryBuyerKey && primaryBuyerKey.length >= 20) buyerKeys.add(primaryBuyerKey);

  return {
    buyer_keys: Array.from(buyerKeys),
    owned_job_keys: readOwnedKeys(),
    recent_viewed: readArray("loadlink-recent-viewed-jobs"),
    recent_portals: readArray("loadlink-recent-activity"),
    liked_listings: readArray("loadlink-liked-listings"),
  };
}

function readAccountCache(userId: string): AccountSnapshot {
  const parsed = readJson<Partial<AccountSnapshot>>(accountCacheKey(userId), {});

  return {
    buyer_keys: Array.isArray(parsed.buyer_keys)
      ? parsed.buyer_keys.filter((key): key is string => typeof key === "string" && key.length >= 20)
      : [],
    owned_job_keys:
      parsed.owned_job_keys && typeof parsed.owned_job_keys === "object" && !Array.isArray(parsed.owned_job_keys)
        ? Object.fromEntries(
            Object.entries(parsed.owned_job_keys).filter(
              (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length >= 20,
            ),
          )
        : {},
    recent_viewed: Array.isArray(parsed.recent_viewed) ? parsed.recent_viewed : [],
    recent_portals: Array.isArray(parsed.recent_portals) ? parsed.recent_portals : [],
    liked_listings: Array.isArray(parsed.liked_listings) ? parsed.liked_listings : [],
  };
}

function writeAccountCache(userId: string, snapshot: AccountSnapshot) {
  localStorage.setItem(accountCacheKey(userId), JSON.stringify(snapshot));
}

function writeGlobalSnapshot(snapshot: AccountSnapshot) {
  const buyerKeys = snapshot.buyer_keys.filter((key) => key.length >= 20);
  localStorage.setItem("loadlink-chat-keys", JSON.stringify(buyerKeys));

  if (buyerKeys[0]) localStorage.setItem("loadlink-chat-key", buyerKeys[0]);
  else localStorage.removeItem("loadlink-chat-key");

  setOwnedJobKeys(snapshot.owned_job_keys);
  localStorage.setItem("loadlink-recent-viewed-jobs", JSON.stringify(snapshot.recent_viewed));
  localStorage.setItem("loadlink-recent-activity", JSON.stringify(snapshot.recent_portals));
  localStorage.setItem("loadlink-liked-listings", JSON.stringify(snapshot.liked_listings));
}

function uniqueItems(...groups: (StoredItem[] | null | undefined)[]) {
  const items = groups.flatMap((group) => group || []);
  const map = new Map<string, StoredItem>();

  items
    .sort((first, second) => Number(second.savedAt || 0) - Number(first.savedAt || 0))
    .forEach((item) => {
      const key = String(item.id || item.href || item.title || JSON.stringify(item));
      if (!map.has(key)) map.set(key, item);
    });

  return Array.from(map.values()).slice(0, 50);
}

function mergeSnapshots(...snapshots: (AccountSnapshot | AccountStateRow | null | undefined)[]): AccountSnapshot {
  const valid = snapshots.filter(Boolean) as (AccountSnapshot | AccountStateRow)[];

  return {
    buyer_keys: Array.from(
      new Set(valid.flatMap((snapshot) => snapshot.buyer_keys || []).filter((key) => key.length >= 20)),
    ),
    owned_job_keys: Object.assign({}, ...valid.map((snapshot) => snapshot.owned_job_keys || {})),
    recent_viewed: uniqueItems(...valid.map((snapshot) => snapshot.recent_viewed)),
    recent_portals: uniqueItems(...valid.map((snapshot) => snapshot.recent_portals)),
    liked_listings: uniqueItems(...valid.map((snapshot) => snapshot.liked_listings)),
  };
}

function emitStateEvents() {
  window.dispatchEvent(new Event("loadlink-account-state-synced"));
  window.dispatchEvent(new Event("loadlink-recent-activity-updated"));
  window.dispatchEvent(new Event("loadlink-liked-listings-updated"));
  window.dispatchEvent(new Event("loadlink-chat-unread-updated"));
}

export async function syncAccountState() {
  if (!isSupabaseConfigured || typeof window === "undefined") return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAuthenticatedUser(user)) return;

  const activeAccountId = localStorage.getItem(ACTIVE_ACCOUNT_STORAGE_KEY);
  let legacyStateOwnerId = localStorage.getItem(LEGACY_STATE_OWNER_STORAGE_KEY);

  if (activeAccountId && activeAccountId !== user.id) {
    writeAccountCache(activeAccountId, readGlobalSnapshot());
  }

  const mayUseGlobalState =
    activeAccountId === user.id ||
    (!activeAccountId && (!legacyStateOwnerId || legacyStateOwnerId === user.id));

  if (!legacyStateOwnerId && !activeAccountId) {
    legacyStateOwnerId = user.id;
    localStorage.setItem(LEGACY_STATE_OWNER_STORAGE_KEY, user.id);
  }

  const globalSnapshot = mayUseGlobalState ? readGlobalSnapshot() : EMPTY_SNAPSHOT;
  const cachedSnapshot = readAccountCache(user.id);

  const { data: remote, error: readError } = await supabase
    .from("user_account_state")
    .select("buyer_keys,owned_job_keys,recent_viewed,recent_portals,liked_listings")
    .eq("user_id", user.id)
    .maybeSingle<AccountStateRow>();

  const snapshot = mergeSnapshots(readError ? null : remote, cachedSnapshot, globalSnapshot);
  if (snapshot.buyer_keys.length === 0) snapshot.buyer_keys = [createPrivateKey()];

  snapshot.buyer_keys.forEach(rememberBuyerKey);
  writeGlobalSnapshot(snapshot);
  writeAccountCache(user.id, snapshot);
  localStorage.setItem(ACTIVE_ACCOUNT_STORAGE_KEY, user.id);

  if (!readError) {
    const { error: writeError } = await supabase.from("user_account_state").upsert(
      {
        user_id: user.id,
        buyer_keys: snapshot.buyer_keys,
        owned_job_keys: snapshot.owned_job_keys,
        recent_viewed: snapshot.recent_viewed,
        recent_portals: snapshot.recent_portals,
        liked_listings: snapshot.liked_listings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (!writeError) writeAccountCache(user.id, snapshot);
  }

  const ownerKeys = new Set<string>(Object.values(snapshot.owned_job_keys));
  const accountOwnerKey = getAccountOwnerKey(user.id);
  if (accountOwnerKey) ownerKeys.add(accountOwnerKey);

  if (legacyStateOwnerId === user.id) {
    const legacyDeviceKey = localStorage.getItem("loadlink-device-key");
    if (legacyDeviceKey && legacyDeviceKey.length >= 20) ownerKeys.add(legacyDeviceKey);
  }

  for (const ownerKey of ownerKeys) {
    await supabase.rpc("claim_guest_listings", { p_owner_key: ownerKey });
  }

  emitStateEvents();
}

export function clearActiveAccountState() {
  if (typeof window === "undefined") return;

  const activeAccountId = localStorage.getItem(ACTIVE_ACCOUNT_STORAGE_KEY);
  if (activeAccountId) writeAccountCache(activeAccountId, readGlobalSnapshot());

  localStorage.removeItem(ACTIVE_ACCOUNT_STORAGE_KEY);
  localStorage.removeItem("loadlink-chat-key");
  localStorage.removeItem("loadlink-chat-keys");
  localStorage.removeItem("loadlink-owned-job-keys");
  localStorage.setItem("loadlink-recent-viewed-jobs", "[]");
  localStorage.setItem("loadlink-recent-activity", "[]");
  localStorage.setItem("loadlink-liked-listings", "[]");

  emitStateEvents();
}

export async function recordUserActivity(
  activityType: string,
  details: {
    entityType?: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  } = {},
) {
  if (!isSupabaseConfigured || typeof window === "undefined") return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAuthenticatedUser(user)) return;

  await supabase.from("user_activity_events").insert({
    user_id: user.id,
    activity_type: activityType,
    entity_type: details.entityType || "website",
    entity_id: details.entityId || null,
    metadata: details.metadata || {},
  });
}
