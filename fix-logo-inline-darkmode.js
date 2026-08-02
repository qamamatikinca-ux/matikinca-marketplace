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

function looksLikeLoadLinkLogo(tag) {
  const lower = tag.toLowerCase();
  return (
    lower.includes("loadlink") ||
    lower.includes("load-link") ||
    lower.includes("load link") ||
    lower.includes("logo")
  ) && lower.includes("<img");
}

function patchImageTag(tag) {
  if (!looksLikeLoadLinkLogo(tag)) return tag;

  // Do not double-patch.
  if (tag.includes("LOADLINK_DARK_LOGO_FILTER")) return tag;

  const filterComment = "{/* LOADLINK_DARK_LOGO_FILTER */}";
  const styleValue = `style={{ filter: darkMode ? "invert(1) hue-rotate(180deg) saturate(1.35) brightness(1.12) contrast(1.08)" : "none" }}`;

  // If an old filter/class hotfix was added, leave it but force inline style.
  if (/\sstyle=\{\{[\s\S]*?\}\}/.test(tag)) {
    return tag.replace(/\sstyle=\{\{[\s\S]*?\}\}/, ` ${styleValue} ${filterComment}`);
  }

  return tag.replace(/\/?>\s*$/, (ending) => ` ${styleValue} ${filterComment}${ending}`);
}

let changed = [];

const searchRoots = ["app", "components", "src/app", "src/components"]
  .map((folder) => path.join(root, folder))
  .filter((folder) => fs.existsSync(folder));

for (const dir of searchRoots) {
  for (const file of walk(dir)) {
    let code = fs.readFileSync(file, "utf8");

    // Only patch files where darkMode is already available.
    // This prevents TypeScript errors from adding darkMode where it does not exist.
    if (!code.includes("darkMode")) continue;

    const before = code;

    // Patch normal one-line and multi-line <img ...> tags.
    code = code.replace(/<img\b[\s\S]*?>/g, (tag) => patchImageTag(tag));

    if (code !== before) {
      fs.writeFileSync(file, code);
      changed.push(path.relative(root, file));
    }
  }
}

// Force text business names white on dark mode as a separate safety net.
const globalsPath = path.join(root, "app", "globals.css");
if (fs.existsSync(globalsPath)) {
  let css = fs.readFileSync(globalsPath, "utf8");

  const cssBlock = `
/* LoadLink dark mode business text safety fix */
main.bg-black .business-name,
main.bg-black .business-title,
main.bg-black .business-logo-name,
main.bg-black .logo-name,
.bg-black .business-name,
.bg-black .business-title,
.bg-black .business-logo-name,
.bg-black .logo-name {
  color: #fff !important;
}
`;

  if (!css.includes("LoadLink dark mode business text safety fix")) {
    css += cssBlock;
    fs.writeFileSync(globalsPath, css);
    changed.push(path.relative(root, globalsPath));
  }
}

const stampPath = path.join(root, "loadlink-inline-dark-logo-fix.txt");
fs.writeFileSync(stampPath, `Applied inline dark logo fix at ${new Date().toISOString()}\nChanged files:\n${changed.join("\n")}\n`);
changed.push(path.relative(root, stampPath));

console.log("INLINE DARK LOGO FIX COMPLETE");
console.log("Changed files count:", changed.length);
changed.forEach((file) => console.log("- " + file));

if (changed.length <= 1) {
  console.log("");
  console.log("WARNING: No TSX logo file was patched. Send this output back to ChatGPT.");
}
