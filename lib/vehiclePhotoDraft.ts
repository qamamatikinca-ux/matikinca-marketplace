/**
 * User-scoped, device-local recovery for selected vehicle photos.
 * Only listing photos are stored. ID documents and face evidence are NEVER
 * persisted in IndexedDB by this utility.
 */
const DATABASE = "loadlink-vehicle-photo-drafts";
const STORE = "photos";
const VERSION = 1;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type PhotoRecord = { id: string; files: File[]; savedAt: number };

// Mobile IndexedDB open/write completion can reorder concurrent saves and removals.
const queuedWrites = new Map<string, Promise<void>>();
function queueWrite<T>(key: string, action: () => Promise<T>): Promise<T> {
  const prior = queuedWrites.get(key) || Promise.resolve();
  const work = prior.then(action, action);
  const settled = work.then(() => undefined, () => undefined);
  queuedWrites.set(key, settled);
  void settled.then(() => { if (queuedWrites.get(key) === settled) queuedWrites.delete(key); });
  return work;
}

function draftId(userId: string, submissionId: string) {
  return userId.trim() + ":" + submissionId.trim();
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Local photo recovery is not supported by this browser."));
      return;
    }
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Photo draft storage could not be opened."));
    request.onblocked = () => reject(new Error("Photo storage is temporarily busy."));
  });
}

export async function saveVehiclePhotos(userId: string, submissionId: string, files: File[]) {
  if (!userId || !submissionId) return false;
  const snapshot = files.slice();
  return queueWrite(draftId(userId, submissionId), async () => {
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ id: draftId(userId, submissionId), files: snapshot, savedAt: Date.now() } satisfies PhotoRecord);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Photo draft write failed."));
      tx.onabort = () => reject(tx.error || new Error("Photo draft write interrupted."));
    });
    database.close();
    return true;
  } catch { return false; } // Quota/private browsing: keep existing in-memory files.
  });
}

export async function restoreVehiclePhotos(userId: string, submissionId: string): Promise<File[]> {
  if (!userId || !submissionId) return [];
  try {
    await queuedWrites.get(draftId(userId, submissionId));
    const database = await openDatabase();
    const entry = await new Promise<PhotoRecord | undefined>((resolve, reject) => {
      const tx = database.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(draftId(userId, submissionId));
      request.onsuccess = () => resolve(request.result as PhotoRecord | undefined);
      request.onerror = () => reject(request.error);
    });
    database.close();
    if (!entry || !Number.isFinite(entry.savedAt) || Date.now() - entry.savedAt > MAX_AGE_MS) return [];
    if (!Array.isArray(entry.files)) return [];
    const stored = entry.files as unknown[];
    return stored.slice(0, 30)
      .filter((value): value is Blob => value instanceof Blob && value.size > 0 && value.size <= 5 * 1024 * 1024)
      .map((blob, index) => blob instanceof File ? blob :
        new File([blob], "recovered-vehicle-" + (index + 1) + ".jpg", { type: blob.type || "image/jpeg" }));
  } catch { return []; }
}

export async function clearVehiclePhotos(userId: string, submissionId: string) {
  if (!userId || !submissionId) return;
  return queueWrite(draftId(userId, submissionId), async () => {
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(draftId(userId, submissionId));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    database.close();
  } catch { /* Best-effort removal; never change posting result. */ }
  });
}
