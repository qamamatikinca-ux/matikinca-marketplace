const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function searchModule() {
  const source = fs.readFileSync(path.join(__dirname, "..", "lib", "smartSearch.ts"), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", js)(module.exports, module);
  return module.exports;
}

const search = searchModule();

test("region detector recognises actual cities and established South African aliases", () => {
  assert.equal(search.detectRegion("refrigerated trailer Durban")?.[0], "kwazulu natal");
  assert.equal(search.detectRegion("truck in Pretoria")?.[0], "gauteng");
  assert.equal(search.detectRegion("truck jobs Joburg")?.[0], "gauteng");
  assert.equal(search.detectRegion("truck in KZN")?.[0], "kwazulu natal");
  assert.equal(search.detectRegion("side tipper in Cape Town")?.[0], "western cape");
});

test("region detector uses word boundaries and preserves unknown locations", () => {
  assert.equal(search.detectRegion("notDurbanXYZ"), null);
  assert.equal(search.detectRegion("Scania R500"), null);
});

test("common truck-search spelling variants match relevant content", () => {
  assert.equal(search.flexibleMatch("Mercedes-Benz Actros 2646", "mercedez actros"), true);
  assert.equal(search.flexibleMatch("Scania R500 truck", "scan r500"), true);
  assert.equal(search.flexibleMatch("Side tipper trailer", "side tiper"), true);
  assert.equal(search.flexibleMatch("Mobile kitchen for rent", "mobille kitchen"), true);
});

test("search corrections do not make unrelated listings qualify", () => {
  assert.equal(search.flexibleMatch("Volvo FMX tipper truck", "mercedez actros"), false);
  assert.equal(search.flexibleMatch("Scania R500", "scan equipment"), false);
  assert.deepEqual(search.searchTokens("Scania R500"), ["scania", "r500"]);
  assert.deepEqual(search.searchTokens("scan r500"), ["scania", "r500"]);
});
