const fs = require("fs");
const path = require("path");

const layoutPath = path.join(process.cwd(), "app", "layout.tsx");

if (!fs.existsSync(layoutPath)) {
  console.error("Could not find app/layout.tsx");
  process.exit(1);
}

let code = fs.readFileSync(layoutPath, "utf8");

if (!code.includes('import GlobalLoading from "@/components/GlobalLoading";')) {
  code = code.replace(
    /((?:import[\s\S]*?;\s*)+)/,
    `$1import GlobalLoading from "@/components/GlobalLoading";\n`
  );
}

if (!code.includes("<GlobalLoading />")) {
  code = code.replace(/(<body[^>]*>)/, `$1\n        <GlobalLoading />`);
}

fs.writeFileSync(layoutPath, code);
console.log("Global 4-second loading screen installed in app/layout.tsx");
