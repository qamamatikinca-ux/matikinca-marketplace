export type LoadLinkRole = "guest" | "standard" | "pro" | "dealer" | "admin";
export type LoadLinkPlan = "manual" | "pro" | "dealer";

export type PlatformCapability =
  | "browse"
  | "post_job"
  | "post_vehicle"
  | "message"
  | "basic_insights"
  | "advanced_analytics"
  | "dealer_tools"
  | "moderate";

export type PlatformContext = {
  authenticated: boolean;
  role: LoadLinkRole;
  plan: LoadLinkPlan | null;
  verified: boolean;
  suspended?: boolean;
};

export type ListingHealthInput = {
  title?: string | null;
  description?: string | null;
  city?: string | null;
  province?: string | null;
  images?: string[] | null;
  price?: number | null;
  contactReady?: boolean;
};

export type ListingHealth = {
  score: number;
  label: "Needs attention" | "Good" | "Strong";
  recommendations: string[];
};
