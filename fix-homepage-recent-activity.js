const fs = require("fs");
const path = require("path");

const pagePath = path.join(process.cwd(), "app", "page.tsx");

if (!fs.existsSync(pagePath)) {
  console.error("Could not find app/page.tsx");
  process.exit(1);
}

let code = fs.readFileSync(pagePath, "utf8");

if (!code.includes('import RecentActivityPanel from "@/components/RecentActivityPanel";')) {
  code = code.replace(
    'import { useEffect, useState } from "react";',
    'import { useEffect, useState } from "react"; import RecentActivityPanel from "@/components/RecentActivityPanel";'
  );
}

if (!code.includes("<RecentActivityPanel darkMode={darkMode} />")) {
  const insert = '{/* SITE-WIDE RECENT ACTIVITY */}<RecentActivityPanel darkMode={darkMode} />';
  if (code.includes("{/* FOOTER / FINAL SECTION */}")) {
    code = code.replace("{/* FOOTER / FINAL SECTION */}", `${insert}{/* FOOTER / FINAL SECTION */}`);
  } else if (code.includes("{/* OUR MISSION SECTION */}")) {
    code = code.replace("{/* OUR MISSION SECTION */}", `${insert}{/* OUR MISSION SECTION */}`);
  } else {
    console.warn("Could not find an exact section marker. RecentActivityPanel import was added, but page placement was not changed.");
  }
}

fs.writeFileSync(pagePath, code);
console.log("Homepage recent activity panel installed.");
