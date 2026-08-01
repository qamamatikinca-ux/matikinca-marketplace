import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require("typescript");
} catch {
  const globalCandidates = [
    "/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js",
    "/usr/local/lib/node_modules/typescript/lib/typescript.js",
  ];
  const candidate = globalCandidates.find((file) => fs.existsSync(file));
  if (!candidate) {
    console.error("TypeScript is not installed. Run npm ci before this check.");
    process.exit(1);
  }
  ts = require(candidate);
}

const roots = ["app", "components", "context", "lib"];
const files = [];
function walk(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(file);
  }
}
roots.forEach(walk);
let failures = 0;
for (const file of files) {
  const diagnostics = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).diagnostics || [];
  if (!diagnostics.length) continue;
  failures += 1;
  console.error(`\n${file}`);
  for (const diagnostic of diagnostics) console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, " "));
}
console.log(`TypeScript syntax check: ${files.length} files, ${failures} failures.`);
process.exit(failures ? 1 : 0);
