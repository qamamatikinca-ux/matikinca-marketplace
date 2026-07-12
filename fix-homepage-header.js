const fs = require("fs");
const path = require("path");

const pagePath = path.join(process.cwd(), "app", "page.tsx");

if (!fs.existsSync(pagePath)) {
  console.error("Could not find app/page.tsx. Run this from the main project folder.");
  process.exit(1);
}

let code = fs.readFileSync(pagePath, "utf8");

const newHeader = `  {/* TOP MENU */}
  <header
  className={\`sticky top-0 z-50 border-b transition-colors duration-300 \${
  darkMode ? "border-white/10 bg-black" : "border-black/10 bg-white"
  }\`}
  >
  <div className="relative flex h-20 w-full items-center justify-between px-5">
  <div className="flex items-center gap-3">
  <button
  className={\`flex h-10 w-10 items-center justify-center text-3xl font-black \${
  darkMode ? "text-white" : "text-black"
  }\`}
  aria-label="Open menu"
  >
  ☰
  </button>

  <Link
  href="/login"
  className={\`flex h-10 items-center justify-center border px-4 text-xs font-black uppercase tracking-[0.16em] transition active:scale-[0.98] \${
  darkMode
  ? "border-yellow-400/70 bg-yellow-400 text-black"
  : "border-black bg-black text-[#f6b800]"
  }\`}
  >
  Log in / Sign up
  </Link>
  </div>

  <Link
  href="/"
  className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center"
  aria-label="Go to LoadLink homepage"
  >
  <img
  src="/images/loadlink-logo.png"
  alt="LoadLink"
  className="h-auto w-[150px] max-w-[38vw] object-contain md:w-[190px] loadlink-logo-dark-fix"
  />
  </Link>

  <button
  onClick={toggleDarkMode}
  aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
  className={\`flex h-10 w-10 items-center justify-center rounded-full border transition active:scale-[0.97] \${
  darkMode
  ? "border-yellow-400/70 bg-yellow-400 text-black shadow-[0_0_18px_rgba(246,184,0,0.22)]"
  : "border-black/10 bg-black text-[#f6b800] shadow-[0_8px_18px_rgba(0,0,0,0.10)]"
  }\`}
  >
  {darkMode ? <HeaderSunIcon /> : <HeaderMoonIcon />}
  </button>
  </div>
  </header>`;

const headerRegex = /\s*\{\/\* TOP MENU \*\/\}\s*<header[\s\S]*?<\/header>/;

if (!headerRegex.test(code)) {
  console.error("Could not find the TOP MENU header block. No changes were made.");
  process.exit(1);
}

code = code.replace(headerRegex, "\n" + newHeader);

const icons = `
function HeaderSunIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.72 5.28l-1.56 1.56M6.84 17.16l-1.56 1.56M18.72 18.72l-1.56-1.56M6.84 6.84 5.28 5.28"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HeaderMoonIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path d="M20.2 14.1A8.7 8.7 0 0 1 9.9 3.8a8.7 8.7 0 1 0 10.3 10.3Z" fill="currentColor" />
    </svg>
  );
}
`;

if (!code.includes("function HeaderSunIcon()")) {
  code = code.trimEnd() + "\n\n" + icons + "\n";
}

fs.writeFileSync(pagePath, code);
console.log("Updated homepage header layout:");
console.log("- hamburger + Log in / Sign up on the left");
console.log("- LoadLink logo centered");
console.log("- circular dark/light toggle on the far right");
