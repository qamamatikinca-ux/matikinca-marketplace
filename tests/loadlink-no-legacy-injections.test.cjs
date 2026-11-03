const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (name) => fs.readFileSync(path.resolve(__dirname, "..", name), "utf8");

test("the Packages page has no script-injected partner advertisement", () => {
  const smart = read("components/LoadLinkSmartUxPass20260826.tsx");
  assert.doesNotMatch(smart, /Become a LoadLink partner today/);
  assert.doesNotMatch(smart, /function enhancePackageGuide\(/);
  assert.match(smart, /function removeLegacyPartnerCard\(/);
  assert.match(smart, /data-loadlink-partner-cta/);
});

test("the public showroom keeps real hours and reviews without made-up duplicates", () => {
  const repair = read("components/LoadLinkUiRepairV273.tsx");
  const publicShowroom = read("components/dealer/PublicDealershipInstagramShowroom.tsx");
  assert.doesNotMatch(repair, /<h2>Showroom hours<\/h2>/);
  assert.doesNotMatch(repair, /function repairDealerProfile\(/);
  assert.match(repair, /function removeLegacyDealerCards\(/);
  assert.match(publicShowroom, /Trading times/);
  assert.match(publicShowroom, /id="reviews"/);
});

test("the Jobs carousel is owned by React rather than overwritten by a DOM patch", () => {
  const polish = read("components/MarketplaceUxPolishEnhancer.tsx");
  const jobs = read("app/jobs/JobsPortalClient.tsx");
  assert.doesNotMatch(polish, /function promotedCarousel\(/);
  assert.doesNotMatch(polish, /function rowForCard\(/);
  assert.doesNotMatch(polish, /section\.style\.backgroundColor/);
  assert.match(jobs, /data-loadlink-promoted-rail="true"/);
  assert.match(jobs, /data-loadlink-promoted-card="true"/);
  assert.match(jobs, /data-loadlink-swipe-dots="true"/);
});
