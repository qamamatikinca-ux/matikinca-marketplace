import { authenticatedFetch } from "@/lib/client/authenticatedFetch";

export type UploadCategory =
  | "listing-image"
  | "profile-image"
  | "dealership-asset"
  | "verification-document"
  | "dealership-document"
  | "vehicle-document"
  | "message-attachment";

export type SecureUploadResult = {
  bucket: string;
  path: string;
  publicUrl: string | null;
  sha256: string;
  mime: string;
  size: number;
};

const API_CATEGORY: Record<UploadCategory, string> = {
  "listing-image": "listing-photo",
  "profile-image": "profile-photo",
  "dealership-asset": "dealership-asset",
  "verification-document": "verification-document",
  "dealership-document": "dealership-document",
  "vehicle-document": "vehicle-document",
  "message-attachment": "message-attachment",
};

export async function secureUpload(file: File | Blob, category: UploadCategory, filename?: string, recordId?: string): Promise<SecureUploadResult> {
  const form = new FormData();
  form.set("file", file, filename || (file instanceof File ? file.name : "upload.bin"));
  form.set("category", API_CATEGORY[category]);
  if (recordId) form.set("recordId", recordId);
  const response = await authenticatedFetch("/api/uploads/secure", { method: "POST", body: form });
  const payload = await response.json().catch(() => ({})) as {
    error?: string;
    upload?: { bucket: string; path: string; publicUrl: string | null; sha256: string; mimeType: string; sizeBytes: number };
  };
  if (!response.ok || !payload.upload) throw new Error(payload.error || "The file could not be uploaded.");
  return {
    bucket: payload.upload.bucket,
    path: payload.upload.path,
    publicUrl: payload.upload.publicUrl,
    sha256: payload.upload.sha256,
    mime: payload.upload.mimeType,
    size: payload.upload.sizeBytes,
  };
}
