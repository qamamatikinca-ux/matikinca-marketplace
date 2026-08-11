"use client";

export type LoadLinkImageQuality = { width: number; height: number; brightness: number; contrast: number; messages: string[] };

export async function inspectLoadLinkImage(file: File, options: { profile?: boolean } = {}): Promise<LoadLinkImageQuality> {
  const bitmap = await createImageBitmap(file);
  const max = 180;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { width: bitmap.width, height: bitmap.height, brightness: 255, contrast: 100, messages: [] };
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let total = 0, totalSquare = 0, count = 0;
  for (let i = 0; i < pixels.length; i += 16) {
    const lum = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
    total += lum; totalSquare += lum * lum; count++;
  }
  const brightness = count ? total / count : 255;
  const contrast = Math.sqrt(count ? Math.max(0, totalSquare / count - brightness * brightness) : 0);
  const messages: string[] = [];
  if (brightness < 58) messages.push("This photo is quite dark. A brighter photo may be easier to recognise.");
  if (contrast < 14) messages.push("This photo has very little detail. A clearer photo may work better.");
  if (options.profile && typeof window !== "undefined") {
    try {
      const FaceDetectorClass = (window as any).FaceDetector;
      if (FaceDetectorClass) {
        const detector = new FaceDetectorClass({ fastMode: true, maxDetectedFaces: 3 });
        const faces = await detector.detect(bitmap);
        if (faces.length === 0) messages.push("Your face may be difficult to recognise in this photo.");
        else if (faces[0]?.boundingBox) {
          const b = faces[0].boundingBox;
          const share = (Number(b.width) * Number(b.height)) / Math.max(1, bitmap.width * bitmap.height);
          if (share < 0.045) messages.push("Your face appears quite small in this photo.");
        }
      }
    } catch {}
  }
  return { width: bitmap.width, height: bitmap.height, brightness: Math.round(brightness), contrast: Math.round(contrast), messages: Array.from(new Set(messages)) };
}

export function showLoadLinkImageQuality(messages: string[]) {
  if (!messages.length) return;
  window.dispatchEvent(new CustomEvent("loadlink:notice", {
    detail: { title: messages[0], detail: messages.length > 1 ? messages.slice(1).join(" ") : "You can still use this photo if you want.", tone: "warning" },
  }));
}
