import type { ListingHealth, ListingHealthInput } from "./contracts";

export function calculateListingHealth(input: ListingHealthInput): ListingHealth {
  let score = 0;
  const recommendations: string[] = [];
  const imageCount = input.images?.filter(Boolean).length ?? 0;

  if ((input.title?.trim().length ?? 0) >= 12) score += 15;
  else recommendations.push("Use a clear title that describes the vehicle or opportunity.");

  if ((input.description?.trim().length ?? 0) >= 80) score += 25;
  else recommendations.push("Add more useful detail to the description.");

  if (input.city && input.province) score += 15;
  else recommendations.push("Add both the city and province.");

  if (imageCount >= 5) score += 30;
  else if (imageCount >= 2) score += 20;
  else if (imageCount === 1) score += 10;
  else recommendations.push("Add clear photos to improve trust and visibility.");

  if (typeof input.price === "number" && input.price > 0) score += 10;
  else recommendations.push("Add an accurate price or rate where applicable.");

  if (input.contactReady) score += 5;
  else recommendations.push("Complete your contact information.");

  const bounded = Math.min(100, score);
  return {
    score: bounded,
    label: bounded >= 80 ? "Strong" : bounded >= 55 ? "Good" : "Needs attention",
    recommendations: recommendations.slice(0, 3),
  };
}
