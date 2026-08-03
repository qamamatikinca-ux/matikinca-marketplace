import type { User } from "@supabase/supabase-js";

import { isAuthenticatedUser } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

export function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error && typeof error === "object") {
    const candidate = error as {
      message?: unknown;
      error_description?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
      status?: unknown;
    };
    const parts = [candidate.message, candidate.error_description, candidate.details, candidate.hint]
      .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
      .map((value) => value.trim());
    if (parts.length) return Array.from(new Set(parts)).join(" · ");
  }
  return fallback;
}

export function isTransientError(error: unknown) {
  const message = errorMessage(error, "").toLowerCase();
  const status = Number(
    error && typeof error === "object" && "status" in error
      ? (error as { status?: unknown }).status
      : 0,
  );
  return (
    status === 408 ||
    status === 425 ||
    status === 429 ||
    status >= 500 ||
    /network|fetch|timeout|timed out|connection|temporar|gateway|socket|offline|failed to fetch/.test(message)
  );
}

export async function withTransientRetry<T>(
  operation: () => Promise<T>,
  attempts = 3,
  initialDelay = 350,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < Math.max(1, attempts); attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts - 1 || !isTransientError(error)) throw error;
      await delay(initialDelay * (attempt + 1));
    }
  }
  throw lastError;
}

export async function getFreshAuthenticatedUser(attempts = 3): Promise<User | null> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const sessionResult = await supabase.auth.getSession();
    const session = sessionResult.data.session;

    if (isAuthenticatedUser(session?.user)) {
      const expiresSoon = Boolean(
        session.expires_at && session.expires_at * 1000 < Date.now() + 2 * 60 * 1000,
      );
      if (!expiresSoon) return session!.user;

      const refreshed = await supabase.auth.refreshSession();
      if (isAuthenticatedUser(refreshed.data.session?.user)) return refreshed.data.session!.user;
      if (isAuthenticatedUser(session?.user)) return session!.user;
    }

    const userResult = await supabase.auth.getUser();
    if (isAuthenticatedUser(userResult.data.user)) return userResult.data.user;

    if (attempt < attempts - 1) await delay(300 * (attempt + 1));
  }
  return null;
}

export function postingErrorMessage(error: unknown, fallback: string) {
  const message = errorMessage(error, fallback);
  if (/ACCOUNT_ACCESS_RESTRICTED|account access is restricted|blocked|suspended/i.test(message)) {
    return "This account is blocked or suspended and cannot publish or send messages.";
  }
  if (/CURRENT_NDA_ACCEPTANCE_REQUIRED|NO_ACTIVE_AGREEMENT|platform access/i.test(message)) {
    return "An outdated access restriction is still active in Supabase. Run the supplied LoadLink repair SQL once.";
  }
  if (/row level security|violates row-level security|permission denied/i.test(message)) {
    return "LoadLink posting permissions need the supplied Supabase repair SQL. Your form has been kept.";
  }
  if (/bucket not found|storage.*not found/i.test(message)) {
    return "The LoadLink photo bucket is missing. Run the supplied Supabase repair SQL, then publish again.";
  }
  if (/mime|content.?type|file type/i.test(message)) {
    return "One selected file format is not supported. Use JPG, PNG or WEBP images and try again.";
  }
  if (/payload too large|maximum allowed size|file size|too large/i.test(message)) {
    return "One selected file is too large. Choose a smaller image or document and try again.";
  }
  if (/jwt|session|sign in|required|unauthorized|401/i.test(message)) {
    return "Your sign-in session expired. Your details are still saved—sign in again and publish.";
  }
  if (isTransientError(error)) {
    return "The connection was interrupted. Your details are still saved—check your signal and publish again.";
  }
  return message || fallback;
}
