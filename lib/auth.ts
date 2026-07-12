import type { User } from "@supabase/supabase-js";

export function isAuthenticatedUser(user: User | null | undefined): user is User {
  if (!user) return false;

  const anonymousFlag = (user as User & { is_anonymous?: boolean }).is_anonymous;
  if (anonymousFlag === true) return false;

  return user.app_metadata?.provider !== "anonymous";
}

export function safeNextPath(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function currentRelativePath() {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function loginHref(nextPath?: string) {
  const next = safeNextPath(nextPath || currentRelativePath());
  return `/login?next=${encodeURIComponent(next)}`;
}
