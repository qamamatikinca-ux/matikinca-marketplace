const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function GET(_request: Request, context: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId)) return new Response(null, { status: 404, headers });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!url) return new Response(null, { status: 503, headers });
  try {
    const response = await fetch(`${url}/functions/v1/loadlink-driver-portrait?profile=${encodeURIComponent(profileId)}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!response.ok) return new Response(null, { status: response.status === 404 ? 404 : 503, headers });
    const type = response.headers.get("content-type") || "";
    if (!["image/jpeg", "image/png"].includes(type)) return new Response(null, { status: 503, headers });
    return new Response(response.body, { headers: { ...headers, "Content-Type": type, "Content-Disposition": "inline" } });
  } catch { return new Response(null, { status: 503, headers }); }
}
