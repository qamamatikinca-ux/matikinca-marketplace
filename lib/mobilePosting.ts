const MAX_ANDROID_IMAGE_BYTES = 25 * 1024 * 1024;
const SAFE_UPLOAD_BYTES = 4.5 * 1024 * 1024;

export type PreparedUploadImage = {
  blob: Blob;
  contentType: string;
  extension: "jpg" | "png" | "webp";
};

export type PreparedFormImage = {
  file: File;
  previewUrl: string;
};

export function createSafeRandomId() {
  try {
    const randomUUID = globalThis.crypto?.randomUUID;
    if (typeof randomUUID === "function") return randomUUID.call(globalThis.crypto);
  } catch {
    // Older browsers may expose crypto without randomUUID support.
  }

  const randomPart = () => Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${randomPart()}-${randomPart()}`;
}

export function isSupportedImageFile(file: File) {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

export function validateImageFile(file: File, label = "Image") {
  if (!isSupportedImageFile(file)) {
    return `${label} must be a JPG, PNG, WEBP or phone-camera image.`;
  }
  if (file.size <= 0) return `${label} is empty. Choose another image.`;
  if (file.size > MAX_ANDROID_IMAGE_BYTES) {
    return `${label} must be smaller than 25 MB.`;
  }
  return "";
}

export function inferUploadContentType(file: File | Blob) {
  if (file.type) return file.type;
  if (file instanceof File) {
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".pdf")) return "application/pdf";
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".webp")) return "image/webp";
    if (/\.(jpe?g)$/i.test(lower)) return "image/jpeg";
  }
  return "application/octet-stream";
}

export function imageExtension(contentType: string): PreparedUploadImage["extension"] {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

function loadImageWithObjectUrl(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("This phone could not read the selected image. Try a JPG screenshot of it."));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, contentType: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("This browser could not prepare the image."))),
      contentType,
      quality,
    );
  });
}

async function decodeImage(file: File) {
  let bitmap: ImageBitmap | null = null;
  let image: HTMLImageElement | null = null;

  if (typeof createImageBitmap === "function") {
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      bitmap = null;
    }
  }

  if (!bitmap) image = await loadImageWithObjectUrl(file);

  const width = bitmap?.width ?? image?.naturalWidth ?? 0;
  const height = bitmap?.height ?? image?.naturalHeight ?? 0;
  if (!width || !height) {
    bitmap?.close();
    throw new Error("The selected image has invalid dimensions.");
  }

  return { bitmap, image, width, height };
}

export async function prepareImageForUpload(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {},
): Promise<PreparedUploadImage> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const maxWidth = options.maxWidth ?? 1500;
  const maxHeight = options.maxHeight ?? 1500;
  const quality = options.quality ?? 0.78;
  let decoded: Awaited<ReturnType<typeof decodeImage>> | null = null;

  try {
    decoded = await decodeImage(file);
    const scale = Math.min(1, maxWidth / decoded.width, maxHeight / decoded.height);
    const outputWidth = Math.max(1, Math.round(decoded.width * scale));
    const outputHeight = Math.max(1, Math.round(decoded.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("This browser could not prepare the image.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, outputWidth, outputHeight);
    context.drawImage(decoded.bitmap ?? decoded.image!, 0, 0, outputWidth, outputHeight);

    let blob = await canvasToBlob(canvas, "image/jpeg", quality);
    if (blob.size > SAFE_UPLOAD_BYTES) {
      blob = await canvasToBlob(canvas, "image/jpeg", Math.max(0.58, quality - 0.18));
    }

    canvas.width = 1;
    canvas.height = 1;

    if (blob.size > SAFE_UPLOAD_BYTES) {
      throw new Error("The selected image is still too large after compression. Choose a smaller image.");
    }

    return { blob, contentType: "image/jpeg", extension: "jpg" };
  } catch (error) {
    // A supported original can still be uploaded when a browser cannot decode it,
    // but only when it already fits safely inside the storage limit.
    const originalType = inferUploadContentType(file);
    if (["image/jpeg", "image/png", "image/webp"].includes(originalType) && file.size <= SAFE_UPLOAD_BYTES) {
      return {
        blob: file,
        contentType: originalType,
        extension: imageExtension(originalType),
      };
    }
    throw error;
  } finally {
    decoded?.bitmap?.close();
  }
}

export async function prepareImageFileForForm(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number; namePrefix?: string } = {},
): Promise<PreparedFormImage> {
  const prepared = await prepareImageForUpload(file, options);
  const base = (options.namePrefix || file.name.replace(/\.[^.]+$/, "") || "loadlink-photo")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "loadlink-photo";
  const output = new File([prepared.blob], `${base}.jpg`, {
    type: prepared.contentType,
    lastModified: Date.now(),
  });
  return { file: output, previewUrl: URL.createObjectURL(output) };
}

export function revokePreviewUrl(url: string) {
  if (url.startsWith("blob:")) URL.revokeObjectURL(url);
}

export function readableUploadError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; error_description?: unknown; details?: unknown; hint?: unknown };
    const values = [candidate.message, candidate.error_description, candidate.details, candidate.hint]
      .filter((value): value is string => typeof value === "string" && Boolean(value.trim()));
    if (values.length) return Array.from(new Set(values)).join(" · ");
  }
  return fallback;
}
