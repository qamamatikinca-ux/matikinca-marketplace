const fs = require("fs");
const path = require("path");

const root = process.cwd();

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx|jsx)$/.test(entry.name)) files.push(full);
  }

  return files;
}

function ensureImport(code) {
  if (code.includes('LoadLinkLogo from "@/components/LoadLinkLogo"')) return code;

  if (code.startsWith('"use client";')) {
    return code.replace('"use client";', '"use client";\n\nimport LoadLinkLogo from "@/components/LoadLinkLogo";');
  }

  if (code.startsWith("'use client';")) {
    return code.replace("'use client';", "'use client';\n\nimport LoadLinkLogo from \"@/components/LoadLinkLogo\";");
  }

  return 'import LoadLinkLogo from "@/components/LoadLinkLogo";\n' + code;
}

function getClassName(tag) {
  const normal = tag.match(/className=["']([^"']*)["']/);
  if (normal) return normal[1];

  const curly = tag.match(/className=\{`([^`]*)`\}/);
  if (curly) return curly[1];

  return "";
}

function replaceLogoImages(code) {
  let changed = false;

  const next = code.replace(/<img\b[\s\S]*?>/g, (tag) => {
    const lower = tag.toLowerCase();

    const isLoadLinkLogo =
      lower.includes("/images/loadlink-logo") ||
      lower.includes("loadlink-logo") ||
      (lower.includes("alt=") && lower.includes("loadlink"));

    if (!isLoadLinkLogo) return tag;

    changed = true;

    const classes = getClassName(tag) || "h-auto w-[160px] object-contain";
    return `<LoadLinkLogo className="${classes}" />`;
  });

  return { code: next, changed };
}

const publicImages = path.join(root, "public", "images");
fs.mkdirSync(publicImages, { recursive: true });

fs.copyFileSync(path.join(root, "public", "images", "loadlink-logo.png"), path.join(publicImages, "loadlink-logo.png"));
fs.copyFileSync(path.join(root, "public", "images", "loadlink-logo-light.png"), path.join(publicImages, "loadlink-logo-light.png"));
fs.copyFileSync(path.join(root, "public", "images", "loadlink-logo-dark.png"), path.join(publicImages, "loadlink-logo-dark.png"));

const componentDir = path.join(root, "components");
fs.mkdirSync(componentDir, { recursive: true });
fs.copyFileSync(path.join(root, "components", "LoadLinkLogo.tsx"), path.join(componentDir, "LoadLinkLogo.tsx"));

let changedFiles = ["public/images/loadlink-logo.png", "public/images/loadlink-logo-light.png", "public/images/loadlink-logo-dark.png", "components/LoadLinkLogo.tsx"];

const roots = ["app", "components", "src/app", "src/components"]
  .map((folder) => path.join(root, folder))
  .filter((folder) => fs.existsSync(folder));

for (const dir of roots) {
  for (const file of walk(dir)) {
    if (file.endsWith(path.join("components", "LoadLinkLogo.tsx"))) continue;

    const before = fs.readFileSync(file, "utf8");
    const result = replaceLogoImages(before);

    if (!result.changed) continue;

    const after = ensureImport(result.code);
    fs.writeFileSync(file, after);
    changedFiles.push(path.relative(root, file));
  }
}

// Safety CSS for text-based business names.
const globalsPath = path.join(root, "app", "globals.css");
if (fs.existsSync(globalsPath)) {
  let css = fs.readFileSync(globalsPath, "utf8");

  const cssBlock = `
/* LoadLink logo swap uses real light/dark logo files. No CSS filter needed. */
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

  if (!css.includes("LoadLink logo swap uses real light/dark logo files")) {
    css += cssBlock;
    fs.writeFileSync(globalsPath, css);
    changedFiles.push(path.relative(root, globalsPath));
  }
}

const stampPath = path.join(root, "loadlink-original-logo-restored.txt");
fs.writeFileSync(stampPath, `Restored original LoadLink logo and installed real dark-mode logo swap at ${new Date().toISOString()}\n`);
changedFiles.push(path.relative(root, stampPath));

console.log("ORIGINAL LOADLINK LOGO RESTORED + DARK LOGO SWAP INSTALLED");
console.log("Changed files:");
changedFiles.forEach((file) => console.log("- " + file));
