import { NextResponse } from "next/server";
import { authenticatedUser, safeApiError } from "@/lib/server/supabase";

async function dealershipId(client: any, slug: string) {
  const cleanSlug = decodeURIComponent(slug).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 120);
  const result = await client.from("dealership_profiles").select("id").eq("slug", cleanSlug).eq("verification_status", "approved").eq("is_public", true).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw new Error("This dealership is not available.");
  return String(result.data.id);
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const { user, client } = await authenticatedUser(request);
    const id = await dealershipId(client, slug);
    const result = await client.from("dealership_followers").upsert({ dealership_id: id, user_id: user.id }, { onConflict: "dealership_id,user_id" });
    if (result.error) throw result.error;
    const social = await client.rpc("loadlink_dealership_social_status", { p_dealership_id: id });
    return NextResponse.json({ following: true, social: social.data || {} });
  } catch (error) {
    const safe = safeApiError(error, "This dealership could not be followed.");
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const { user, client } = await authenticatedUser(request);
    const id = await dealershipId(client, slug);
    const result = await client.from("dealership_followers").delete().eq("dealership_id", id).eq("user_id", user.id);
    if (result.error) throw result.error;
    const social = await client.rpc("loadlink_dealership_social_status", { p_dealership_id: id });
    return NextResponse.json({ following: false, social: social.data || {} });
  } catch (error) {
    const safe = safeApiError(error, "This dealership could not be unfollowed.");
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
