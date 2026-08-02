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
    <div className="grid h-20 w-full grid-cols-[92px_1fr_52px] items-center px-4">
      <div className="flex items-center gap-2">
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
          aria-label="Log in or sign up"
          title="Log in / Sign up"
          className={\`flex h-10 w-10 items-center justify-center rounded-full border transition active:scale-[0.97] \${
            darkMode
              ? "border-yellow-400/60 bg-yellow-400 text-black shadow-[0_0_14px_rgba(246,184,0,0.2)]"
              : "border-black/10 bg-white text-black shadow-[0_8px_18px_rgba(0,0,0,0.08)]"
          }\`}
        >
          <img src="/images/auth-icon.png" alt="" className="h-6 w-6 object-contain" />
        </Link>
      </div>

      <Link
        href="/"
        className="flex min-w-0 items-center justify-center overflow-hidden"
        aria-label="Go to LoadLink homepage"
      >
        <img
          src="/images/loadlink-logo.png"
          alt="LoadLink"
          className={\`h-auto w-[142px] max-w-full object-contain md:w-[190px] \${
            darkMode
              ? "drop-shadow-[0_0_10px_rgba(246,184,0,0.28)]"
              : "drop-shadow-[0_8px_14px_rgba(0,0,0,0.12)]"
          }\`}
        / className="loadlink-logo-dark-fix">
      </Link>

      <button
        onClick={toggleDarkMode}
        aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        title={darkMode ? "Light mode" : "Dark mode"}
        className={\`ml-auto flex h-10 w-10 items-center justify-center rounded-full border transition active:scale-[0.97] \${
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

function stripFunction(source, name) {
  const startToken = `function ${name}()`;
  const start = source.indexOf(startToken);
  if (start === -1) return source;

  const braceStart = source.indexOf("{", start);
  if (braceStart === -1) return source;

  let depth = 0;
  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}") depth--;
    if (depth === 0) {
      return source.slice(0, start).trimEnd() + "\n\n" + source.slice(i + 1).trimStart();
    }
  }

  return source;
}

code = stripFunction(code, "HeaderUserPlusIcon");
code = stripFunction(code, "HeaderSunIcon");
code = stripFunction(code, "HeaderMoonIcon");

const helpers = `
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

code = code.trimEnd() + "\n\n" + helpers + "\n";

fs.writeFileSync(pagePath, code);
console.log("Homepage header fixed:");
console.log("- login/sign-up icon replaced with uploaded person-plus image");
console.log("- logo replaced with clean transparent LoadLink logo");
console.log("- header layout prevents logo overlap");
console.log("- dark/light toggle remains on far right");
