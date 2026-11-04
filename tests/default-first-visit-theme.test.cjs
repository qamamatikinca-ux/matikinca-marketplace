const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const layout = fs.readFileSync(path.join(__dirname, "../app/layout.tsx"), "utf8");
const hook = fs.readFileSync(path.join(__dirname, "../lib/useLoadLinkTheme.ts"), "utf8");

function runBoot(savedTheme, systemDark) {
  const script = layout.split("__html: ")[1]?.split(" }} />")[0]?.slice(1, -1);
  assert.ok(script, "Theme bootstrap must execute before hydration");
  const attrs = { dataset: {}, style: {}, classList: { dark: false, toggle(_, value) { this.dark = value; } } };
  const meta = { content: "#ffffff", setAttribute(_, value) { this.content = value; } };
  const ctx = {
    localStorage: { getItem(key) { return key === "loadlink-theme" ? savedTheme : null; } },
    window: { matchMedia() { return { matches: systemDark }; }, setTimeout() {} },
    document: { documentElement: attrs, querySelector() { return meta; }, addEventListener() {} },
  };
  vm.runInNewContext(script, ctx);
  return { attrs, meta };
}

test("first-time users see light mode even on a dark OS", () => {
  const { attrs, meta } = runBoot(null, true);
  assert.equal(attrs.dataset.loadlinkTheme, "light");
  assert.equal(attrs.classList.dark, false);
  assert.equal(attrs.style.colorScheme, "light");
  assert.equal(meta.content, "#f4efe3");
});

test("returning users keep their explicitly saved dark mode", () => {
  const { attrs } = runBoot("dark", false);
  assert.equal(attrs.dataset.loadlinkTheme, "dark");
  assert.equal(attrs.classList.dark, true);
});

test("invalid settings fall back to light rather than the OS preference", () => {
  assert.equal(runBoot("system", true).attrs.dataset.loadlinkTheme, "light");
  assert.match(hook, /return "light";/);
  assert.doesNotMatch(hook, /return window\.matchMedia\?\.\("\(prefers-color-scheme: dark\)"\)/);
});

test("server-rendered HTML paints in light mode before client JavaScript starts", () => {
  assert.match(layout, /<html lang="en" data-loadlink-theme="light" style=\{\{ colorScheme: "light", backgroundColor: "#f4efe3" \}\}/);
});
