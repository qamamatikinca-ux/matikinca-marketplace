const MAX_ANDROID_IMAGE_BYTES = 25 * 1024 * 1024;

export type PreparedUploadImage = {
  blob: Blob;
  contentType: string;
  extension: "jpg" | "png" | "webp";
};

export function createSafeRandomId() {
  try {
    const randomUUID = globalThis.crypto?.randomUUID;
    if (typeof randomUUID === "function") return randomUUID.call(globalThis.crypto);
  } catch {
    // Older Android browsers may expose crypto without randomUUID support.
  }

  const randomPart = () => Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${randomPart()}-${randomPart()}`;
}

export function isSupportedImageFile(file: File) {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

export function validateImageFile(file: File, label = "Image") {
  if (!isSupportedImageFile(file)) {
    return `${label} must be a JPG, PNG or WEBP image.`;
  }
  if (file.size <= 0) return `${label} is empty. Choose another image.`;
  if (file.size > MAX_ANDROID_IMAGE_BYTES) {
    return `${label} must be smaller than 25 MB.`;
  }
  return "";
}

export function inferUploadContentType(file: File) {
  if (file.type) return file.type;
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

function extensionForContentType(contentType: string): PreparedUploadImage["extension"] {
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
      reject(new Error("Could not decode this image."));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, contentType: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not prepare this image."))),
      contentType,
      quality,
    );
  });
}

export async function prepareImageForUpload(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {},
): Promise<PreparedUploadImage> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const maxWidth = options.maxWidth ?? 1600;
  const maxHeight = options.maxHeight ?? 1600;
  const quality = options.quality ?? 0.82;
  let bitmap: ImageBitmap | null = null;
  let image: HTMLImageElement | null = null;

  try {
    if (typeof createImageBitmap === "function") {
      try {
        bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      } catch {
        bitmap = null;
      }
    }

    if (!bitmap) image = await loadImageWithObjectUrl(file);

    const sourceWidth = bitmap?.width ?? image?.naturalWidth ?? 0;
    const sourceHeight = bitmap?.height ?? image?.naturalHeight ?? 0;
    if (!sourceWidth || !sourceHeight) throw new Error("The selected image has invalid dimensions.");

    const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
    const outputWidth = Math.max(1, Math.round(sourceWidth * scale));
    const outputHeight = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("This browser could not prepare the image.");

    context.drawImage(bitmap ?? image!, 0, 0, outputWidth, outputHeight);
    const blob = await canvasToBlob(canvas, "image/jpeg", quality);
    canvas.width = 1;
    canvas.height = 1;

    return { blob, contentType: "image/jpeg", extension: "jpg" };
  } catch (error) {
    // Some Android browsers fail while decoding or converting large camera images.
    // Upload a supported original file instead of blocking the entire listing.
    const originalType = inferUploadContentType(file);
    if (["image/jpeg", "image/png", "image/webp"].includes(originalType) && file.size <= 12 * 1024 * 1024) {
      return {
        blob: file,
        contentType: originalType,
        extension: extensionForContentType(originalType),
      };
    }
    throw error;
  } finally {
    bitmap?.close();
  }
}

export function readableUploadError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; error_description?: unknown; details?: unknown };
    if (typeof candidate.message === "string" && candidate.message) return candidate.message;
    if (typeof candidate.error_description === "string" && candidate.error_description) return candidate.error_description;
    if (typeof candidate.details === "string" && candidate.details) return candidate.details;
  }
  return fallback;
}
