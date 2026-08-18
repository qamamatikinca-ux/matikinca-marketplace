import type { DealerRole, DealerSection, DealerStatusType } from "./types";

export const DEALER_PRICE_CENTS = 299900;
export const DEALER_RECOMMENDED_PHOTOS = 10;
export const DEALER_PHOTO_LIMIT = 15;
export const DEALER_INCLUDED_STAFF_SEATS = 5;
export const DEALER_STATUS_LIFETIME_HOURS = 24;
export const DEALER_STATUS_VIDEO_MAX_SECONDS = 60;
export const DEALER_STATUS_PHOTO_SECONDS = 30;

// Daily dealership work stays intentionally small. Advanced tools remain available
// in the More menu, but they no longer compete with stock, leads and messages.
export const DEALER_PRIMARY_NAV: Array<{ id: DealerSection; label: string }> = [
  { id: "overview", label: "Home" },
  { id: "inventory", label: "Stock" },
  { id: "leads", label: "Leads" },
  { id: "messages", label: "Inbox" },
];

export const DEALER_MORE_NAV: Array<{ id: DealerSection; label: string }> = [
  { id: "analytics", label: "Analytics" },
  { id: "customers", label: "Customers" },
  { id: "marketing", label: "Marketing" },
  { id: "showroom", label: "Dealer page" },
  { id: "team", label: "Team" },
  { id: "verification", label: "Verification" },
  { id: "billing", label: "Plan & billing" },
  { id: "reviews", label: "Reviews" },
  { id: "activity", label: "Activity" },
  { id: "settings", label: "Settings" },
  { id: "support", label: "Support" },
];

export const DEALER_ROLES: Array<{ value: DealerRole; label: string }> = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "sales_agent", label: "Sales" },
  { value: "inventory_editor", label: "Inventory" },
  { value: "analyst", label: "Analyst" },
];

export const LEAD_STAGES = [
  ["new", "New"],
  ["contacted", "Contacted"],
  ["qualified", "Qualified"],
  ["viewing", "Viewing"],
  ["negotiation", "Negotiation"],
  ["finance", "Finance"],
  ["won", "Won"],
  ["lost", "Lost"],
] as const;

export const LEAD_SOURCES = ["LoadLink", "WhatsApp", "Phone", "Walk-in", "Website", "Facebook", "Instagram", "Referral", "Repeat customer", "Other"];

export const DEALER_STATUS_TYPES: Array<{ value: DealerStatusType; label: string; detail: string }> = [
  { value: "photo", label: "Photo", detail: "Photo shown for 30 seconds" },
  { value: "video", label: "Video", detail: "Video up to 60 seconds" },
  { value: "vehicle", label: "Vehicle card", detail: "A status built from live stock" },
  { value: "text", label: "Text status", detail: "A short dealership announcement" },
  { value: "promotion", label: "Promotion card", detail: "A timed stock or price promotion" },
];

export const LOST_REASONS = ["Price", "No response", "Finance declined", "Bought elsewhere", "Vehicle unavailable", "Other"];
