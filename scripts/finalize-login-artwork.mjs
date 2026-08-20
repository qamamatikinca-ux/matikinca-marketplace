import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const sourceDir = join(root, "assets", "login-artwork");
const parts = [
  "loadlink-login-artwork.part01.b64",
  "loadlink-login-artwork.part02.b64",
  "loadlink-login-artwork.part03.b64",
];

const expectedBytes = 8_100;

const encoded = parts
  .map((part) => readFileSync(join(sourceDir, part), "utf8"))
  .join("")
  .replace(/\s+/g, "");

const image = Buffer.from(encoded, "base64");
const actualSha256 = createHash("sha256").update(image).digest("hex");

if (image.length !== expectedBytes) {
  throw new Error(`LoadLink login artwork size mismatch: expected ${expectedBytes}, received ${image.length}.`);
}
if (image[0] !== 0xff || image[1] !== 0xd8 || image[image.length - 2] !== 0xff || image[image.length - 1] !== 0xd9) {
  throw new Error("LoadLink login artwork failed JPEG signature validation.");
}

const imagesDir = join(root, "public", "images");
mkdirSync(imagesDir, { recursive: true });
const output = join(imagesDir, "loadlink-login-hero-final.jpg");
writeFileSync(output, image);

console.log(`Verified final LoadLink login artwork: ${image.length} bytes, sha256 ${actualSha256}`);
