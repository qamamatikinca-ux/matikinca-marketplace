import type { DealerSection, DealerWorkspaceState } from "./types";

export const DEALER_PLAN_BENEFITS = [
  "Unlimited commercial vehicle inventory",
  "Up to 30 photos on each listing",
  "Public dealership profile and searchable showroom",
  "Organise available, reserved and sold stock",
  "Capture enquiries and manage sales leads",
  "Customer follow-ups, appointments and quotations",
  "Dealership updates and stock promotions",
  "Staff access with defined permissions",
  "Inventory, engagement and sales performance insights",
  "Media library and bulk stock management",
] as const;

export const DEALER_SECTION_PERMISSIONS: Partial<Record<DealerSection, string>> = {
  inventory: "inventory.read",
  leads: "leads.read",
  customers: "customers.read",
  messages: "messages.read",
  analytics: "analytics.read",
  marketing: "marketing.read",
  team: "team.read",
  showroom: "showroom.read",
  verification: "verification.read",
  billing: "billing.read",
  reviews: "reviews.read",
  activity: "activity.read",
  settings: "showroom.write",
};

export function canOpenDealerSection(context: DealerWorkspaceState, section: DealerSection): boolean {
  const permission = DEALER_SECTION_PERMISSIONS[section];
  return !permission || context.permissions.includes(permission as DealerWorkspaceState["permissions"][number]);
}
