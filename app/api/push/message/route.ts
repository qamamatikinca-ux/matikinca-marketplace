import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";

function hashKey(value: string) { return createHash("sha256").update(value).digest("hex"); }

export async function POST(request: NextRequest) {
  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
    const privateKey = process.env.VAPID_PRIVATE_KEY || "";
    const subject = process.env.VAPID_SUBJECT || "mailto:loadlinksouthafrica@gmail.com";
    if (!url || !anon || !service || !publicKey || !privateKey) return NextResponse.json({ ok: false, disabled: true });

    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
    if (!bearer) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const authClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: userError } = await authClient.auth.getUser(bearer);
    if (userError || !user) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

    const body = await request.json();
    const threadId = String(body?.threadId || "");
    const requestedPreview = String(body?.preview || "New LoadLink message").slice(0, 180);
    if (!/^[0-9a-f-]{36}$/i.test(threadId)) return NextResponse.json({ error: "Invalid conversation." }, { status: 400 });

    const [{ data: thread }, { data: senderKeys }] = await Promise.all([
      admin.from("listing_guest_threads").select("id,buyer_hash,listing_id").eq("id", threadId).maybeSingle(),
      admin.from("user_chat_access_keys").select("access_key_hash").eq("user_id", user.id),
    ]);
    if (!thread) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    const { data: listing } = await admin.from("job_listings").select("owner_key,title").eq("id", thread.listing_id).maybeSingle();
    if (!listing?.owner_key) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    const senderHashes = new Set((senderKeys || []).map((row) => String(row.access_key_hash)));
    const ownerHash = hashKey(String(listing.owner_key));
    const buyerHash = String(thread.buyer_hash || "");
    const senderIsBuyer = senderHashes.has(buyerHash);
    const senderIsOwner = senderHashes.has(ownerHash);
    if (!senderIsBuyer && !senderIsOwner) return NextResponse.json({ error: "Conversation access denied." }, { status: 403 });
    const recipientHash = senderIsBuyer ? ownerHash : buyerHash;
    const { data: recipientKey } = await admin.from("user_chat_access_keys").select("user_id").eq("access_key_hash", recipientHash).maybeSingle();
    if (!recipientKey?.user_id) return NextResponse.json({ ok: true, delivered: 0 });
    const recipientId = String(recipientKey.user_id);
    if (recipientId === user.id) return NextResponse.json({ ok: true, delivered: 0 });

    const [{ data: profile }, { data: subscriptions }] = await Promise.all([
      admin.from("profiles").select("message_notification_previews,chat_notifications").eq("id", recipientId).maybeSingle(),
      admin.from("loadlink_push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", recipientId),
    ]);
    if (profile?.chat_notifications === false || !subscriptions?.length) return NextResponse.json({ ok: true, delivered: 0 });
    const showPreview = profile?.message_notification_previews === true;
    const payload = JSON.stringify({
      title: "LoadLink message",
      body: showPreview ? requestedPreview : "You have a new message on LoadLink.",
      url: `/messages?thread=${threadId}`,
      tag: `loadlink-message-${threadId}`,
    });
    webpush.setVapidDetails(subject, publicKey, privateKey);
    let delivered = 0;
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload, { TTL: 60 * 60 });
        delivered += 1;
      } catch (error) {
        const statusCode = Number((error as { statusCode?: unknown })?.statusCode || 0);
        if (statusCode === 404 || statusCode === 410) await admin.from("loadlink_push_subscriptions").delete().eq("id", subscription.id);
      }
    }
    return NextResponse.json({ ok: true, delivered });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Push delivery failed." }, { status: 500 });
  }
}
