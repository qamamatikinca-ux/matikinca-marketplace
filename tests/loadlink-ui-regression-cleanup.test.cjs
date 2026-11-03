const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = name => fs.readFileSync(path.join(__dirname, "..", name), "utf8");

test("followed dealership updates remain an unboxed row without an unwanted heading", () => {
  const rail = read("components/LoadLinkDealerUpdateRail20260822.tsx");
  assert.match(rail, /data-loadlink-dealer-update-rail className="mb-4"/);
  assert.doesNotMatch(rail, /<h2[^>]*>Dealership updates<\/h2>/);
  assert.doesNotMatch(rail, />0 active</);
  assert.match(rail, /Find dealers/);
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
  assert.match(legacy, /loadlinkPromotedRail/);
  assert.match(jobs, /data-loadlink-promoted-rail="true"/);
  assert.match(jobs, /darkMode=\{darkMode\}/);
  assert.match(css, /main\[data-loadlink-jobs-page="true"\] \[data-loadlink-promoted-rail="true"\]/);
  assert.match(css, /html\[data-loadlink-theme="dark"\]/);
  assert.match(css, /html\[data-loadlink-theme="light"\]/);
});

test("Packages is a simple plan comparison with expandable detail and restricted testing", () => {
  const packages = read("app/packages/page.tsx");
  assert.match(packages, /See all benefits/);
  assert.match(packages, /Restricted to this account/);
  assert.match(packages, /loadlink_test_switch_plan/);
  assert.match(packages, /removeLegacyPartner/);
  assert.doesNotMatch(packages, />Recommended<\/span>/);
  assert.doesNotMatch(packages, /Your dealership tools, showroom and vehicle advertising are available\. Other packages are hidden/);
  assert.match(packages, /bg-\[#f7f7f7\]/);
});
