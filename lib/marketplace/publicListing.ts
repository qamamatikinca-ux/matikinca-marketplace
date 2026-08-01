export const PUBLIC_LISTING_FIELDS = [
  "id",
  "title",
  "city",
  "province",
  "vehicle_group",
  "listing_kind",
  "rate",
  "price_amount",
  "price_type",
  "posted_by",
  "poster_photo",
  "description",
  "photos",
  "video_url",
  "sponsored",
  "package_type",
  "created_at",
  "expires_at",
  "featured_until",
  "view_count",
  "dealership_id",
  "stock_status",
  "moderation_status",
  "status",
  "vehicle_type",
  "vehicle_year",
  "brand",
  "model",
  "body_type",
  "transmission",
  "fuel_type",
  "axle_configuration",
  "odometer_km",
  "gvm_kg",
  "payload_kg",
  "condition",
  "service_history",
  "previous_owners",
  "verification_level",
  "sponsor_label",
  "sponsored_until",
  "document_check_status",
  "route_start",
  "route_end",
  "route_distance_km",
  "load_type",
  "required_equipment",
  "rate_amount",
  "rate_unit",
  "payment_terms",
  "recurrence_type",
  "recurrence_until",
  "work_starts_at",
  "work_ends_at",
] as const;

export const PUBLIC_LISTING_SELECT = PUBLIC_LISTING_FIELDS.join(",");

export type PublicListing = Partial<Record<(typeof PUBLIC_LISTING_FIELDS)[number], unknown>> & { id: string; title: string };

export function isPubliclyVisible(row: Record<string, unknown>) {
  const moderation = String(row.moderation_status || "approved");
  const status = String(row.status || "active");
  const stock = String(row.stock_status || "available");
  const expires = row.expires_at ? new Date(String(row.expires_at)).getTime() : null;
  return moderation === "approved" && ["active", "approved"].includes(status) && stock !== "archived" && (!expires || expires > Date.now());
}
