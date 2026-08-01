import { safeNextPath } from "@/lib/auth";

export function safeInternalHref(value: string | null | undefined, fallback = "/account") {
  return safeNextPath(value, fallback);
}
