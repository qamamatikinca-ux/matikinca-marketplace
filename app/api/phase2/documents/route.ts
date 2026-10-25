import { NextResponse } from "next/server";
import { bearer, publicSupabase } from "@/lib/phase2/supabase";
import { serverRateLimit } from "@/lib/serverRateLimit";

const TYPES = new Set(["portrait", "identity", "drivers_licence", "prdp", "cv", "driving_certificate", "work_authorisation"]);
const LABELS: Record<string, string> = {
  portrait: "Profile photo",
  identity: "ID or passport",
  work_authorisation: "Work authorisation document",
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

    const json = request.headers.get("content-type")?.includes("application/json") ? await request.json() : null;
    const form = json ? null : await request.formData();
    const type = String(json?.documentType ?? form?.get("documentType") ?? "");
    label = LABELS[type] || "Document";
    if (!TYPES.has(type)) return NextResponse.json({ error: "Unsupported document type." }, { status: 400 });
    let file = form?.get("file");
    let uploadedPath = "";
    if (json) {
      const filename = String(json.filename || "document").slice(0,180);
      if (json.action === "prepare") {
        if (!Number.isSafeInteger(json.size) || json.size < 1 || json.size > MAX_BYTES || !["application/pdf","image/jpeg","image/png"].includes(json.mime)) throw new DocumentValidationError("Choose a PDF, JPG or PNG up to 8 MB.");
        const safeName = filename.replace(/[^a-zA-Z0-9._-]+/g,"-").slice(-90) || "document";
        const path = `${userData.user.id}/${type}/${crypto.randomUUID()}-${safeName}`;
        const {data,error} = await client.storage.from("loadlink-driver-documents").createSignedUploadUrl(path, {upsert:false});
        if(error) throw error;
        return NextResponse.json({path:data.path,signedUrl:data.signedUrl}, {headers:{"Cache-Control":"private, no-store"}});
      }
      uploadedPath = String(json.path || "");
      const prefix = `${userData.user.id}/${type}/`;
      if (json.action !== "finalize" || !uploadedPath.startsWith(prefix) || !/^[0-9a-f-]{36}-[a-zA-Z0-9._-]+$/.test(uploadedPath.slice(prefix.length))) throw new DocumentValidationError("Invalid document upload. Choose the file again.");
      const {data,error} = await client.storage.from("loadlink-driver-documents").download(uploadedPath);
      if(error || !data) throw new DocumentValidationError("The upload did not finish. Choose the file and retry.");
      file = new File([data],filename,{type:data.type});
    }
    if (!(file instanceof File)) return NextResponse.json({ error: `Choose a ${label.toLowerCase()} file.` }, { status: 400 });
    if (file.size < 1 || file.size > MAX_BYTES) return NextResponse.json({ error: `${label} must be between 1 byte and 8 MB.` }, { status: 400 });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const inspected = inspect(bytes);
    if (type === "portrait" && inspected.mime === "application/pdf") throw new DocumentValidationError("Choose a JPG or PNG portrait of yourself.");

    const { data: profile, error: profileError } = await client
      .from("driver_profiles").select("id").eq("user_id", userData.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return NextResponse.json({ error: "Save your profile details before uploading documents." }, { status: 400 });

    const baseName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-90);
    const safeName = baseName || `${type}.${inspected.extension}`;
    const path = uploadedPath || `${userData.user.id}/${type}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = uploadedPath ? {error:null} : await client.storage.from("loadlink-driver-documents")
      .upload(path, bytes, { contentType: inspected.mime, cacheControl: "3600", upsert: false });
    if (uploadError) throw uploadError;

    const { data: recorded, error: recordError } = await client.functions.invoke("loadlink-driver-evidence", {
      body: { documentType: type, path, filename: file.name.slice(0, 180) },
    });
    if (recordError || !recorded?.document) {
      // Do not delete on ambiguous completion: the trusted processor may have registered it.
      throw new DocumentValidationError("Secure document processing could not finish. Please retry the same upload shortly.");
    }

    return NextResponse.json({ ok: true, document: recorded?.document }, {headers:{"Cache-Control":"private, no-store"}});
  } catch (error) {
    console.error("[LoadLink driver document upload]", error);
    return NextResponse.json({ error: userError(error, label) }, { status: 400 });
  }
}
