/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const src = name => fs.readFileSync(path.join(__dirname, "..", name), "utf8");

test("Standard call displays a live remaining-time countdown and accurate upgrade message after server expiry", () => {
  const call = src("components/LoadLinkCallLayerReliable20260822.tsx");
  const css = src("app/loadlink-call-chat-20261013.css");
  assert.match(call, /setRemaining\(seconds=>Math\.max\(0,seconds-1\)\)/);
  assert.match(call, /data-loadlink-call-active/);
  assert.match(call, /Standard call ·/);
  assert.match(call, /ll-standard-call-countdown/);
  assert.match(call, /data\.state\.status==="limit_reached"&&!current\.premium/);
  assert.match(call, /Your Standard call time has ended/);
  assert.match(call, /href="\/packages"/);
  assert.match(css, /ll-standard-call-countdown-track/);
});

test("browser alerts require explicit permission and are only shown for new matching signed-in user events", () => {
  const lib = src("lib/browserAlerts.ts");
  const notification = src("components/NotificationCenter.tsx");
  const settings = src("app/account/settings/page.tsx");
  assert.match(lib, /Notification\.requestPermission\(\)/);
  assert.match(lib, /document\.visibilityState === "visible"/);
  assert.match(lib, /registration\.showNotification/);
  assert.match(notification, /payload\.eventType === "INSERT"/);
  assert.match(notification, /row\.user_id === user\.id/);
  assert.match(notification, /showLoadLinkBrowserAlert/);
  assert.match(settings, /data-loadlink-browser-alerts="true"/);
  assert.match(settings, /Browser notifications/);
  assert.match(settings, /browserAlertState === "enabled"/);
});
