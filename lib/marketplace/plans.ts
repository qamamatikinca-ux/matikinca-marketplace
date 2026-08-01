export const PLAN_RULES = {
  standard: { code: "standard", name: "Standard", listingImages: 5, dailyMessages: 50, analytics: false, dealerTools: false },
  pro: { code: "pro", name: "Pro", listingImages: 15, dailyMessages: Number.POSITIVE_INFINITY, analytics: true, dealerTools: false },
  dealer: { code: "dealer", name: "Dealership", listingImages: 15, dailyMessages: Number.POSITIVE_INFINITY, analytics: true, dealerTools: true },
} as const;

export type PlanCode = keyof typeof PLAN_RULES;

export function planRule(value: unknown) {
  const code = String(value || "standard").toLowerCase() as PlanCode;
  return PLAN_RULES[code] || PLAN_RULES.standard;
}
