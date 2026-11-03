const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const source = (file) => fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");

test("Jobs hero does not contain duplicate quick-links navigation", () => {
  const jobs = source("app/jobs/JobsPortalClient.tsx");
  assert.doesNotMatch(jobs, /data-loadlink-jobs-portal-navigation/);
  assert.match(jobs, /data-loadlink-jobs-search-shell/);
});
test("Quick Search keeps accessible category navigation and gold active styling", () => {
  const quick = source("app/quick-links/[scope]/page.tsx");
  const css = source("app/loadlink-major-update-20260823.css");
  assert.match(quick, /data-loadlink-quick-search-nav/);
  assert.match(quick, /aria-current=\{item.value === scope \? "page" : undefined\}/);
  assert.match(css, /nav\[data-loadlink-quick-search-nav\] a\[aria-current="page"\]/);
  assert.doesNotMatch(css, /main section \[class\*="border"\]/);
});
test("Social links use local official-colour assets on theme-aware surfaces", () => {
  const footer = source("components/LoadLinkSiteFooter20260822.tsx");
  assert.match(footer, /border-\[#414744\] bg-\[#171a18\]/);
  assert.match(footer, /label === "TikTok"/);
  for (const brand of ["instagram", "tiktok", "facebook", "gmail"]) {
    assert.match(footer, new RegExp("/brands/" + brand + "\\.svg"));
    assert.match(source("public/brands/" + brand + ".svg"), /<svg/);
  }
  const tiktok = source("public/brands/tiktok.svg");
  assert.match(tiktok.toLowerCase(), /#25f4ee/);
  assert.match(tiktok.toLowerCase(), /#fe2c55/);
});
test("LinkBot accepts its model credential only from the server environment", () => {
  const route = source("app/api/linkbot/route.ts");
  assert.match(route, /const gatewayToken = process\.env\.VERCEL_OIDC_TOKEN/);
  assert.doesNotMatch(route, /request\.headers\.get\("x-vercel-oidc-token"\)/);
});
test("Above-the-fold search banners prioritize responsive image delivery", () => {
  const jobs = source("app/jobs/JobsPortalClient.tsx");
  const quick = source("app/quick-links/[scope]/page.tsx");
  assert.match(jobs, /jobs-hero-fleet\.jpg"[^>]*fetchPriority="high" sizes="100vw"/);
  assert.match(quick, /fetchPriority="high"/);
  assert.match(quick, /sizes="100vw"/);
});
