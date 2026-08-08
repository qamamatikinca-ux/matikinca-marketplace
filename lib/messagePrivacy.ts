export type MessagePrivacyPreferences = {
  activityVisible: boolean;
  typingIndicators: boolean;
  allowNewRequests: boolean;
  notificationPreviews: boolean;
};

const STORAGE_KEY = "loadlink-message-privacy-v1";

export const DEFAULT_MESSAGE_PRIVACY: MessagePrivacyPreferences = {
  activityVisible: true,
  typingIndicators: true,
  allowNewRequests: true,
  notificationPreviews: false,
};

function normalise(value: Partial<MessagePrivacyPreferences> | null | undefined): MessagePrivacyPreferences {
  return {
    activityVisible: value?.activityVisible ?? DEFAULT_MESSAGE_PRIVACY.activityVisible,
    typingIndicators: value?.typingIndicators ?? DEFAULT_MESSAGE_PRIVACY.typingIndicators,
    allowNewRequests: value?.allowNewRequests ?? DEFAULT_MESSAGE_PRIVACY.allowNewRequests,
    notificationPreviews: value?.notificationPreviews ?? DEFAULT_MESSAGE_PRIVACY.notificationPreviews,
  };
}

export function readMessagePrivacy(): MessagePrivacyPreferences {
  if (typeof window === "undefined") return DEFAULT_MESSAGE_PRIVACY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalise(JSON.parse(raw) as Partial<MessagePrivacyPreferences>) : DEFAULT_MESSAGE_PRIVACY;
  } catch {
    return DEFAULT_MESSAGE_PRIVACY;
  }
}

export function writeMessagePrivacy(next: Partial<MessagePrivacyPreferences>): MessagePrivacyPreferences {
  const merged = normalise({ ...readMessagePrivacy(), ...next });
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
    window.dispatchEvent(new CustomEvent("loadlink-message-privacy-updated", { detail: merged }));
  }
  return merged;
}

export function profileRowToMessagePrivacy(row: Record<string, unknown> | null | undefined): MessagePrivacyPreferences {
  return normalise({
    activityVisible: typeof row?.message_activity_visible === "boolean" ? row.message_activity_visible : undefined,
    typingIndicators: typeof row?.message_typing_indicators === "boolean" ? row.message_typing_indicators : undefined,
    allowNewRequests: typeof row?.message_requests_enabled === "boolean" ? row.message_requests_enabled : undefined,
    notificationPreviews: typeof row?.message_notification_previews === "boolean" ? row.message_notification_previews : undefined,
  });
}
