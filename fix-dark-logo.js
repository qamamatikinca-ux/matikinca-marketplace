const fs = require("fs");
const path = require("path");

const root = process.cwd();

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) walk(fullPath, files);
    else if (/\.(tsx|jsx|ts|js)$/.test(entry.name)) files.push(fullPath);
  }

  return files;
}

function addLogoClass(code) {
  return code.replace(/<img\b([^>]*src=["'][^"']*loadlink[^"']*logo[^"']*["'][^>]*)>/gi, (match, attrs) => {
    if (/loadlink-logo-dark-fix/.test(match)) return match;

    if (/className=["']([^"']*)["']/.test(attrs)) {
      const nextAttrs = attrs.replace(/className=(["'])([^"']*)(["'])/, (full, q1, classes, q2) => {
        return `className=${q1}${classes} loadlink-logo-dark-fix${q2}`;
      });
      return `<img${nextAttrs}>`;
    }

    return `<img${attrs} className="loadlink-logo-dark-fix">`;
  });
}

let changedFiles = [];

for (const filePath of walk(root)) {
  let code = fs.readFileSync(filePath, "utf8");
  const next = addLogoClass(code);

  if (next !== code) {
    fs.writeFileSync(filePath, next);
    changedFiles.push(path.relative(root, filePath));
  }
}

const globalsCandidates = [
  path.join(root, "app", "globals.css"),
  path.join(root, "src", "app", "globals.css"),
  path.join(root, "styles", "globals.css"),
];

let globalsPath = globalsCandidates.find((candidate) => fs.existsSync(candidate));

if (!globalsPath) {
  globalsPath = path.join(root, "app", "globals.css");
  fs.mkdirSync(path.dirname(globalsPath), { recursive: true });
  fs.writeFileSync(globalsPath, "");
}

let css = fs.readFileSync(globalsPath, "utf8");

const cssBlock = `
/* LoadLink dark mode logo fix:
   keeps the gold detail close to gold, while turning black logo text white on dark pages. */
main.bg-black img.loadlink-logo-dark-fix,
.bg-black img.loadlink-logo-dark-fix {
  filter: invert(1) hue-rotate(180deg) saturate(1.15);
}

/* Business name readability on dark mode without changing the actual logo layout. */
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

if (!css.includes("LoadLink dark mode logo fix")) {
  css += cssBlock;
  fs.writeFileSync(globalsPath, css);
  changedFiles.push(path.relative(root, globalsPath));
}

const stampPath = path.join(root, "loadlink-dark-logo-hotfix.txt");
fs.writeFileSync(stampPath, `LoadLink dark logo hotfix applied at ${new Date().toISOString()}\n`);
changedFiles.push(path.relative(root, stampPath));

console.log("Dark logo hotfix applied.");
console.log("Changed files:");
changedFiles.forEach((file) => console.log("- " + file));
