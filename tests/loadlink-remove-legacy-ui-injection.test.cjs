const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (file) => fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");

test("dealership update stories remain unboxed, without an extra heading or counter", () => {
  const rail = read("components/LoadLinkDealerUpdateRail20260822.tsx");
  assert.match(rail, /data-loadlink-dealer-update-rail className="mb-4"/);
  assert.doesNotMatch(rail, /<h2[^>]*>Dealership updates<\/h2>/);
  assert.doesNotMatch(rail, />\{dealers\.filter\(item => Boolean\(item\.status_id\)\)\.length\} active</);
});

test("packages cannot be given a partner promotion by a global DOM repair", () => {
  const global = read("components/LoadLinkSmartUxPass20260826.tsx");
  const packages = read("app/packages/page.tsx");
  assert.doesNotMatch(global, /Become a LoadLink partner today/);
  assert.doesNotMatch(global, /enhancePackageGuide\(/);
  assert.match(global, /function removeLegacyPartnerCard\(/);
  assert.doesNotMatch(packages, /Become a LoadLink partner today/);
  assert.match(packages, /See all \{details\.features\.length\} benefits/);
});

test("public showroom does not include fabricated opening hours or review widgets", () => {
  const repair = read("components/LoadLinkUiRepairV273.tsx");
  const showroom = read("components/dealer/PublicDealershipInstagramShowroom.tsx");
  assert.doesNotMatch(repair, /<h2>Showroom hours<\/h2>/);
  assert.doesNotMatch(repair, /repairDealerProfile\(/);
  assert.match(repair, /removeLegacyDealerCards\(/);
  assert.match(showroom, /Trading times/);
  assert.match(showroom, /id="reviews"/);
});

test("legacy polish cannot force a white promoted Jobs background or rewrite cards", () => {
  const polish = read("components/MarketplaceUxPolishEnhancer.tsx");
  const jobs = read("app/jobs/JobsPortalClient.tsx");
  const css = read("app/loadlink-interaction-speed.css");
  assert.doesNotMatch(polish, /function cleanJobsLightMode\(/);
  assert.doesNotMatch(polish, /function promotedCarousel\(/);
  assert.doesNotMatch(polish, /section\.style\.backgroundColor="#fff"/);
  assert.match(jobs, /data-loadlink-promoted-rail="true"/);
  assert.match(jobs, /data-loadlink-promoted-card="true"/);
  assert.match(jobs, /data-loadlink-swipe-dots="true"/);
  assert.match(jobs, /darkMode=\{darkMode\}[\s\S]*?placeholder="City, town or province"/);
  assert.match(css, /html\[data-loadlink-theme="dark"\][^\n]*\[data-loadlink-promoted-rail="true"\]/);
  assert.match(css, /html\[data-loadlink-theme="light"\][^\n]*\[data-loadlink-promoted-rail="true"\]/);
});
