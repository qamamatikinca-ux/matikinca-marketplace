export const VEHICLE_DRAFT_KEY = "loadlink-vehicle-draft-v1";
export const VEHICLE_DRAFT_OWNER_KEY = "loadlink-smart-vehicle-draft-owner";
export const VEHICLE_SUBMISSION_KEY = "loadlink-vehicle-submission-id";
export type VehicleDraft = Record<string, string | number | boolean | null>;

export function hasVehicleDraft(draft: VehicleDraft | null) {
  return Boolean(draft && ["vehicleCategory", "vehicleSubtype", "brand", "modelName", "title", "description"].some(key => typeof draft[key] === "string" && String(draft[key]).trim()));
}
export function readVehicleDraft(userId?: string): VehicleDraft | null {
  if (typeof window === "undefined") return null;
  try {
    if (userId && localStorage.getItem(VEHICLE_DRAFT_OWNER_KEY) !== userId) return null;
    const value = JSON.parse(localStorage.getItem(VEHICLE_DRAFT_KEY) || "null");
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item === null || ["string", "number", "boolean"].includes(typeof item))) as VehicleDraft;
  } catch { return null; }
}
export function scopeVehicleDraft(userId: string) {
  if (typeof window === "undefined") return;
  try {
    const previous = localStorage.getItem(VEHICLE_DRAFT_OWNER_KEY);
    if (previous === userId) return;
    if (previous) {
      for (const key of [VEHICLE_DRAFT_KEY, VEHICLE_SUBMISSION_KEY]) {
        const value = localStorage.getItem(key);
        if (value) localStorage.setItem(`${key}:${previous}`, value);
      }
    }
    // Always switch the active keys, including a login after logout.
    // Unowned legacy drafts cannot safely be assigned to a different account.
    for (const key of [VEHICLE_DRAFT_KEY, VEHICLE_SUBMISSION_KEY]) {
      const value = userId ? localStorage.getItem(`${key}:${userId}`) : null;
      if (value) localStorage.setItem(key, value); else localStorage.removeItem(key);
    }
    if (userId) localStorage.setItem(VEHICLE_DRAFT_OWNER_KEY, userId);
    else localStorage.removeItem(VEHICLE_DRAFT_OWNER_KEY);
  } catch { /* Storage can be unavailable in private browsing; the form remains usable. */ }
}
export function clearVehicleDraft(userId?: string) {
  if (typeof window === "undefined") return;
  try {
    const owner = userId || localStorage.getItem(VEHICLE_DRAFT_OWNER_KEY);
    for (const key of [VEHICLE_DRAFT_KEY, VEHICLE_SUBMISSION_KEY]) {
      if (!userId || localStorage.getItem(VEHICLE_DRAFT_OWNER_KEY) === userId) localStorage.removeItem(key);
      if (owner) localStorage.removeItem(`${key}:${owner}`);
    }
    window.dispatchEvent(new Event("loadlink-vehicle-draft-changed"));
  } catch {}
}
export function vehicleDraftHref(draft: VehicleDraft) {
  return `/list-your-vehicle?entry=${draft.vehicleCategory === "mobile_unit" ? "mobile-unit" : "vehicle"}&resume=1#listing-form`;
}
