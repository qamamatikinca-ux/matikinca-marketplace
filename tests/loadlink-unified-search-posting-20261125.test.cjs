/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const source = name => fs.readFileSync(path.resolve(__dirname, "..", name), "utf8");
function load(name, dependencies = {}) {
  const filename = path.resolve(__dirname, "..", name);
  const m = new Module(filename, module);
  m.filename = filename;
  m.paths = module.paths;
  m.require = id => Object.prototype.hasOwnProperty.call(dependencies, id) ? dependencies[id] : require(id);
  m._compile(ts.transpileModule(source(name), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return m.exports;
}
const smart = load("lib/smartSearch.ts");
const locations = load("lib/southAfricaLocations.ts");
const search = load("lib/loadlinkSearch.ts", {
  "@/lib/smartSearch": smart,
  "@/lib/southAfricaLocations": locations,
});

test("All search returns matching published jobs, contracts AND vehicles instead of forcing a single inferred tab", () => {
  const items = ["job", "contract", "asset"].map(scope => ({
    id: scope,
    label: `Mercedes truck ${scope}`,
    meta: "Johannesburg, Gauteng",
    scope,
    searchable: `Mercedes truck freight ${scope} Johannesburg`,
    location: "Johannesburg",
    priority: 150,
    href: "/listing/id",
  }));
  const results = search.filterAndRankResults(items, "all", "Mercedes truck");
  assert.deepEqual(new Set(results.map(result => result.scope)), new Set(["job", "contract", "asset"]));
  assert.equal(search.filterAndRankResults(items, "job", "Mercedes truck").length, 1);
});

test("search routes preserve user terms and location on each marketplace", () => {
  assert.equal(search.routeForScope("asset", "Scania R500", "Pretoria"), "/list-your-vehicle?search=Scania+R500&city=Pretoria&view=marketplace#vehicle-marketplace");
  assert.equal(search.routeForScope("driver", "Code 14", "Gauteng"), "/drivers?search=Code+14&city=Gauteng");
  assert.equal(search.routeForScope("contract", "Superlink", "Durban"), "/contracts?search=Superlink&city=Durban");
  assert.equal(search.routeForScope("job", "Lowbed", "Polokwane"), "/jobs?portal=job&search=Lowbed&city=Polokwane");
});

test("posting forms keep cost calculators native, understated, and free of duplicate market-guide injection", () => {
  const vehicle = source("app/list-your-vehicle/LegacyVehicleListingPage.tsx");
  const guide = source("components/PosterTransportPriceGuide.tsx");
  const costs = source("components/VehicleOwnershipEstimator.tsx");
  const legacy = source("components/LoadLinkFinalProductPass20260823.tsx");
  const pricing = source("components/VehicleIntelligentPricingPanel.tsx");
  assert.doesNotMatch(legacy, /data-loadlink-market-guide|Suggested sale range/);
  assert.match(vehicle, /<VehicleOwnershipEstimator/);
  assert.match(vehicle, /<VehicleIntelligentPricingPanel/);
  assert.match(costs, /data-loadlink-vehicle-costs/);
  assert.match(costs, /<details/);
  assert.match(guide, /data-loadlink-post-price-guide/);
  assert.doesNotMatch(guide, /bg-white\/\[\.03\]/);
  assert.match(pricing, /data-loadlink-price-determination/);
  assert.match(pricing, /evidence\?\.available/);
});

test("directory search receives deep-link filters and uses common SA location matching", () => {
  const driver = source("components/phase2/DriversAvailableForWork.tsx");
  const vehicle = source("components/VehicleMarketplaceHub.tsx");
  const jobs = source("app/jobs/JobsPortalClient.tsx");
  assert.match(driver, /params\.get\("search"\)/);
  assert.match(driver, /params\.get\("city"\)/);
  assert.match(driver, /matchesSouthAfricanLocation/);
  assert.match(vehicle, /setKeyword\(params\.get\("search"\)/);
  assert.match(vehicle, /matchesSouthAfricanLocation/);
  assert.match(jobs, /const requestedCity = params\.get\("city"\)/);
  assert.match(jobs, /Boolean\(portalFilter\)/);
});
