const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("contract type categories are shared by post and both search screens", () => {
  const mod = { exports: {} };
  const output = ts.transpileModule(read("lib/contractTypes.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function("exports", "module", output)(mod.exports, mod);
  assert.ok(mod.exports.CONTRACT_TYPES.length >= 10);
  assert.equal(mod.exports.contractTypeFromDescription("Company: A\nContract type: Mining & bulk haulage\nWork: weekly"), "Mining & bulk haulage");
  assert.equal(mod.exports.contractTypeFromDescription("Old contract without type"), "");
  assert.match(read("app/contracts/post/page.tsx"), /Contract type: \$\{contractType\}/);
  assert.match(read("app/contracts/page.tsx"), /contractTypeFromDescription\(row\.description\)/);
  assert.match(read("app/quick-links/\[scope\]/page.tsx"), /CONTRACT_TYPES\.map/);
});

test("dark message composer keeps typed text and caret visible and offers reconnect", () => {
  const css = read("app/messages/messages.module.css");
  const msg = read("app/messages/page.tsx");
  assert.match(css, /-webkit-text-fill-color: #f7f7f7 !important/);
  assert.match(css, /background: transparent !important/);
  assert.match(css, /caret-color: #f6b800 !important/);
  assert.match(msg, /load failed\|failed to fetch/);
  assert.match(msg, /reliableChatRead\(/);
  assert.match(msg, /Promise\.allSettled\(buyerKeys/);
  assert.match(msg, /setConnectionRetry\(\(value\) => value \+ 1\)/);
});

test("WebRTC connection waits for remote sound and exposes explicit iOS playback button", () => {
  const call = read("components/LoadLinkCallLayerReliable20260822.tsx");
  assert.match(call, /audio\.play\(\)\.then\(\(\)=>\{setNotice\("");markConnected\(\)\}/);
  assert.match(call, /Enable sound/);
  assert.match(call, /audio\.setAttribute\("webkit-playsinline","true"\)/);
  assert.doesNotMatch(call, /peer\.onconnectionstatechange=\(\)=>\{if\(peer\.connectionState==="connected"\)markConnected\(\)/);
});
test("contract search fields share a consistent light and dark surface", () => {
  const css = read("app/loadlink-refresh-theme-20261015.css");
  const quick = read("app/quick-links/[scope]/page.tsx");
  assert.match(css, /main\[data-loadlink-contracts-marketplace\] \[data-loadlink-contracts-search-shell\]/);
  assert.match(quick, /rounded-full border px-4 text-\[12px\]/);
});
