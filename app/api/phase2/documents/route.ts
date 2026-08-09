import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { bearer, publicSupabase, safeError } from "@/lib/phase2/supabase";
import { serverRateLimit } from "@/lib/serverRateLimit";

const TYPES = new Set(["identity", "drivers_licence", "prdp", "cv", "driving_certificate"]);
const MAX_BYTES = 8 * 1024 * 1024;

function inspect(bytes: Uint8Array, filename: string) {
  const head = Buffer.from(bytes.subarray(0, 12));
  const body = Buffer.from(bytes).toString("latin1");
  const pdf = head.subarray(0, 5).toString("ascii") === "%PDF-";
  const jpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const png = head.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  if (pdf) {
    if (!body.includes("%%EOF")) throw new Error("Malformed PDF");
    if (/\/Encrypt\b|\/JavaScript\b|\/JS\b|\/OpenAction\b|\/Launch\b|\/EmbeddedFile\b/i.test(body)) {
      throw new Error("Unsafe PDF feature detected");
    }
    return { mime: "application/pdf", extension: "pdf" };
  }
  if (jpeg) return { mime: "image/jpeg", extension: "jpg" };
  if (png) return { mime: "image/png", extension: "png" };
  throw new Error(`Unsupported file content: ${filename}`);
}

export async function POST(request: Request) {
  const limited = serverRateLimit(request, "driver-documents", 12, 10 * 60_000);
  if (limited) return limited;
  try {
    const token = bearer(request);
    if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const client = publicSupabase(token);
    const { data: userData, error: userError } = await client.auth.getUser(token);
    if (userError || !userData.user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    const form = await request.formData();
    const type = String(form.get("documentType") ?? "");
    const file = form.get("file");
    if (!TYPES.has(type)) return NextResponse.json({ error: "Unsupported document type." }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a document." }, { status: 400 });
    if (file.size < 1 || file.size > MAX_BYTES) return NextResponse.json({ error: "Documents must be smaller than 8 MB." }, { status: 400 });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const inspected = inspect(bytes, file.name);
    const sha256 = createHash("sha256").update(bytes).digest("hex");

    const { data: profile, error: profileError } = await client
      .from("driver_profiles").select("id").eq("user_id", userData.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return NextResponse.json({ error: "Save your profile details before uploading documents." }, { status: 400 });

    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-100);
    const path = `${userData.user.id}/${type}/${crypto.randomUUID()}-${cleanName || `document.${inspected.extension}`}`;
    const { error: uploadError } = await client.storage.from("loadlink-driver-documents")
      .upload(path, bytes, { contentType: inspected.mime, upsert: false });
    if (uploadError) throw uploadError;

    const { data: recorded, error } = await client.rpc("loadlink_replace_my_driver_document", {
      p_document_type: type,
      p_storage_path: path,
      p_original_filename: file.name.slice(0, 180),
      p_mime_type: inspected.mime,
      p_size_bytes: file.size,
      p_sha256: sha256,
    });
    if (error) {
      await client.storage.from("loadlink-driver-documents").remove([path]);
      throw error;
    }
    if (recorded?.previousStoragePath) {
      await client.storage.from("loadlink-driver-documents").remove([recorded.previousStoragePath]);
    }
    return NextResponse.json({ document: recorded?.document });
  } catch (error) {
    return NextResponse.json(safeError(error, "The document failed security validation or could not be uploaded."), { status: 400 });
  }
}
