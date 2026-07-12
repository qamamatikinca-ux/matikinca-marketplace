#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const packageRoot = __dirname;
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupRoot = path.join(root, ".loadlink-backup", `chat-app-${timestamp}`);

function fail(message) {
  console.error(`\nLoadLink upgrade stopped: ${message}\n`);
  process.exit(1);
}

function ensureProject() {
  if (!fs.existsSync(path.join(root, "package.json")) || !fs.existsSync(path.join(root, "app"))) {
    fail("Run this file from the main matikinca-marketplace folder.");
  }
}

function backup(relativePath) {
  const target = path.join(root, relativePath);
  if (!fs.existsSync(target)) return;
  const backupTarget = path.join(backupRoot, relativePath);
  fs.mkdirSync(path.dirname(backupTarget), { recursive: true });
  fs.copyFileSync(target, backupTarget);
}

function copyFile(packageRelativePath, projectRelativePath) {
  const source = path.join(packageRoot, packageRelativePath);
  const target = path.join(root, projectRelativePath);
  if (!fs.existsSync(source)) fail(`Missing package file: ${packageRelativePath}`);
  backup(projectRelativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  console.log(`Updated ${projectRelativePath}`);
}

function writePatched(relativePath, transform) {
  const target = path.join(root, relativePath);
  if (!fs.existsSync(target)) fail(`Could not find ${relativePath}`);
  const original = fs.readFileSync(target, "utf8");
  const updated = transform(original);
  if (updated === original) {
    console.log(`Checked ${relativePath} — no additional patch was needed`);
    return;
  }
  backup(relativePath);
  fs.writeFileSync(target, updated);
  console.log(`Patched ${relativePath}`);
}

function removeExactJsxElement(source, text) {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.replace(
    new RegExp(`<([A-Za-z][A-Za-z0-9.]*)\\b[^>]*>\\s*${escaped}\\s*<\\/\\1>\\s*`, "gi"),
    "",
  );
}

function patchLayout(source) {
  let next = source;
  if (!next.includes('import ChatLauncher from "@/components/ChatLauncher";')) {
    next = next.replace(
      /import GlobalLoading from ["']@\/components\/GlobalLoading["'];?/,
      (match) => `${match}\nimport ChatLauncher from "@/components/ChatLauncher";\nimport SwipeDotsEnhancer from "@/components/SwipeDotsEnhancer";`,
    );
  }

  if (!next.includes("<SwipeDotsEnhancer />")) {
    next = next.replace(
      /<GlobalLoading\s*\/>/,
      `<GlobalLoading />\n        <SwipeDotsEnhancer />\n        <ChatLauncher />`,
    );
  }

  if (!next.includes("<ChatLauncher />") || !next.includes("<SwipeDotsEnhancer />")) {
    fail("The global chat button and swipe dots could not be added to app/layout.tsx safely.");
  }
  return next;
}

function patchLogisticsNews(source) {
  let next = removeExactJsxElement(source, "Industry update");
  next = next.replace(
    /className="mt-2 text-4xl font-black">South African logistics news/g,
    'className="text-4xl font-black">South African logistics news',
  );
  return next;
}

function patchJobs(source) {
  let next = removeExactJsxElement(source, "Jobs in this portal");
  next = removeExactJsxElement(next, "Available results");
  next = next.replace(/eyebrow:\s*["']Find jobs portal["']/gi, 'eyebrow: ""');

  next = next.replace(
    /<p([^>]*)>\{portalCopy\.eyebrow\}<\/p>/,
    `{portalCopy.eyebrow ? <p$1>{portalCopy.eyebrow}</p> : null}`,
  );

  next = next.replace(
    /className="mt-2 text-3xl font-black">Featured and recent listings/g,
    'className="text-3xl font-black">Featured and recent listings',
  );
  next = next.replace(
    /className="mt-2 text-4xl font-black tracking-\[-0\.05em\]"/g,
    'className="text-4xl font-black tracking-[-0.05em]"',
  );

  return next;
}

ensureProject();
fs.mkdirSync(backupRoot, { recursive: true });

copyFile("files/app/messages/page.tsx", "app/messages/page.tsx");
copyFile("files/components/ChatLauncher.tsx", "components/ChatLauncher.tsx");
copyFile("files/components/SwipeDotsEnhancer.tsx", "components/SwipeDotsEnhancer.tsx");
copyFile("LOADLINK-CHAT-APP-UPGRADE.sql", "LOADLINK-CHAT-APP-UPGRADE.sql");

writePatched("app/layout.tsx", patchLayout);
writePatched("components/LogisticsNews.tsx", patchLogisticsNews);
writePatched("app/jobs/page.tsx", patchJobs);

const marker = [
  "LOADLINK CHAT APP UPGRADE INSTALLED",
  `Installed: ${new Date().toISOString()}`,
  "Environment variables were not changed.",
  `Backups: ${path.relative(root, backupRoot)}`,
  "Next: run LOADLINK-CHAT-APP-UPGRADE.sql in Supabase SQL Editor, then npm run build.",
  "",
].join("\n");
fs.writeFileSync(path.join(root, "LOADLINK-CHAT-APP-UPGRADE-INSTALLED.txt"), marker);

console.log("\nLoadLink upgrade files are installed.");
console.log(`Backup saved in ${path.relative(root, backupRoot)}`);
console.log("No environment variables or Vercel settings were changed.");
console.log("\nNow do these two steps:");
console.log("1. Run LOADLINK-CHAT-APP-UPGRADE.sql in Supabase SQL Editor.");
console.log("2. Run: npm run build");
console.log("\nAfter the build succeeds, commit and push the changes.\n");
