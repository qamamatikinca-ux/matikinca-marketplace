import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const parts = [0, 1, 2, 3, 4].map((index) =>
  join(root, ".github", "image-parts", `login-hero-0${index}.txt`),
);

const encoded = parts
  .map((path) => readFileSync(path, "utf8"))
  .join("")
  .replace(/\s+/g, "");

const image = Buffer.from(encoded, "base64");
if (image.length < 100_000) {
  throw new Error(`LoadLink login artwork is unexpectedly small (${image.length} bytes).`);
}
if (image.subarray(0, 4).toString("ascii") !== "RIFF" || image.subarray(8, 12).toString("ascii") !== "WEBP") {
  throw new Error("Reconstructed LoadLink login artwork is not a valid WEBP file.");
}

const imagesDir = join(root, "public", "images");
mkdirSync(imagesDir, { recursive: true });
writeFileSync(join(imagesDir, "loadlink-login-hero-hd.webp"), image);
console.log(`LoadLink login artwork reconstructed: ${image.length} bytes`);
