#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const packageRoot = __dirname;
const filesRoot = path.join(packageRoot, "files");

function fail(message) {
  console.error(`\nLoadLink installer stopped: ${message}\n`);
  process.exit(1);
}

if (!fs.existsSync(path.join(projectRoot, "package.json")) || !fs.existsSync(path.join(projectRoot, "app"))) {
  fail("Run this command from the main matikinca-marketplace project folder.");
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupRoot = path.join(projectRoot, ".loadlink-backup", `experience-v2-${timestamp}`);

const replacements = [
  "app/messages/page.tsx",
  "app/jobs/list/page.tsx",
  "components/SwipeDotsEnhancer.tsx",
  "components/ChatLauncher.tsx",
];

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function backup(relativePath) {
  const current = path.join(projectRoot, relativePath);
  if (!fs.existsSync(current)) return;
  const destination = path.join(backupRoot, relativePath);
  ensureParent(destination);
  fs.copyFileSync(current, destination);
}

function copyReplacement(relativePath) {
  const source = path.join(filesRoot, relativePath);
  if (!fs.existsSync(source)) fail(`The package is missing ${relativePath}. Download the ZIP again.`);
  const destination = path.join(projectRoot, relativePath);
  backup(relativePath);
  ensureParent(destination);
  fs.copyFileSync(source, destination);
  console.log(`Updated ${relativePath}`);
}

function patchLayout() {
  const relativePath = "app/layout.tsx";
  const layoutPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(layoutPath)) fail("app/layout.tsx could not be found.");

  let content = fs.readFileSync(layoutPath, "utf8");
  let changed = false;

  if (!content.includes('from "@/components/ChatLauncher"') && !content.includes("from '@/components/ChatLauncher'")) {
    content = `import ChatLauncher from "@/components/ChatLauncher";\n${content}`;
    changed = true;
  }

  if (!content.includes('from "@/components/SwipeDotsEnhancer"') && !content.includes("from '@/components/SwipeDotsEnhancer'")) {
    content = `import SwipeDotsEnhancer from "@/components/SwipeDotsEnhancer";\n${content}`;
    changed = true;
  }

  if (!content.includes("<SwipeDotsEnhancer")) {
    if (!content.includes("</body>")) fail("The installer could not locate </body> in app/layout.tsx.");
    content = content.replace("</body>", "  <SwipeDotsEnhancer />\n        </body>");
    changed = true;
  }

  if (!content.includes("<ChatLauncher")) {
    if (!content.includes("</body>")) fail("The installer could not locate </body> in app/layout.tsx.");
    content = content.replace("</body>", "  <ChatLauncher />\n        </body>");
    changed = true;
  }

  if (changed) {
    backup(relativePath);
    fs.writeFileSync(layoutPath, content);
    console.log("Patched app/layout.tsx");
  } else {
    console.log("Checked app/layout.tsx");
  }
}

try {
  fs.mkdirSync(backupRoot, { recursive: true });
  replacements.forEach(copyReplacement);
  patchLayout();

  const sqlSource = path.join(packageRoot, "LOADLINK-EXPERIENCE-UPGRADE-V2.sql");
  const sqlDestination = path.join(projectRoot, "LOADLINK-EXPERIENCE-UPGRADE-V2.sql");
  backup("LOADLINK-EXPERIENCE-UPGRADE-V2.sql");
  fs.copyFileSync(sqlSource, sqlDestination);
  console.log("Updated LOADLINK-EXPERIENCE-UPGRADE-V2.sql");

  const marker = path.join(projectRoot, "loadlink-experience-v2-installed.txt");
  fs.writeFileSync(
    marker,
    [
      "LoadLink Experience Upgrade V2 installed.",
      `Installed: ${new Date().toISOString()}`,
      "Environment variables and Vercel settings were not changed.",
      "Run LOADLINK-EXPERIENCE-UPGRADE-V2.sql in Supabase before deploying.",
      "",
    ].join("\n"),
  );

  console.log("\nLoadLink Experience Upgrade V2 is installed.");
  console.log(`Backup saved in ${path.relative(projectRoot, backupRoot)}`);
  console.log("No environment variables or Vercel settings were changed.");
  console.log("\nNext steps:");
  console.log("1. Run LOADLINK-EXPERIENCE-UPGRADE-V2.sql in Supabase SQL Editor.");
  console.log("2. Run: npm run build");
  console.log('3. Run: git add . && git commit -m "Install LoadLink experience V2" && git push');
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
