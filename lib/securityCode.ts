import type { Session } from "@supabase/supabase-js";

const PREFIX = "loadlink-security-code-ok:v1:";

function sessionIdentity(session: Session) {
  try {
    const payloadPart = session.access_token.split(".")[1] || "";
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payloadPart.length / 4) * 4, "=");
    const payload = JSON.parse(atob(base64)) as { session_id?: string; iat?: number };
    if (payload.session_id) return payload.session_id;
    if (payload.iat) return `${session.user.id}:${payload.iat}`;
  } catch {
    // Fall through to a session-scoped token fingerprint.
  }
  return `${session.user.id}:${session.access_token.slice(-24)}`;
}

export function securityCodeMarkerKey(session: Session) {
  return `${PREFIX}${session.user.id}:${sessionIdentity(session)}`;
}

export function securityCodeVerifiedForSession(session: Session | null | undefined) {
  if (!session || typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(securityCodeMarkerKey(session)) === "1";
  } catch {
    return false;
  }
}

export function markSecurityCodeVerified(session: Session | null | undefined) {
  if (!session || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(securityCodeMarkerKey(session), "1");
  } catch {
    // Session storage may be unavailable in strict/private browser modes.
  }
}

export function clearSecurityCodeMarkers(userId?: string) {
  if (typeof window === "undefined") return;
  try {
    const remove: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (!key || !key.startsWith(PREFIX)) continue;
      if (!userId || key.startsWith(`${PREFIX}${userId}:`)) remove.push(key);
    }
    remove.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // Ignore unavailable session storage.
  }
}

export function isFourDigitCode(value: string) {
  return /^\d{4}$/.test(value);
}
