const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");

const filename = path.join(__dirname, "../lib/tripProfitability.ts");
const source = fs.readFileSync(filename, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module_ = { exports: {} };
vm.runInNewContext(compiled, { module: module_, exports: module_.exports, Intl, Number, Math, Object });
const { estimateTrip, formatZar } = module_.exports;

const example = {
  loadedKm: 500, emptyKm: 200, litresPer100Km: 40,
  dieselRandPerLitre: 20, tolls: 1000, driverExpenses: 1200,
  maintenanceRandPerKm: 2, otherCosts: 800, offeredRevenue: 18000,
  targetMarginPercent: 20,
};

test("uses loaded plus empty kilometres to calculate actual planned fuel and maintenance", () => {
  const e = estimateTrip(example);
  assert.equal(e.totalKm, 700);
  assert.equal(e.fuelLitres, 280);
  assert.equal(e.fuelCost, 5600);
  assert.equal(e.maintenanceCost, 1400);
  assert.equal(e.totalCost, 10000);
  assert.equal(e.profit, 8000);
  assert.equal(e.breakEvenRate, 10000);
  assert.equal(e.suggestedRate, 12500);
  assert.ok(Math.abs(e.marginPercent - 44.4444444444) < 0.00001);
});

test("returns null rather than inventing a price if required inputs are missing", () => {
  assert.equal(estimateTrip({ ...example, loadedKm: 0 }), null);
  assert.equal(estimateTrip({ ...example, litresPer100Km: 0 }), null);
  assert.equal(estimateTrip({ ...example, dieselRandPerLitre: 0 }), null);
});

test("rejects invalid, negative and impossible target margins", () => {
  assert.equal(estimateTrip({ ...example, otherCosts: -1 }), null);
  assert.equal(estimateTrip({ ...example, offeredRevenue: NaN }), null);
  assert.equal(estimateTrip({ ...example, targetMarginPercent: 100 }), null);
  assert.equal(estimateTrip({ ...example, targetMarginPercent: Infinity }), null);
});

test("profit can be negative and zero revenue is reported without a fabricated margin", () => {
  assert.equal(estimateTrip({ ...example, offeredRevenue: 2000 }).profit, -8000);
  const zero = estimateTrip({ ...example, offeredRevenue: 0 });
  assert.equal(zero.marginPercent, null);
});
