/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const src = name => readFileSync(path.join(__dirname, "..", name), "utf8");

test("vehicle cards do not claim seller photos when none were uploaded", () => {
  const card = src("components/VehicleMarketplaceHub.tsx");
  assert.match(card, /Seller photo not provided/);
  assert.match(card, /row\.photos\?\.length \? <span/);
  assert.doesNotMatch(card, /row\.photos\?\.\[0\] \|\| "\/images\/truck-1\.jpg"/);
  assert.doesNotMatch(card, /row\.photos\?\.length \|\| 1/);
});

test("push endpoints return explicit service failures rather than success or internal errors", () => {
  const delivery = src("app/api/push/message/route.ts");
  const subscription = src("app/api/push/subscribe/route.ts");
  assert.doesNotMatch(delivery, /ok: false, disabled: true/);
  assert.match(delivery, /Phone notifications are currently unavailable/);
  assert.match(subscription, /Phone alerts could not be enabled/);
  assert.doesNotMatch(subscription, /error: error instanceof Error \? error\.message/);
});
