import { supabase } from "@/lib/supabaseClient";

export async function dealerFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sign in again to continue.");
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const supplied = String(body?.error || body?.message || "").trim();
    if (supplied && !/^loadlink could not complete/i.test(supplied)) throw new Error(supplied);
    if (response.status === 400) throw new Error("Some required information is missing or invalid. Check the form and complete the highlighted fields.");
    if (response.status === 401) throw new Error("Your session expired. Sign in again to continue.");
    if (response.status === 403) throw new Error("This Dealer account does not have permission to complete that action yet. Check package approval and business verification.");
    if (response.status === 409) throw new Error("This change conflicts with information already saved. Refresh the Dealer workspace and try again.");
    if (response.status >= 500) throw new Error("LoadLink could not save this change right now. Your information is still on this screen; try again in a moment.");
    throw new Error("This action could not be completed. Check the required information and try again.");
  }
  return body as T;
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "application/pdf": "pdf",
};

export async function uploadDealerFile({
  bucket,
  dealershipId,
  file,
  allowedTypes,
  maxBytes,
  folder,
}: {
  bucket: string;
  dealershipId: string;
  file: File;
  allowedTypes: readonly string[];
  maxBytes: number;
  folder?: string;
}) {
  if (!dealershipId) throw new Error("Dealer workspace not found.");
  const mime = String(file.type || "").toLowerCase();
  if (!allowedTypes.includes(mime)) throw new Error("This file type is not supported here.");
  if (!file.size || file.size > maxBytes) throw new Error(`File must be ${Math.floor(maxBytes / 1024 / 1024)} MB or less.`);
  const safeFolder = String(folder || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 40);
  const extension = EXTENSIONS[mime];
  if (!extension) throw new Error("This file type is not supported here.");
  const path = `${dealershipId}/${safeFolder ? `${safeFolder}/` : ""}${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: mime, upsert: false });
  if (error) throw error;
  return { storage_path: path, mime, filename: file.name, size: file.size };
}

export async function removeDealerUpload(bucket: string, storagePath: string) {
  if (!storagePath) return;
  await supabase.storage.from(bucket).remove([storagePath]).catch(() => undefined);
}

export function formatZar(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(Number(value));
}

export function relativeAge(value?: string | null) {
  if (!value) return "";
  const ms = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(ms / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
