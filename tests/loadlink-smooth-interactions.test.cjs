const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (name) => fs.readFileSync(path.join(__dirname, "..", name), "utf8");

test("touch theme switches do not snapshot the full page", () => {
  const theme = read("lib/useLoadLinkTheme.ts");
  assert.ok(theme.includes('"(hover: none) and (pointer: coarse)"'));
  assert.ok(theme.includes('reducedMotion || mobileTouch'));
  assert.ok(theme.includes('themeSubscribers = new Set'));
  assert.ok(theme.includes("return subscribeTheme(sync)"));
  assert.ok(theme.includes("flushSync"));
});

test("new portal does not restore the previous menu scroll position", () => {
  const menu = read("components/SiteMenu.tsx");
  assert.ok(menu.includes("pathnameRef.current === openAtPathname"));
  assert.ok(menu.includes('router.prefetch("/jobs")'));
  assert.ok(menu.includes('router.prefetch("/contracts")'));
  assert.ok(menu.includes("network?.saveData"));
});

test("large offscreen homepage portal images defer loading", () => {
  const grid = read("components/LoadLinkHomepagePortalGrid20260822.tsx");
  assert.ok(grid.includes('loading="lazy"'));
  assert.ok(!grid.includes('loading="eager"'));
  assert.ok(grid.includes('fetchPriority="auto"'));
});

test("marketplace images memoize responsive metadata without changing fallback", () => {
  const image = read("components/LoadLinkImage.tsx");
  assert.ok(image.includes('imageDeliveryCache = new Map'));
  assert.ok(image.includes('const optimized = stableDelivery.src !== value'));
  assert.ok(image.includes('if (stage === "fallback")'));
  assert.ok(image.includes("getImageProps"));
});

test("legacy DOM repair observers are batched and limited to relevant portals", () => {
  const card = read("components/LoadLinkUiRepairV273.tsx");
  const audit = read("components/LoadLinkAuditUpdateBridge.tsx");
  const smart = read("components/LoadLinkSmartUxPass20260826.tsx");
  assert.ok(card.includes("window.requestAnimationFrame"));
  assert.ok(audit.includes('pathname === "/jobs" ? new MutationObserver'));
  assert.ok(smart.includes("if (!dynamicRoute) return"));
});

test("scrolling a native choice list does not block a new deliberate tap", () => {
  const guard = read("components/LoadLinkTouchScrollGuard.tsx");
  assert.ok(guard.includes("suppress=0;id=e.pointerId"));
  assert.ok(guard.includes("e.detail===0"));
});

test("fast feedback and reduced motion retain LoadLink visual identity", () => {
  const css = read("app/loadlink-interaction-speed.css");
  assert.ok(css.includes("#f6b800"));
  assert.ok(css.includes("prefers-reduced-motion: reduce"));
  assert.ok(css.includes("touch-action: manipulation"));
});
