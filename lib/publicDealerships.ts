export type PublicDealership = {
  id: string; slug: string; name: string; profile_image_url: string | null;
  short_bio: string | null; physical_location: string | null;
  follower_count: number; active_listing_count: number;
  latitude?: number | null; longitude?: number | null;
};
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
export function normalizePublicDealerships(value: unknown): PublicDealership[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(raw => {
    if (!raw || typeof raw !== "object") return [];
    const row = raw as Record<string, unknown>;
    const id = text(row.id), slug = text(row.slug), name = text(row.name);
    if (!id || !slug || !name || !/^[a-z0-9][a-z0-9-]*$/i.test(slug)) return [];
    const count = (input: unknown) => Number.isFinite(Number(input)) ? Math.max(0, Number(input)) : 0;
    return [{ id, slug, name, profile_image_url: text(row.profile_image_url) || null,
      short_bio: text(row.short_bio) || null, physical_location: text(row.physical_location) || null,
      follower_count: count(row.follower_count), active_listing_count: count(row.active_listing_count),
      latitude: row.latitude != null && Number.isFinite(Number(row.latitude)) ? Number(row.latitude) : null,
      longitude: row.longitude != null && Number.isFinite(Number(row.longitude)) ? Number(row.longitude) : null,
    }];
  });
}
