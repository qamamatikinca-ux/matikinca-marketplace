import type { LoadLinkRole, PlatformCapability, PlatformContext } from "./contracts";

const roleCapabilities: Record<LoadLinkRole, PlatformCapability[]> = {
  guest: ["browse"],
  standard: ["browse", "post_job", "message", "basic_insights"],
  pro: ["browse", "post_job", "post_vehicle", "message", "basic_insights", "advanced_analytics"],
  dealer: ["browse", "post_job", "post_vehicle", "message", "basic_insights", "advanced_analytics", "dealer_tools"],
  admin: ["browse", "post_job", "post_vehicle", "message", "basic_insights", "advanced_analytics", "dealer_tools", "moderate"],
};

export function can(context: PlatformContext, capability: PlatformCapability): boolean {
  if (context.suspended) return capability === "browse";
  if (!context.authenticated && capability !== "browse") return false;
  return roleCapabilities[context.role].includes(capability);
}

export function resolveRole(input: {
  authenticated: boolean;
  plan?: string | null;
  isAdmin?: boolean;
}): LoadLinkRole {
  if (!input.authenticated) return "guest";
  if (input.isAdmin) return "admin";
  if (input.plan === "dealer") return "dealer";
  if (input.plan === "pro") return "pro";
  return "standard";
}

export const packageLimits = {
  manual: { photoLimit: 5, dailyMessageLimit: 50, analyticsEnabled: false, featuredEnabled: false },
  pro: { photoLimit: 15, dailyMessageLimit: null, analyticsEnabled: true, featuredEnabled: true },
  dealer: { photoLimit: 15, dailyMessageLimit: null, analyticsEnabled: true, featuredEnabled: true },
} as const;
