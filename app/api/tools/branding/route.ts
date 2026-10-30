import { NextResponse } from "next/server";
import { bearer, publicSupabase } from "@/lib/phase2/supabase";
import { serverRateLimit } from "@/lib/serverRateLimit";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function POST(request: Request) {
 const limited = serverRateLimit(request, "business-branding", 120, 60000); if (limited) return limited;
 const token = bearer(request); if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers });
 try {
  const text = await request.text(); if (text.length > 1500000) return NextResponse.json({ error: "Logo is too large." }, { status: 413, headers });
  const body = JSON.parse(text);
  if (!["status", "read", "save", "remove"].includes(body?.action)) return NextResponse.json({ error: "Invalid action." }, { status: 400, headers });
  const { data, error } = await publicSupabase(token).functions.invoke("loadlink-business-branding", { body });
  if (error) {
   const response = error.context as Response | undefined;
   let message = "Business branding is temporarily unavailable.";
   try { message = (await response?.json())?.error || message; } catch {}
   return NextResponse.json({ error: message }, { status: response?.status || 503, headers });
  }
  if (body.action === "read") {
   if (!(data instanceof Blob) || data.size > 1000000 || !data.size) return NextResponse.json({ error: "The logo could not load." }, { status: 502, headers });
   return new Response(data, { headers: { ...headers, "Content-Type": "image/png" } });
  }
  return NextResponse.json(data, { headers });
 } catch { return NextResponse.json({ error: "Business branding could not finish." }, { status: 503, headers }); }
}
