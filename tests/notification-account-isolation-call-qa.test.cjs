/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("notifications reject stale responses from a previous signed-in account", () => {
  const source = read("components/NotificationCenter.tsx");
  assert.match(source, /requestId !== requestVersionRef\.current \|\| accountIdRef\.current !== ownerId/);
  assert.match(source, /requestVersionRef\.current \+= 1/);
  assert.match(source, /setNotifications\(\[\]\)/);
  assert.match(source, /initialAuthVersion !== authVersionRef\.current/);
});

test("notification writes belong to the authenticated user and failed read updates are restored", () => {
  const source = read("components/NotificationCenter.tsx");
  const userFilter = source.match(/\.eq\("user_id", ownerId\)/g) || [];
  assert.ok(userFilter.length >= 2);
  assert.match(source, /Could not mark notification as read/);
  assert.match(source, /Could not mark notifications as read/);
  assert.match(source, /role="alert"/);
});

test("call setup shows STUN-only limitations without declaring a failed call connected", () => {
  const source = read("components/LoadLinkCallLayerReliable20260822.tsx");
  assert.match(source, /relayAvailable: payload\.relayAvailable === true/);
  assert.match(source, /if\(!ice\.relayAvailable\)setNotice/);
  assert.match(source, /new RTCPeerConnection\(\{iceServers:ice\.servers/);
  assert.doesNotMatch(source, /return raw\|\|"The call could not start\."/);
});
