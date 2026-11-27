import { DEALER_PLAN_BENEFITS } from "@/lib/dealer/access";

/** Advertising benefits reflected in the server's plan and preflight rules.
 * This is presentation metadata, never authorization. */
export const VEHICLE_PLAN_RULES = {
  standard: {
    label:"Standard", monthlyListings:5, photoLimit:2, dailyMessages:50,
    features:[
      "Up to 5 vehicle listings per month (maximum 5 active Manual listings)",
      "Up to 2 actual-vehicle photos per listing",
      "50 messages per day",
      "Standard marketplace visibility",
      "Daily paid listing credit; no automatic monthly subscription",
    ],
  },
  pro: {
    label:"Pro", monthlyListings:10, photoLimit:10, dailyMessages:null,
    features:[
      "Up to 10 new vehicle listings per month",
      "Up to 10 photos per vehicle listing",
      "Unlimited marketplace messages",
      "Vehicle listing engagement analytics",
      "Higher marketplace search visibility",
      "Priority support",
      "No Standard daily vehicle listing activation charge",
    ],
  },
  dealer: {
    label:"Dealer", monthlyListings:null, photoLimit:30, dailyMessages:null,
    features:[...DEALER_PLAN_BENEFITS],
  },
} as const;
export type VehiclePlanTier=keyof typeof VEHICLE_PLAN_RULES;
