export type CommunicationStatus = "draft" | "scheduled" | "live" | "paused" | "archived";
export type CommunicationAudience = "all" | "drivers" | "dealerships" | "pro" | "dealer";
export type CommunicationSurface = "banner" | "toast" | "modal" | "inbox";
export type CommunicationPosition = "top" | "bottom" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
export type CommunicationPriority = "normal" | "important" | "urgent";
export type CommunicationEventType = "viewed" | "dismissed" | "acknowledged" | "cta_clicked";

export type LoadLinkCommunication = {
  id: string;
  title: string;
  message: string;
  status: CommunicationStatus;
  audience: CommunicationAudience;
  surface: CommunicationSurface;
  position: CommunicationPosition;
  priority: CommunicationPriority;
  background_color: string;
  text_color: string;
  accent_color: string;
  starts_at: string | null;
  ends_at: string | null;
  dismissible: boolean;
  acknowledgement_required: boolean;
  cta_label: string | null;
  cta_url: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export type LoadLinkCommunicationEvent = {
  campaign_id: string;
  event_type: CommunicationEventType;
};

export const communicationAudienceLabels: Record<CommunicationAudience, string> = {
  all: "All signed-in customers",
  drivers: "Drivers",
  dealerships: "Dealership owners",
  pro: "Pro accounts",
  dealer: "Dealer accounts",
};

export const communicationSurfaceLabels: Record<CommunicationSurface, string> = {
  banner: "Banner",
  toast: "Toast",
  modal: "Important modal",
  inbox: "Notification inbox",
};

export function communicationEventKey(campaignId: string, eventType: CommunicationEventType) {
  return `${campaignId}:${eventType}`;
}

export function communicationPriorityRank(priority: CommunicationPriority) {
  if (priority === "urgent") return 3;
  if (priority === "important") return 2;
  return 1;
}

export function isInternalLoadLinkPath(value: string) {
  return /^\/[A-Za-z0-9/_?=&%#.-]*$/.test(value);
}
