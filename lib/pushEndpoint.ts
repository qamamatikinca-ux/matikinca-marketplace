// Push subscriptions are client input. Never let them choose arbitrary server
// request destinations, including previously stored subscriptions.
export function isTrustedPushEndpoint(value: string): boolean {
  if (!value || value.length > 3000) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) return false;
    const host = url.hostname;
    return host === "fcm.googleapis.com"
      || host === "android.googleapis.com"
      || host === "updates.push.services.mozilla.com"
      || host === "web.push.apple.com"
      || host.endsWith(".notify.windows.com");
  } catch {
    return false;
  }
}
