import { NextResponse } from "next/server";
import { authenticatedUser, safeApiError } from "@/lib/server/supabase";

const ALLOWED_TYPES = new Set(["vehicle", "job", "contract", "driver", "dealership"]);

type SavedReference = { entity_type: string; entity_id: string; created_at: string };
type SavedCard = SavedReference & {
  id: string;
  title: string;
  href: string;
  category: string;
  image?: string;
  meta?: string;
};

export async function GET(request: Request) {
  try {
    const { user, client } = await authenticatedUser(request);
    const result = await client
      .from("saved_marketplace_items")
      .select("entity_type,entity_id,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (result.error) throw result.error;

    const references = (result.data || []) as SavedReference[];
    const listingIds = references.filter((item) => ["vehicle", "job", "contract"].includes(item.entity_type)).map((item) => item.entity_id);
    const dealershipIds = references.filter((item) => item.entity_type === "dealership").map((item) => item.entity_id);
    const driverIds = references.filter((item) => item.entity_type === "driver").map((item) => item.entity_id);

    const [listingResult, dealershipResult, driverResult] = await Promise.all([
      listingIds.length
        ? client.from("loadlink_public_listings").select("id,title,listing_kind,city,province,rate,photos,vehicle_type,vehicle_group").in("id", listingIds)
        : Promise.resolve({ data: [], error: null }),
      dealershipIds.length
        ? client.from("loadlink_public_dealerships").select("id,slug,name,profile_image_url,physical_location,province").in("id", dealershipIds)
        : Promise.resolve({ data: [], error: null }),
      driverIds.length
        ? client.from("loadlink_public_driver_profiles").select("id,full_name,profile_image_url,headline,city,province,licence_code,years_experience").in("id", driverIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (listingResult.error) throw listingResult.error;
    if (dealershipResult.error) throw dealershipResult.error;
    if (driverResult.error) throw driverResult.error;

    const listings = new Map((listingResult.data || []).map((row: any) => [String(row.id), row]));
    const dealerships = new Map((dealershipResult.data || []).map((row: any) => [String(row.id), row]));
    const drivers = new Map((driverResult.data || []).map((row: any) => [String(row.id), row]));

    const items = references.map((reference): SavedCard | null => {
      if (["vehicle", "job", "contract"].includes(reference.entity_type)) {
        const row: any = listings.get(reference.entity_id);
        if (!row) return null;
        const type = reference.entity_type === "vehicle" ? "Vehicle" : reference.entity_type === "contract" ? "Contract" : "Job";
        return {
          ...reference,
          id: reference.entity_id,
          title: String(row.title || `Saved ${type.toLowerCase()}`),
          href: reference.entity_type === "vehicle" ? `/vehicles/${reference.entity_id}` : `/jobs/${reference.entity_id}`,
          category: type,
          image: Array.isArray(row.photos) ? row.photos.find(Boolean) : undefined,
          meta: [row.city, row.province, row.rate].filter(Boolean).join(" · ") || "Open saved item",
        };
      }
      if (reference.entity_type === "dealership") {
        const row: any = dealerships.get(reference.entity_id);
        if (!row) return null;
        return {
          ...reference,
          id: reference.entity_id,
          title: String(row.name || "Saved dealership"),
          href: `/dealership/${row.slug || reference.entity_id}`,
          category: "Dealership",
          image: row.profile_image_url || undefined,
          meta: [row.physical_location, row.province].filter(Boolean).join(" · ") || "Verified LoadLink dealership",
        };
      }
      const row: any = drivers.get(reference.entity_id);
      if (!row) return null;
      return {
        ...reference,
        id: reference.entity_id,
        title: String(row.full_name || "Saved driver"),
        href: "/drivers",
        category: "Driver",
        meta: [row.headline, row.city, row.licence_code ? `Licence ${row.licence_code}` : null].filter(Boolean).join(" · ") || "Approved driver profile",
      };
    }).filter(Boolean) as SavedCard[];

    return NextResponse.json({ items, references });
  } catch (error) {
    const safe = safeApiError(error, "Saved items could not be loaded.");
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}

export async function POST(request: Request) {
  try {
    const { user, client } = await authenticatedUser(request);
    const body = (await request.json()) as { entityType?: string; entityId?: string };
    const entityType = String(body.entityType || "").toLowerCase();
    const entityId = String(body.entityId || "").slice(0, 120);
    if (!ALLOWED_TYPES.has(entityType) || !entityId) {
      return NextResponse.json({ error: "Invalid saved item." }, { status: 400 });
    }
    const result = await client.from("saved_marketplace_items").upsert(
      { user_id: user.id, entity_type: entityType, entity_id: entityId },
      { onConflict: "user_id,entity_type,entity_id" },
    );
    if (result.error) throw result.error;
    return NextResponse.json({ saved: true }, { status: 201 });
  } catch (error) {
    const safe = safeApiError(error, "The item could not be saved.");
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}

export async function DELETE(request: Request) {
  try {
    const { user, client } = await authenticatedUser(request);
    const url = new URL(request.url);
    const entityType = String(url.searchParams.get("entityType") || "").toLowerCase();
    const entityId = String(url.searchParams.get("entityId") || "").slice(0, 120);
    if (!ALLOWED_TYPES.has(entityType) || !entityId) {
      return NextResponse.json({ error: "Invalid saved item." }, { status: 400 });
    }
    const result = await client
      .from("saved_marketplace_items")
      .delete()
      .eq("user_id", user.id)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId);
    if (result.error) throw result.error;
    return NextResponse.json({ saved: false });
  } catch (error) {
    const safe = safeApiError(error, "The saved item could not be removed.");
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
