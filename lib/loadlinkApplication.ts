/**
 * Private, short-lived hand-off between listing application and Messages.
 * No applicant contact details or draft document are put into the URL.
 */
export type LoadLinkApplication = {
  listing_id: string;
  kind: "job" | "contract";
  listing_title: string;
  city: string;
  advertised_rate: string;
  vehicle: string;
  applicant_name: string;
  company: string;
  email: string;
  phone: string;
  area: string;
  offer: string;
  note: string;
  details: string;
  client_token: string;
  created_at: number;
};

const KEY_PREFIX = "loadlink-pending-application-v1:";
const MAX_AGE_MS = 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value: unknown, length: number) {
  return typeof value === "string" ? value.trim().slice(0, length) : "";
}

export function parseLoadLinkApplication(value: unknown, listingId: string, now = Date.now()): LoadLinkApplication | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const kind = raw.kind;
  if ((kind !== "job" && kind !== "contract") || !UUID.test(listingId) || raw.listing_id !== listingId) return null;
  if (typeof raw.created_at !== "number" || !Number.isFinite(raw.created_at) ||
      raw.created_at > now + 60_000 || now - raw.created_at > MAX_AGE_MS) return null;
  if (!UUID.test(text(raw.client_token, 40))) return null;
  const title = text(raw.listing_title, 220);
  const applicantName = text(raw.applicant_name, 160);
  if (!title || !applicantName) return null;
  return {
    listing_id: listingId, kind, listing_title: title,
    city: text(raw.city, 160), advertised_rate: text(raw.advertised_rate, 160),
    vehicle: text(raw.vehicle, 160), applicant_name: applicantName,
    company: text(raw.company, 160), email: text(raw.email, 180),
    phone: text(raw.phone, 80), area: text(raw.area, 160),
    offer: text(raw.offer, 100), note: text(raw.note, 600),
    details: text(raw.details, 3400), client_token: text(raw.client_token, 40),
    created_at: raw.created_at,
  };
}

function keyFor(listingId: string) { return KEY_PREFIX + listingId; }

export function savePendingApplication(application: LoadLinkApplication): boolean {
  if (typeof window === "undefined") return false;
  const validated = parseLoadLinkApplication(application, application.listing_id);
  if (!validated) return false;
  try {
    window.sessionStorage.setItem(keyFor(application.listing_id), JSON.stringify(validated));
    return true;
  } catch { return false; }
}

export function readPendingApplication(listingId: string): LoadLinkApplication | null {
  if (typeof window === "undefined" || !UUID.test(listingId)) return null;
  try {
    const saved = window.sessionStorage.getItem(keyFor(listingId));
    const parsed = saved ? parseLoadLinkApplication(JSON.parse(saved), listingId) : null;
    if (saved && !parsed) clearPendingApplication(listingId);
    return parsed;
  } catch {
    clearPendingApplication(listingId);
    return null;
  }
}

export function clearPendingApplication(listingId: string) {
  if (typeof window === "undefined" || !UUID.test(listingId)) return;
  try { window.sessionStorage.removeItem(keyFor(listingId)); } catch {}
}
