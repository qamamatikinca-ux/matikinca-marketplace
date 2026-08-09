import { NextResponse } from "next/server";

type WindowState = { count: number; resetAt: number };

const windows = new Map<string, WindowState>();

function clientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

function prune(now: number) {
  if (windows.size < 4000) return;
  for (const [key, state] of windows) {
    if (state.resetAt <= now) windows.delete(key);
  }
}

export function serverRateLimit(request: Request, scope: string, limit: number, windowMs: number) {
  const now = Date.now();
  prune(now);
  const ip = clientAddress(request);
  const key = `${scope}:${ip}`;
  const existing = windows.get(key);
  const state = !existing || existing.resetAt <= now
    ? { count: 1, resetAt: now + windowMs }
    : { count: existing.count + 1, resetAt: existing.resetAt };
  windows.set(key, state);

  if (state.count <= limit) return null;
  const retryAfter = Math.max(1, Math.ceil((state.resetAt - now) / 1000));
  return NextResponse.json(
    { error: "Too many requests. Please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } },
  );
}
