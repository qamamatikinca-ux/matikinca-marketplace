import { NextResponse } from "next/server";
import { serverRateLimit } from "@/lib/serverRateLimit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CATEGORIES = new Set([
  "suspected_scam",
  "incorrect_information",
  "no_longer_available",
  "duplicate",
  "misleading_price",
  "inappropriate",
  "other",
]);

function config() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  return { url, key };
}

function reportRef(id: string) {
  return `LL-RPT-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

async function supabaseFetch(url: string, key: string, token: string, path: string, init?: RequestInit) {
  return fetch(`${url}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    signal: AbortSignal.timeout(5000),
  });
}

export async function POST(request: Request) {
  const limited = serverRateLimit(request, "listing-report", 10, 60_000);
  if (limited) return limited;

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return NextResponse.json({ error: "Sign in to report a listing." }, { status: 401 });

  const { url, key } = config();
  if (!url.startsWith("https://") || !key) return NextResponse.json({ error: "Reports are temporarily unavailable." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const listingId = String(body?.listingId || "");
  const category = String(body?.category || "");
  const details = String(body?.details || "").trim().slice(0, 1500);

  if (!/^[0-9a-f-]{36}$/i.test(listingId)) return NextResponse.json({ error: "Invalid listing." }, { status: 400 });
  if (!CATEGORIES.has(category)) return NextResponse.json({ error: "Choose a valid report reason." }, { status: 400 });
  if (category === "other" && details.length < 8) return NextResponse.json({ error: "Add a short explanation for this report." }, { status: 400 });

  try {
    const userResponse = await supabaseFetch(url, key, token, "/auth/v1/user");
    if (!userResponse.ok) return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });
    const user = (await userResponse.json()) as { id?: string };
    const userId = String(user.id || "");
    if (!/^[0-9a-f-]{36}$/i.test(userId)) return NextResponse.json({ error: "Your account could not be verified." }, { status: 401 });

    const listingResponse = await supabaseFetch(
      url,
      key,
      token,
      `/rest/v1/loadlink_public_listings?id=eq.${encodeURIComponent(listingId)}&select=id&limit=1`,
    );
    const listings = listingResponse.ok ? await listingResponse.json().catch(() => []) : [];
    if (!Array.isArray(listings) || !listings.length) return NextResponse.json({ error: "This listing is no longer publicly available." }, { status: 404 });

    const duplicateResponse = await supabaseFetch(
      url,
      key,
      token,
      `/rest/v1/user_reports?reporter_user_id=eq.${encodeURIComponent(userId)}&listing_id=eq.${encodeURIComponent(listingId)}&status=eq.open&select=id&limit=1`,
    );
    if (duplicateResponse.ok) {
      const existing = await duplicateResponse.json().catch(() => []);
      if (Array.isArray(existing) && existing[0]?.id) {
        return NextResponse.json({ ok: true, duplicate: true, reference: reportRef(String(existing[0].id)) });
      }
    }

    const insertResponse = await supabaseFetch(url, key, token, "/rest/v1/user_reports?select=id", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        reporter_user_id: userId,
        listing_id: listingId,
        category,
        details: details || null,
        status: "open",
      }),
    });

    if (!insertResponse.ok) {
      return NextResponse.json({ error: "LoadLink could not submit this report." }, { status: 400 });
    }

    const inserted = await insertResponse.json().catch(() => []);
    const id = String(Array.isArray(inserted) ? inserted[0]?.id || "" : "");
    if (!id) return NextResponse.json({ error: "LoadLink could not confirm this report." }, { status: 500 });

    return NextResponse.json({ ok: true, reference: reportRef(id) });
  } catch {
    return NextResponse.json({ error: "Reports are temporarily unavailable." }, { status: 503 });
  }
}
