const fs = require("fs");
const path = require("path");

const root = process.cwd();
const globalsPath = path.join(root, "app", "globals.css");

if (!fs.existsSync(globalsPath)) {
  fs.mkdirSync(path.dirname(globalsPath), { recursive: true });
  fs.writeFileSync(globalsPath, "");
}

let css = fs.readFileSync(globalsPath, "utf8");

const block = `
/* LOADLINK DARK LOGO FINAL FIX
   Targets the LoadLink logo directly in dark mode, even if the image tag has no custom class. */
header.bg-black img[alt*="LoadLink"],
header.bg-black img[alt*="LOADLINK"],
main.bg-black header img[alt*="LoadLink"],
main.bg-black header img[alt*="LOADLINK"],
.bg-black img[alt*="LoadLink"],
.bg-black img[alt*="LOADLINK"],
.bg-black img[src*="loadlink"],
.bg-black img[src*="LoadLink"],
.bg-black img[src*="LOADLINK"] {
  filter: invert(1) hue-rotate(180deg) saturate(1.25) brightness(1.08) contrast(1.05) !important;
}

/* Keep text-based business names readable in dark mode without removing logos/icons. */
.bg-black .business-name,
.bg-black .business-title,
.bg-black .business-logo-name,
.bg-black .logo-name,
.bg-black [data-business-name],
.bg-black [data-logo-name],
main.bg-black .business-name,
main.bg-black .business-title,
main.bg-black .business-logo-name,
main.bg-black .logo-name,
main.bg-black [data-business-name],
main.bg-black [data-logo-name] {
  color: #ffffff !important;
}
`;

css = css.replace(/\/\* LOADLINK DARK LOGO FINAL FIX[\s\S]*?\[data-logo-name\] \{\s*color: #ffffff !important;\s*\}\n?/g, "");

css += block;
fs.writeFileSync(globalsPath, css);

const stampPath = path.join(root, "loadlink-dark-logo-final-fix.txt");
fs.writeFileSync(stampPath, `LoadLink dark logo final fix applied at ${new Date().toISOString()}\n`);

console.log("Strong dark logo fix applied.");
console.log("Updated app/globals.css");
console.log("Created loadlink-dark-logo-final-fix.txt to force a new Vercel deployment.");
