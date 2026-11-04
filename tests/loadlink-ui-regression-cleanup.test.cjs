const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = name => fs.readFileSync(path.join(__dirname, "..", name), "utf8");

test("followed dealership updates remain an unboxed row without an unwanted heading", () => {
  const rail = read("components/LoadLinkDealerUpdateRail20260822.tsx");
  assert.match(rail, /data-loadlink-dealer-update-rail data-ready=\{loaded\} className="mb-4"/);
  assert.doesNotMatch(rail, /if \(!loaded \|\| !signedIn\) return null/);
  assert.doesNotMatch(rail, /<h2[^>]*>Dealership updates<\/h2>/);
  assert.doesNotMatch(rail, />0 active</);
  assert.match(rail, /Find dealerships/);
});

test("public showroom keeps existing lower reviews and hours while rejecting duplicates", () => {
  const room = read("components/dealer/PublicDealershipInstagramShowroom.tsx");
  assert.match(room, />Trading times<\/h2>/);
  assert.match(room, /id="reviews"/);
  assert.match(room, /title !== "showroom hours" && title !== "customer reviews"/);
  assert.match(room, />About this dealership<\/h2>/);
});

test("Jobs theme changes cannot retain stale inline white backgrounds", () => {
  const legacy = read("components/MarketplaceUxPolishEnhancer.tsx");
  const jobs = read("app/jobs/JobsPortalClient.tsx");
  const css = read("app/loadlink-refresh-theme-20261015.css");
  assert.doesNotMatch(legacy, /main\.style\.backgroundColor\s*=\s*"#fff"/);
  assert.doesNotMatch(legacy, /section\.style\.backgroundColor\s*=\s*"#fff"/);
  assert.doesNotMatch(legacy, /function promotedCarousel\(/);
  assert.doesNotMatch(legacy, /loadlink-promoted-carousel/);
  assert.match(jobs, /data-loadlink-promoted-rail="true"/);
  assert.match(jobs, /darkMode=\{darkMode\}/);
  assert.match(css, /main\[data-loadlink-jobs-page="true"\] \[data-loadlink-promoted-rail="true"\]/);
  assert.match(css, /html\[data-loadlink-theme="dark"\]/);
  assert.match(css, /html\[data-loadlink-theme="light"\]/);
});

test("Packages shows complete plan benefits while restricting internal testing", () => {
  const packages = read("app/packages/page.tsx");
  assert.match(packages, /details\.features\.map/);
  assert.match(packages, /DEALER_PLAN_BENEFITS/);
  assert.match(packages, /Get .* plan/);
  assert.match(packages, /Restricted to this account/);
  assert.match(packages, /loadlink_test_switch_plan/);
  assert.match(packages, /removeLegacyPartner/);
  assert.doesNotMatch(packages, />Recommended<\/span>/);
  assert.doesNotMatch(packages, /Your dealership tools, showroom and vehicle advertising are available\. Other packages are hidden/);
  assert.match(packages, /bg-\[#f7f7f7\]/);
});

test("vehicle marketplace offers make/model filtering and neutral light surfaces", () => {
  const vehicle = read("components/VehicleMarketplaceHub.tsx");
  const contract = read("app/contracts/page.tsx");
  assert.match(vehicle, /makeQuery/);
  assert.match(vehicle, /modelQuery/);
  assert.match(vehicle, /data-loadlink-vehicle-make-search="category-only"/);
  assert.match(vehicle, /\{makeModelVisible \? \(/);
  assert.match(vehicle, /MOBILE_EQUIPMENT_TYPES/);
  assert.match(vehicle, /VehicleMakeModelPicker/);
  assert.match(vehicle, /bg-\[#f8f8f7\]/);
  assert.match(contract, /data-loadlink-contracts-search-shell/);
  assert.doesNotMatch(contract, /More filters/);
  assert.match(contract, /loadlink-glass/);
});
