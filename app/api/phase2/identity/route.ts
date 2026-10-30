import { NextResponse } from "next/server";
import { bearer, publicSupabase } from "@/lib/phase2/supabase";
import { serverRateLimit } from "@/lib/serverRateLimit";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function POST(request: Request) {
 const limited = serverRateLimit(request, "driver-identity", 45, 60_000);
 if (limited) return limited;
 const token = bearer(request);
 if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers });
 try {
  const text = await request.text();
  if (text.length > 6000) return NextResponse.json({ error: "Request too large." }, { status: 413, headers });
  let body; try { body = JSON.parse(text); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400, headers }); }
  if (!body || !["status", "document", "start", "finish", "manual"].includes(body.action)) return NextResponse.json({ error: "Invalid action." }, { status: 400, headers });
  const client = publicSupabase(token);
  const { data, error, response: upstream } = await client.functions.invoke("loadlink-driver-identity", { body });
  if (error) {
   let message = "Driver verification is temporarily unavailable. Please retry.";
   const context = error.context as Response | undefined;
   if (context) { try { message = (await context.json()).error || message; } catch {} }
   return NextResponse.json({ error: message }, { status: context?.status || 503, headers });
  }
  if (body.action === "document") {
   const mime = upstream?.headers.get("X-Identity-Mime") || data?.type;
   if (!(data instanceof Blob) || !["image/jpeg", "image/png", "application/pdf"].includes(mime) || !data.size || data.size > 8388608) {
    return NextResponse.json({ error: "Your ID photo could not be opened. Please upload a clear JPG or PNG and retry." }, { status: 502, headers });
   }
   return new Response(data, { headers: { ...headers, "Content-Type": mime } });
  }
  return NextResponse.json(data, { headers });
 } catch { return NextResponse.json({ error: "Driver verification could not finish. Please retry." }, { status: 503, headers }); }
}
