/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const settings = readFileSync(path.join(__dirname, "../app/account/settings/page.tsx"), "utf8");

test("notification settings show real subscription status rather than claiming delivery", () => {
  assert.match(settings, /data-loadlink-push-status="true"/);
  assert.match(settings, /This device is subscribed\. Delivery is not guaranteed/);
  assert.match(settings, /notification service is not configured/);
  assert.doesNotMatch(settings, /Push notifications are enabled on this device/);
});

test("push setup is visible in notification settings and unavailable states are not clickable", () => {
  const notificationStart = settings.indexOf('{settingsView === "notifications" ?');
  const billingStart = settings.indexOf('{settingsView === "billing" ?');
  assert.ok(notificationStart >= 0 && billingStart > notificationStart);
  const block = settings.slice(notificationStart, billingStart);
  assert.match(block, /data-loadlink-push-status="true"/);
  assert.match(block, /pushState === "unconfigured" \|\| pushState === "blocked"/);
  assert.match(block, /min-h-11/);
  assert.match(block, /title="Notification inbox"/);
});
