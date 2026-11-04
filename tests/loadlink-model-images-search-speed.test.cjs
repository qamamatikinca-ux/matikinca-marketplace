const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = p => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

test("price guide shows catalog model images for trucks and bakkies", () => {
  const guide = read("app/tools/vehicle-price-guide/page.tsx");
  const model = read("lib/modelFamilyPhoto.ts");
  assert.match(guide, /ModelFamilyPhotoCard/);
  assert.match(guide, /lightCommercialCatalog/);
  assert.match(guide, /value === "truck" \? "Trucks" : "Bakkies"/);
  assert.match(model, /fawpretoria\.co\.za\/images\/Trucks\/Showroom\/FAW-J5N-28380FT\.jpg/);
  assert.match(model, /Actual model-family photo/);
  assert.match(model, /referenceMatch !== "unverified"/);
});

test("listing form immediately previews the selected truck and bakkie photo", () => {
  const form = read("app/list-your-vehicle/LegacyVehicleListingPage.tsx");
  assert.match(form, /curatedModelPhoto/);
  assert.match(form, /<ModelFamilyPhotoCard kind=/);
  assert.match(form, /"truck" : "bakkie"/);
  assert.match(form, /!curatedModelPhoto && !lightCommercialPhotoLoading/);
});

test("quick search category switch is local, preloads heroes and avoids page navigation", () => {
  const source = read("app/quick-links/[scope]/page.tsx");
  assert.match(source, /onClick=\{\(\) => chooseScope\(item\.value\)\}/);
  assert.match(source, /setScope\(next\)/);
  assert.match(source, /history\.replaceState/);
  assert.match(source, /NAV\.map\(\(item\) => \(/);
  assert.match(source, /transition-opacity duration-150/);
  assert.doesNotMatch(source, /href=\{\`\/quick-links\/\$\{item\.value\}\`\}/);
});

test("home search suggestions remain compact and accessible", () => {
  const search = read("components/MarketplaceDiscovery.tsx");
  assert.match(search, /slice\(0, 4\)/);
  assert.match(search, /data-loadlink-home-search-suggestions/);
  assert.match(search, /max-h-\[280px\]/);
});
