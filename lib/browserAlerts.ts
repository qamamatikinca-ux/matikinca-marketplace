"use client";

export type BrowserAlertState = "unsupported" | "blocked" | "enabled" | "disabled";

export function getBrowserAlertState(): BrowserAlertState {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  return Notification.permission === "granted" ? "enabled" : Notification.permission === "denied" ? "blocked" : "disabled";
}

/** Call only from an explicit user gesture. Does not imply browser-closed push is configured. */
export async function enableBrowserAlerts(): Promise<BrowserAlertState> {
  if (getBrowserAlertState() === "unsupported") return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "blocked" : "disabled";
  await navigator.serviceWorker.register("/loadlink-sw.js", { scope: "/" });
  return "enabled";
}

/** Real notifications while LoadLink is open, even in a background tab. */
export async function showLoadLinkBrowserAlert(notification: {
  id: string; title: string; body: string; href?: string | null;
}): Promise<void> {
  if (typeof document === "undefined" || document.visibilityState === "visible" || getBrowserAlertState() !== "enabled") return;
  const href = notification.href && notification.href.startsWith("/") && !notification.href.startsWith("//") && !/[\\\u0000-\u001f\u007f]/.test(notification.href)
    ? notification.href : "/notifications";
  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) return;
    await registration.showNotification(notification.title || "LoadLink", {
      body: notification.body || "You have a new update on LoadLink.",
      icon: "/images/loadlink-logo-light.png",
      badge: "/images/loadlink-logo-light.png",
      tag: "loadlink-in-app-" + notification.id,
      data: { url: href },
    });
  } catch {
    // Browser permissions or OS-level limitations may prevent display.
  }
}
