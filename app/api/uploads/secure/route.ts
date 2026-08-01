import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { authenticatedUser, safeApiError } from "@/lib/server/supabase";
import { requestIdentity, rateLimitHeaders, takeRateLimit } from "@/lib/server/rateLimit";

const MAX_PUBLIC_IMAGE = 12 * 1024 * 1024;
const MAX_PRIVATE_DOCUMENT = 8 * 1024 * 1024;

const CATEGORIES = {
  "listing-photo": { bucket: "job-photos", public: true, kind: "image", max: MAX_PUBLIC_IMAGE },
  "profile-photo": { bucket: "profile-media", public: true, kind: "image", max: MAX_PUBLIC_IMAGE },
  "dealership-asset": { bucket: "dealership-assets", public: true, kind: "image", max: MAX_PUBLIC_IMAGE },
  "vehicle-document": { bucket: "vehicle-verification", public: false, kind: "document", max: MAX_PRIVATE_DOCUMENT },
  "verification-document": { bucket: "verification-documents", public: false, kind: "document", max: MAX_PRIVATE_DOCUMENT },
  "dealership-document": { bucket: "dealership-documents", public: false, kind: "document", max: MAX_PRIVATE_DOCUMENT },
  "message-attachment": { bucket: "chat-attachments", public: false, kind: "message", max: MAX_PRIVATE_DOCUMENT },
} as const;

type Category = keyof typeof CATEGORIES;

type Inspected = { mime: string; extension: string };

function inspect(bytes: Uint8Array, filename: string, kind: string): Inspected {
  const head = Buffer.from(bytes.subarray(0, 16));
  const body = Buffer.from(bytes).toString("latin1");
  const jpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const png = head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = head.subarray(0, 4).toString("ascii") === "RIFF" && head.subarray(8, 12).toString("ascii") === "WEBP";
  const pdf = head.subarray(0, 5).toString("ascii") === "%PDF-";
  const mp4 = head.subarray(4, 8).toString("ascii") === "ftyp";
  const audioWebm = head.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));

  if (jpeg) return { mime: "image/jpeg", extension: "jpg" };
  if (png) return { mime: "image/png", extension: "png" };
  if (webp) return { mime: "image/webp", extension: "webp" };
  if (pdf && kind !== "image") {
    if (!body.includes("%%EOF")) throw new Error("The PDF is incomplete.");
    if (/\/Encrypt\b|\/JavaScript\b|\/JS\b|\/OpenAction\b|\/Launch\b|\/EmbeddedFile\b/i.test(body)) {
      throw new Error("The PDF contains an unsafe feature.");
    }
    return { mime: "application/pdf", extension: "pdf" };
  }
  if (kind === "message" && mp4) return { mime: "video/mp4", extension: "mp4" };
  if (kind === "message" && audioWebm) return { mime: "audio/webm", extension: "webm" };
  throw new Error(`Unsupported file content: ${filename}`);
}

export async function POST(request: Request) {
  const limiter = takeRateLimit(`upload:${requestIdentity(request)}`, 40, 60 * 60_000);
  if (!limiter.allowed) return NextResponse.json({ error: "Upload limit reached. Try again later." }, { status: 429, headers: rateLimitHeaders(limiter) });

  try {
    const { user, client } = await authenticatedUser(request);
    const form = await request.formData();
    const category = String(form.get("category") || "") as Category;
    const file = form.get("file");
    const recordId = String(form.get("recordId") || "pending").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
    const config = CATEGORIES[category];
    if (!config) return NextResponse.json({ error: "Unsupported upload category." }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
    if (file.size < 1 || file.size > config.max) {
      return NextResponse.json({ error: `The file must be smaller than ${Math.floor(config.max / 1024 / 1024)} MB.` }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const inspected = inspect(bytes, file.name, config.kind);
    const hash = createHash("sha256").update(bytes).digest("hex");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-90) || `file.${inspected.extension}`;
    const path = category === "message-attachment"
      ? `${recordId}/${user.id}/${crypto.randomUUID()}-${safeName}`
      : `${user.id}/${recordId}/${crypto.randomUUID()}-${safeName}`;

    const upload = await client.storage.from(config.bucket).upload(path, bytes, {
      contentType: inspected.mime,
      cacheControl: config.public ? "31536000" : "3600",
      upsert: false,
    });
    if (upload.error) throw upload.error;

    const publicUrl = config.public ? client.storage.from(config.bucket).getPublicUrl(path).data.publicUrl : null;
    return NextResponse.json({
      upload: { bucket: config.bucket, path, publicUrl, mimeType: inspected.mime, sizeBytes: file.size, sha256: hash },
    }, { status: 201, headers: rateLimitHeaders(limiter) });
  } catch (error) {
    const safe = safeApiError(error, "The file failed security validation or could not be uploaded.");
    return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status === 500 ? 400 : safe.status, headers: rateLimitHeaders(limiter) });
  }
}
