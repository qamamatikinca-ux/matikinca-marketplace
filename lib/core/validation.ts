export class ValidationError extends Error {
  readonly fields: Record<string, string>;
  constructor(message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = "ValidationError";
    this.fields = fields;
  }
}

export function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function requireText(value: unknown, field: string, maxLength: number): string {
  const result = cleanText(value, maxLength);
  if (!result) throw new ValidationError(`${field} is required.`, { [field]: "Required" });
  return result;
}

export function safePositiveInteger(value: unknown, fallback = 1, maximum = 365): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(maximum, Math.floor(parsed)));
}

export function validateImageFiles(files: File[], limit: number) {
  if (files.length > limit) throw new ValidationError(`You can upload up to ${limit} images.`);
  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
  for (const file of files) {
    if (!allowed.has(file.type)) throw new ValidationError(`${file.name} is not a supported image type.`);
    if (file.size > 12 * 1024 * 1024) throw new ValidationError(`${file.name} is larger than 12 MB.`);
  }
}
