import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { bearer, publicSupabase } from "@/lib/phase2/supabase";
import { serverRateLimit } from "@/lib/serverRateLimit";

const TYPES = new Set(["identity", "drivers_licence", "prdp", "cv", "driving_certificate"]);
const LABELS: Record<string, string> = {
  identity: "ID or passport",
  drivers_licence: "Driver’s licence",
  prdp: "PrDP",
  cv: "CV",
  driving_certificate: "Driving certificate",
};
const MAX_BYTES = 8 * 1024 * 1024;

class DocumentValidationError extends Error {}

function inspect(bytes: Uint8Array) {
  const head = Buffer.from(bytes.subarray(0, 12));
  const pdf = head.subarray(0, 5).toString("ascii") === "%PDF-";
  const jpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const png = head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

  if (pdf) {
    const body = Buffer.from(bytes).toString("latin1");
    if (!body.includes("%%EOF")) {
      throw new DocumentValidationError("The PDF appears incomplete or damaged. Export or save it again, then retry.");
    }
    if (/\/Encrypt\b/i.test(body)) {
      throw new DocumentValidationError("Password-protected or encrypted PDFs cannot be uploaded. Save an unlocked copy and retry.");
    }
    if (/\/JavaScript\b|\/JS\b|\/OpenAction\b|\/Launch\b|\/EmbeddedFile\b/i.test(body)) {
      throw new DocumentValidationError("This PDF contains active or embedded content. Print or export it as a standard PDF, then retry.");
    }
    return { mime: "application/pdf", extension: "pdf" };
  }
  if (jpeg) return { mime: "image/jpeg", extension: "jpg" };
  if (png) return { mime: "image/png", extension: "png" };
  throw new DocumentValidationError("The selected file is not a valid PDF, JPG or PNG document.");
}

function userError(error: unknown, label: string) {
  if (error instanceof DocumentValidationError) return error.message;
  const raw = error instanceof Error ? error.message : error && typeof error === "object" && "message" in error ? String((error as { message?: unknown }).message || "") : String(error || "");
  if (/jwt|token|auth|session/i.test(raw)) return "Your sign-in session expired. Sign in again and retry.";
  if (/row level security|permission|policy/i.test(raw)) return `${label} could not be saved because document access was rejected. Refresh once and retry.`;
  if (/duplicate|already exists/i.test(raw)) return `${label} already exists. Retry once to replace the previous copy.`;
  if (/payload|too large|maximum|size/i.test(raw)) return `${label} is too large. Maximum file size is 8 MB.`;
  if (/network|fetch|timeout|timed out/i.test(raw)) return `${label} could not be uploaded because the connection was interrupted. Retry when your connection is stable.`;
  if (raw && raw !== "[object Object]") return `${label} could not be uploaded: ${raw}`;
  return `${label} could not be uploaded. Your profile details are still saved.`;
}

export async function POST(request: Request) {
  const limited = serverRateLimit(request, "driver-documents", 12, 10 * 60_000);
  if (limited) return limited;

  let label = "Document";
  try {
    const token = bearer(request);
    if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const client = publicSupabase(token);
    const { data: userData, error: userErrorResult } = await client.auth.getUser(token);
    if (userErrorResult || !userData.user) return NextResponse.json({ error: "Your sign-in session expired. Sign in again and retry." }, { status: 401 });

    const form = await request.formData();
    const type = String(form.get("documentType") ?? "");
    label = LABELS[type] || "Document";
    const file = form.get("file");
    if (!TYPES.has(type)) return NextResponse.json({ error: "Unsupported document type." }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: `Choose a ${label.toLowerCase()} file.` }, { status: 400 });
    if (file.size < 1) return NextResponse.json({ error: `${label} is empty. Choose the original file and retry.` }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: `${label} is too large. Maximum file size is 8 MB.` }, { status: 400 });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const inspected = inspect(bytes);
    const sha256 = createHash("sha256").update(bytes).digest("hex");

    const { data: profile, error: profileError } = await client
      .from("driver_profiles").select("id").eq("user_id", userData.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return NextResponse.json({ error: "Save your profile details before uploading documents." }, { status: 400 });

    const baseName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-90);
    const safeName = baseName || `${type}.${inspected.extension}`;
    const path = `${userData.user.id}/${type}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await client.storage.from("loadlink-driver-documents")
      .upload(path, bytes, { contentType: inspected.mime, cacheControl: "3600", upsert: false });
    if (uploadError) throw uploadError;

    const { data: recorded, error: recordError } = await client.rpc("loadlink_replace_my_driver_document", {
      p_document_type: type,
      p_storage_path: path,
      p_original_filename: file.name.slice(0, 180),
      p_mime_type: inspected.mime,
      p_size_bytes: file.size,
      p_sha256: sha256,
    });

    if (recordError) {
      await client.storage.from("loadlink-driver-documents").remove([path]);
      throw recordError;
    }
    if (recorded?.previousStoragePath && recorded.previousStoragePath !== path) {
      await client.storage.from("loadlink-driver-documents").remove([recorded.previousStoragePath]);
    }

    return NextResponse.json({ ok: true, document: recorded?.document });
  } catch (error) {
    console.error("[LoadLink driver document upload]", error);
    return NextResponse.json({ error: userError(error, label) }, { status: 400 });
  }
}
