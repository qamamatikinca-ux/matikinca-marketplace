export const VEHICLE_DRAFT_KEY = "loadlink-vehicle-draft-v1";
export const VEHICLE_DRAFT_OWNER_KEY = "loadlink-smart-vehicle-draft-owner";
export const VEHICLE_SUBMISSION_KEY = "loadlink-vehicle-submission-id";

/** Preserve the selected listing step across mobile photo-picker tab reloads.
 * Keys are scoped to the signed-in account and individual submission. */
export function vehicleWizardStepKey(userId: string, submissionId: string) {
  return `loadlink:vehicle-wizard-step:${userId}:${submissionId}`;
}
export function readVehicleWizardStep(userId?: string, submissionId?: string) {
  if (typeof window === "undefined") return 0;
  try {
    const owner = userId || localStorage.getItem(VEHICLE_DRAFT_OWNER_KEY) || "";
    const submission = submissionId || localStorage.getItem(VEHICLE_SUBMISSION_KEY) || "";
    if (!owner || !submission || !hasVehicleDraft(readVehicleDraft(owner))) return 0;
    const n = Number(localStorage.getItem(vehicleWizardStepKey(owner, submission)));
    return Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0;
  } catch { return 0; }
}
export function saveVehicleWizardStep(step: number) {
  if (typeof window === "undefined" || !Number.isInteger(step) || step < 0 || step > 3) return;
  try {
    const owner=localStorage.getItem(VEHICLE_DRAFT_OWNER_KEY)||"";
    const submission=localStorage.getItem(VEHICLE_SUBMISSION_KEY)||"";
    if (owner && submission) localStorage.setItem(vehicleWizardStepKey(owner,submission),String(step));
  } catch {}
}

const VEHICLE_ACTIVE_TAB_KEY = "loadlink-vehicle-draft-active-tab:";
export function isVehicleDraftActiveInTab(userId: string) {
  try { return Boolean(userId && sessionStorage.getItem(VEHICLE_ACTIVE_TAB_KEY + userId) === "1"); }
  catch { return false; }
}
export function markVehicleDraftActiveInTab(userId: string) {
  try { if (userId) sessionStorage.setItem(VEHICLE_ACTIVE_TAB_KEY + userId, "1"); }
  catch {}
}

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
    const submission = localStorage.getItem(VEHICLE_SUBMISSION_KEY) || (owner ? localStorage.getItem(`${VEHICLE_SUBMISSION_KEY}:${owner}`) : "") || "";
    if (owner && submission) localStorage.removeItem(vehicleWizardStepKey(owner, submission));
    for (const key of [VEHICLE_DRAFT_KEY, VEHICLE_SUBMISSION_KEY]) {
      if (!userId || localStorage.getItem(VEHICLE_DRAFT_OWNER_KEY) === userId) localStorage.removeItem(key);
      if (owner) localStorage.removeItem(`${key}:${owner}`);
    }
    if (owner) try { sessionStorage.removeItem(VEHICLE_ACTIVE_TAB_KEY + owner); } catch {}
    window.dispatchEvent(new Event("loadlink-vehicle-draft-changed"));
  } catch {}
}
export function vehicleDraftHref(draft: VehicleDraft) {
  return `/list-your-vehicle?entry=${draft.vehicleCategory === "mobile_unit" ? "mobile-unit" : "vehicle"}&resume=1#listing-form`;
}
