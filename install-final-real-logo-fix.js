const fs = require("fs");
const path = require("path");

const root = process.cwd();

function copyFileSafe(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx|jsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function ensureImport(code) {
  if (code.includes('LoadLinkLogo from "@/components/LoadLinkLogo"')) return code;
  const importLine = 'import LoadLinkLogo from "@/components/LoadLinkLogo";';
  if (code.startsWith('"use client";')) return code.replace('"use client";', '"use client";\n\n' + importLine);
  if (code.startsWith("'use client';")) return code.replace("'use client';", "'use client';\n\n" + importLine);
  const firstImport = code.match(/^import .+?;\n/m);
  if (firstImport) return code.replace(firstImport[0], firstImport[0] + importLine + "\n");
  return importLine + "\n" + code;
}

function extractClassName(tag) {
  const normal = tag.match(/className=["']([^"']*)["']/);
  if (normal) return normal[1];
  const template = tag.match(/className=\{`([^`]*)`\}/);
  if (template) return template[1].replace(/\$\{[^}]*\}/g, "").trim();
  return "h-auto w-[150px] object-contain md:w-[190px]";
}

function isLoadLinkLogoTag(tag) {
  const lower = tag.toLowerCase();
  if (!lower.startsWith("<img")) return false;
  if (lower.includes("loadlink-logo") || lower.includes("loadlink logo")) return true;
  if (lower.includes("alt=") && lower.includes("loadlink")) return true;
  return false;
}

function replaceLogoImages(code) {
  let changed = false;
  const next = code.replace(/<img\b[\s\S]*?>/g, (tag) => {
    if (!isLoadLinkLogoTag(tag)) return tag;
    changed = true;
    const className = extractClassName(tag);
    return `<LoadLinkLogo className="${className}" />`;
  });
  return { code: next, changed };
}

const changedFiles = [];

copyFileSafe(path.join(root, "loadlink-logo-assets", "loadlink-logo-light.png"), path.join(root, "public", "images", "loadlink-logo-light.png"));
copyFileSafe(path.join(root, "loadlink-logo-assets", "loadlink-logo-dark.png"), path.join(root, "public", "images", "loadlink-logo-dark.png"));
copyFileSafe(path.join(root, "loadlink-logo-assets", "loadlink-logo.png"), path.join(root, "public", "images", "loadlink-logo.png"));
copyFileSafe(path.join(root, "components", "LoadLinkLogo.tsx"), path.join(root, "components", "LoadLinkLogo.tsx"));
changedFiles.push("public/images/loadlink-logo-light.png", "public/images/loadlink-logo-dark.png", "public/images/loadlink-logo.png", "components/LoadLinkLogo.tsx");

const roots = ["app", "components", "src/app", "src/components"].map((folder) => path.join(root, folder)).filter((folder) => fs.existsSync(folder));
for (const dir of roots) {
  for (const file of walk(dir)) {
    if (file.endsWith(path.join("components", "LoadLinkLogo.tsx"))) continue;
    const before = fs.readFileSync(file, "utf8");
    const result = replaceLogoImages(before);
    if (!result.changed) continue;
    fs.writeFileSync(file, ensureImport(result.code));
    changedFiles.push(path.relative(root, file));
  }
}

const globalsPath = path.join(root, "app", "globals.css");
if (fs.existsSync(globalsPath)) {
  let css = fs.readFileSync(globalsPath, "utf8");
  css = css
    .replace(/\/\* LoadLink dark mode logo fix:[\s\S]*?color: #ffffff !important;\s*\}\n?/g, "")
    .replace(/\/\* LOADLINK DARK LOGO FINAL FIX[\s\S]*?\[data-logo-name\] \{\s*color: #ffffff !important;\s*\}\n?/g, "")
    .replace(/\/\* LoadLink logo swap uses real light\/dark logo files[\s\S]*?\}\n?/g, "")
    .replace(/\/\* LoadLink dark mode business text safety fix[\s\S]*?\}\n?/g, "");

  const finalCss = `
/* LOADLINK FINAL LOGO RULES
   The logo uses real light and dark PNG files. Do not filter it. */
html body img.loadlink-logo-img,
html body main.bg-black img.loadlink-logo-img,
html body header img.loadlink-logo-img,
html body .bg-black img.loadlink-logo-img,
html body img.loadlink-logo-img[alt="LoadLink"] {
  filter: none !important;
}

.loadlink-logo-wrap {
  isolation: isolate;
}

main.bg-black .business-name,
main.bg-black .business-title,
main.bg-black .business-logo-name,
main.bg-black .logo-name,
.bg-black .business-name,
.bg-black .business-title,
.bg-black .business-logo-name,
.bg-black .logo-name {
  color: #ffffff !important;
}
`;
  if (!css.includes("LOADLINK FINAL LOGO RULES")) css += finalCss;
  fs.writeFileSync(globalsPath, css);
  changedFiles.push(path.relative(root, globalsPath));
}

const stampPath = path.join(root, "loadlink-final-real-logo-fix.txt");
fs.writeFileSync(stampPath, `Applied final real LoadLink logo fix at ${new Date().toISOString()}\n\nChanged files:\n${changedFiles.join("\n")}\n`);
changedFiles.push(path.relative(root, stampPath));

console.log("FINAL REAL LOADLINK LOGO FIX APPLIED");
console.log("Restored the original logo, added the gold glow, and installed a real white-text dark logo.");
console.log("Changed files:");
changedFiles.forEach((file) => console.log("- " + file));
