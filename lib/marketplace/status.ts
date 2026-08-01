export const MARKETPLACE_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "active",
  "reserved",
  "sold",
  "suspended",
  "expired",
  "archived",
] as const;

export type MarketplaceStatus = (typeof MARKETPLACE_STATUSES)[number];

export const STATUS_LABELS: Record<MarketplaceStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Needs changes",
  active: "Active",
  reserved: "Reserved",
  sold: "Sold",
  suspended: "Suspended",
  expired: "Expired",
  archived: "Archived",
};

export function normaliseMarketplaceStatus(value: unknown): MarketplaceStatus {
  const clean = String(value || "").toLowerCase().replaceAll("-", "_");
  if ((MARKETPLACE_STATUSES as readonly string[]).includes(clean)) return clean as MarketplaceStatus;
  if (clean === "pending") return "submitted";
  if (clean === "verified") return "approved";
  if (clean === "available") return "active";
  return "draft";
}
