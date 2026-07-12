import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseConfig() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";

  const key =
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "";

  return { url: url.replace(/\/$/, ""), key };
}

async function supabaseRequest(url: string, key: string, path: string, init?: RequestInit) {
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

export async function GET() {
  const { url, key } = getSupabaseConfig();

  if (!url.startsWith("https://") || !key) {
    return NextResponse.json(
      { error: "The live deployment is missing its Supabase project URL or publishable key." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Read the real table first. The user already confirmed that public SELECT
  // can see seven rows in this project.
  let response = await supabaseRequest(
    url,
    key,
    "job_listings?select=*&order=created_at.desc.nullslast",
  );

  // Fall back to the public RPC installed by the LoadLink repair SQL.
  if (!response.ok) {
    response = await supabaseRequest(url, key, "rpc/get_public_job_listings", {
      method: "POST",
      body: "{}",
    });
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    return NextResponse.json(
      {
        error: "The connected Supabase project did not return its listings.",
        details: details.slice(0, 400),
      },
      { status: response.status || 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const rows = await response.json();
  const visibleRows = Array.isArray(rows)
    ? rows.filter((row) => !row?.status || row.status === "active")
    : [];
  return NextResponse.json(
    { rows: visibleRows },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
  );
}
