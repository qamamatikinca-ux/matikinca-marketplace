import { safeNextPath } from "@/lib/auth";
import { securityCodeVerifiedForSession } from "@/lib/securityCode";
import { supabase } from "@/lib/supabaseClient";

type SecurityCodeStatus = { enabled?: boolean };

export function strongPasswordIssue(password: string) {
  if (password.length < 12) return "Use at least 12 characters.";
  if (password.length > 128) return "Use no more than 128 characters.";
  if (!/[a-z]/.test(password)) return "Add a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Add an uppercase letter.";
  if (!/\d/.test(password)) return "Add a number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Add a symbol.";
  return "";
}

export function friendlyAuthError(error: unknown, context: "login" | "signup" | "reset" | "mfa" = "login") {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code || "") : "";
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || code === "429") return "Too many attempts. Wait a few minutes and try again.";
  if (code === "captcha_failed") return "The security check expired. Complete it again and retry.";
  if (code === "weak_password") return "That password does not meet LoadLink's security requirements.";
  if (context === "signup") return "The account could not be created with those details. Check the form or sign in if you already have an account.";
  if (context === "reset") return "The password could not be updated. Request a fresh reset link and try again.";
  if (context === "mfa") return "That 4-digit LoadLink code was not accepted. Check the code and try again.";
  return "Email or password is incorrect, or this account is not ready to sign in.";
}

// Existing callers keep this name, but the routing decision now checks whether
// the signed-in account actually has a LoadLink security code enabled before
// navigating to /auth/mfa. Accounts without a code go straight to their target
// page and never visibly land on the security-code screen.
export async function destinationAfterMfa(nextValue: string) {
  const next = safeNextPath(nextValue, "/");
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return next;
  if (securityCodeVerifiedForSession(session)) return next;

  const { data, error } = await supabase.rpc("loadlink_security_code_status");
  if (!error && !((data || {}) as SecurityCodeStatus).enabled) return next;

  // Fail closed if the status check itself is unavailable: an account that may
  // have a code should never silently bypass that protection.
  return `/auth/mfa?next=${encodeURIComponent(next)}`;
}
