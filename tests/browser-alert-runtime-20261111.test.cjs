/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const source = fs.readFileSync(path.join(__dirname, "../lib/browserAlerts.ts"), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function runtime(permission = "granted", visibilityState = "hidden") {
  const shown = [];
  const registered = [];
  const registration = { showNotification: async (title, options) => shown.push({ title, options }) };
  const navigator = { serviceWorker: {
    register: async (url, options) => { registered.push({ url, options }); return registration; },
    getRegistration: async () => registration,
  }};
  const Notification = { permission, requestPermission: async () => permission };
  const window = { Notification };
  const document = { visibilityState };
  const exports = {};
  new Function("exports", "window", "navigator", "Notification", "document", code)(
    exports, window, navigator, Notification, document,
  );
  return { ...exports, shown, registered };
}

test("explicit enable registers the LoadLink service worker after browser permission", async () => {
  const x = runtime();
  assert.equal(await x.enableBrowserAlerts(), "enabled");
  assert.deepEqual(x.registered, [{ url: "/loadlink-sw.js", options: { scope: "/" } }]);
});

test("background tab displays a real user notification with a safe internal link", async () => {
  const x = runtime();
  await x.showLoadLinkBrowserAlert({ id: "abc", title: "New message", body: "A user replied", href: "/messages?thread=abc" });
  assert.equal(x.shown.length, 1);
  assert.equal(x.shown[0].title, "New message");
  assert.equal(x.shown[0].options.data.url, "/messages?thread=abc");
});

test("visible tabs and blocked notifications do not generate distracting OS alerts", async () => {
  const visible = runtime("granted", "visible");
  await visible.showLoadLinkBrowserAlert({ id: "abc", title: "Hello", body: "Test" });
  assert.equal(visible.shown.length, 0);
  const blocked = runtime("denied", "hidden");
  assert.equal(await blocked.enableBrowserAlerts(), "blocked");
  await blocked.showLoadLinkBrowserAlert({ id: "abc", title: "Hello", body: "Test" });
  assert.equal(blocked.shown.length, 0);
});

test("external URLs never become notification destinations", async () => {
  const x = runtime();
  await x.showLoadLinkBrowserAlert({ id: "abc", title: "Update", body: "Test", href: "//outside.example" });
  assert.equal(x.shown[0].options.data.url, "/notifications");
});
