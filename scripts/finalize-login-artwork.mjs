import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const sourceDir = join(root, ".github", "login-artwork-v3");
const parts = [
  "part-00.b64",
  "part-00-tail.b64",
  "part-01.b64",
  "part-02.b64",
  "part-03.b64",
  "part-04.b64",
  "part-05.b64",
  "part-06.b64",
  "part-07.b64",
  "part-08.b64",
  "part-09.b64",
  "part-10-canonical.b64",
  "part-11-canonical.b64",
  "part-12-canonical.b64",
];

const expectedBytes = 136_014;
const expectedOriginalSourceSha256 = "9e7877167b87cba3cdfa1250818c6101641024cbbf82bc52ee586942593edd27";

const sourceManifest = readFileSync(join(sourceDir, "source.sha256"), "utf8");
if (!sourceManifest.includes(expectedOriginalSourceSha256)) {
  throw new Error("LoadLink login artwork source manifest does not match the supplied final artwork.");
}

const encoded = parts
  .map((part) => readFileSync(join(sourceDir, part), "utf8"))
  .join("")
  .replace(/\s+/g, "");

const image = Buffer.from(encoded, "base64");
const actualSha256 = createHash("sha256").update(image).digest("hex");

if (image.length !== expectedBytes) {
  throw new Error(`LoadLink login artwork size mismatch: expected ${expectedBytes}, received ${image.length}.`);
}
if (image.subarray(0, 4).toString("ascii") !== "RIFF" || image.subarray(8, 12).toString("ascii") !== "WEBP") {
  throw new Error("LoadLink login artwork failed WebP signature validation.");
}
const declaredRiffBytes = image.readUInt32LE(4) + 8;
if (declaredRiffBytes !== image.length) {
  throw new Error(`LoadLink login artwork RIFF length mismatch: expected ${declaredRiffBytes}, received ${image.length}.`);
}

const imagesDir = join(root, "public", "images");
mkdirSync(imagesDir, { recursive: true });
const output = join(imagesDir, "loadlink-login-hero-final.webp");
writeFileSync(output, image);

console.log(`Verified high-resolution LoadLink login artwork: ${image.length} bytes, sha256 ${actualSha256}`);
