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

async function transaction<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore, finish: (value: T) => void) => void) {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    let completed = false;
    const tx = database.transaction(STORE, mode);
    const finish = (value: T) => { if (!completed) { completed = true; resolve(value); } };
    tx.oncomplete = () => database.close();
    tx.onerror = () => { database.close(); reject(tx.error || new Error("Photo draft storage failed.")); };
    tx.onabort = () => { database.close(); reject(tx.error || new Error("Photo draft storage was interrupted.")); };
    try { work(tx.objectStore(STORE), finish); }
    catch (error) { database.close(); reject(error); }
  });
}

export async function saveVehiclePhotos(userId: string, submissionId: string, files: File[]) {
  if (!userId || !submissionId) return false;
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ id: draftId(userId, submissionId), files, savedAt: Date.now() } satisfies PhotoRecord);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Photo draft write failed."));
      tx.onabort = () => reject(tx.error || new Error("Photo draft write interrupted."));
    });
    database.close();
    return true;
  } catch { return false; } // Quota/private browsing: keep existing in-memory files.
}

export async function restoreVehiclePhotos(userId: string, submissionId: string): Promise<File[]> {
  if (!userId || !submissionId) return [];
  try {
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
    return entry.files.slice(0, 30).filter(file =>
      file instanceof Blob && file.size > 0 && file.size <= 5 * 1024 * 1024
    ).map((file, index) => file instanceof File ? file :
      new File([file], "recovered-vehicle-" + (index + 1) + ".jpg", { type: file.type || "image/jpeg" }));
  } catch { return []; }
}

export async function clearVehiclePhotos(userId: string, submissionId: string) {
  if (!userId || !submissionId) return;
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
}
