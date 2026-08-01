import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");

test("six professional marketplace areas are present", () => {
  const header = read("components/platform/ProfessionalHeader.tsx");
  for (const area of ["Work", "Contracts", "Vehicles", "Dealerships", "Drivers", "Messages"]) assert.match(header, new RegExp(area));
});

test("permanent marketplace routes exist", () => {
  for (const file of ["app/vehicles/[id]/page.tsx", "app/jobs/[id]/page.tsx", "app/dealership/[slug]/page.tsx", "app/dealership/[slug]/vehicle/[listingId]/page.tsx", "app/drivers/[id]/page.tsx"]) assert.ok(fs.existsSync(file), file);
});

test("seven-item pagination is enforced in the main marketplaces", () => {
  assert.match(read("app/vehicles/page.tsx"), /const PER_PAGE = 7/);
  assert.match(read("components/platform/WorkMarketplace.tsx"), /const PER_PAGE = 7/);
  assert.match(read("app/my-posts/page.tsx"), /const POSTS_PER_PAGE = 7/);
});

test("saved searches and comparison are account-visible marketplace tools", () => {
  assert.ok(fs.existsSync("app/account/saved-searches/page.tsx"));
  assert.ok(fs.existsSync("app/compare/page.tsx"));
  assert.match(read("app/vehicles/page.tsx"), /Save search/);
});

test("browser prompts are not used for active workflows", () => {
  const roots = ["app", "components", "lib"];
  const matches = [];
  function walk(dir) { for (const entry of fs.readdirSync(dir,{withFileTypes:true})) { const file=`${dir}/${entry.name}`; if(entry.isDirectory()) walk(file); else if(/\.(ts|tsx)$/.test(entry.name)) { const source=read(file); if(/window\.prompt\s*\(|\bconfirm\s*\(/.test(source)) matches.push(file); } } }
  roots.forEach(walk);
  assert.deepEqual(matches, []);
});

test("LDE2 is not referenced by the update", () => {
  const files = ["docs/RELEASE-NOTES.md", "docs/IMPLEMENTATION-MAP.md", "supabase/migrations/20260801_000001_loadlink_professional_marketplace.sql"];
  for (const file of files) assert.match(read(file), /(LDE2.*(was not modified|was not changed)|does not modify LDE2)/i);
});
