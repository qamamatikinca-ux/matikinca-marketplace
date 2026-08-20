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

const expectedSha256 = "aa8633917fc45b724cb82c92f3d7281a29aa4ef20d487744942467867926a6cd";
const expectedBytes = 136_014;

const encoded = parts
  .map((part) => readFileSync(join(sourceDir, part), "utf8"))
  .join("")
  .replace(/\s+/g, "");

const image = Buffer.from(encoded, "base64");
const actualSha256 = createHash("sha256").update(image).digest("hex");

if (image.length !== expectedBytes) {
  throw new Error(`LoadLink login artwork size mismatch: expected ${expectedBytes}, received ${image.length}.`);
}
if (actualSha256 !== expectedSha256) {
  throw new Error(`LoadLink login artwork checksum mismatch: expected ${expectedSha256}, received ${actualSha256}.`);
}
if (image.subarray(0, 4).toString("ascii") !== "RIFF" || image.subarray(8, 12).toString("ascii") !== "WEBP") {
  throw new Error("LoadLink login artwork failed WEBP signature validation.");
}

const imagesDir = join(root, "public", "images");
mkdirSync(imagesDir, { recursive: true });
const output = join(imagesDir, "loadlink-login-hero-hd.webp");
writeFileSync(output, image);

console.log(`Verified LoadLink login artwork: ${image.length} bytes, sha256 ${actualSha256}`);
