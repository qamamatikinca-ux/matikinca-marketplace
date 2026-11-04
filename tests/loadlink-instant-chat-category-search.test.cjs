const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function read(file) { return fs.readFileSync(path.join(__dirname, "..", file), "utf8"); }

test("inbox never displays a fake empty conversation state before a successful sync", () => {
  const page = read("app/messages/page.tsx");
  assert.match(page, /readInboxSnapshot<Conversation>/);
  assert.match(page, /readMessageSnapshot<ChatMessage>/);
  assert.match(page, /writeMessageSnapshot/);
  assert.match(page, /setInboxChecked\(true\)/);
  assert.match(page, /!inboxChecked/);
  assert.match(page, /Retrieving your chats/);
  assert.doesNotMatch(page, /Loading conversation…/);
  assert.doesNotMatch(page, />Browse listings<\/Link>/);
  assert.doesNotMatch(page, /<LoadLinkLoading\s*\/>/);
});

test("account chat loading uses two primary RPC calls instead of rereading every historical key on each refresh", () => {
  const page = read("app/messages/page.tsx");
  assert.match(page, /read\(buyerKey, "buyer"\), read\(ownerKey, "owner"\)/);
  assert.match(page, /withLegacyKeys = false/);
  assert.match(page, /getBuyerKeys\(\)\.filter\(key => key !== buyerKey\)\.slice\(0, 6\)/);
  assert.match(page, /conversationsRef\.current = displayed/);
  assert.match(page, /readInboxSnapshot/);
});

test("snapshots cannot leak between account IDs and retain newest inbox entries", () => {
  const src = read("lib/chatSessionSnapshots.ts");
  const transpiled = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const stored = new Map();
  const window = {
    sessionStorage: {
      getItem: key => stored.get(key) || null,
      setItem: (key, value) => stored.set(key, value),
      removeItem: key => stored.delete(key),
    },
  };
  const mod = { exports: {} };
  new Function("exports", "module", "window", transpiled)(mod.exports, mod, window);
  mod.exports.writeInboxSnapshot("userA", [{ id: "new" }, { id: "old" }]);
  assert.deepEqual(mod.exports.readInboxSnapshot("userA"), [{ id: "new" }, { id: "old" }]);
  assert.deepEqual(mod.exports.readInboxSnapshot("userB"), []);
  mod.exports.writeMessageSnapshot("userA", "threadA", [{ id: "messageA" }]);
  assert.deepEqual(mod.exports.readMessageSnapshot("userA", "threadA"), [{ id: "messageA" }]);
  assert.deepEqual(mod.exports.readMessageSnapshot("userA", "threadB"), []);
  assert.deepEqual(mod.exports.readMessageSnapshot("userB", "threadA"), []);
});

test("make and model picker appears only when trucks or vehicles is selected", () => {
  const hub = read("components/VehicleMarketplaceHub.tsx");
  const picker = read("components/VehicleMakeModelPicker.tsx");
  assert.match(hub, /const makeModelVisible = mode === "trucks" \|\| mode === "vehicles"/);
  assert.match(hub, /\{makeModelVisible \? \(/);
  assert.match(hub, /data-loadlink-vehicle-make-search="category-only"/);
  assert.match(hub, /loadlink-glass/);
  assert.match(hub, /\{mode === "trailers_units" \? \(/);
  assert.match(hub, /MOBILE_EQUIPMENT_TYPES/);
  assert.match(hub, /Mobile kitchens/);
  assert.match(picker, /Models <span aria-hidden="true">›<\/span>/);
  assert.match(picker, /Select make, model, variant/);
});

test("contracts search is identical in surface structure to jobs, no extra filter section", () => {
  const contracts = read("app/contracts/page.tsx");
  const jobs = read("app/jobs/JobsPortalClient.tsx");
  assert.match(contracts, /data-loadlink-contracts-search-shell/);
  assert.match(contracts, /loadlink-glass mt-6 rounded-\[24px\] border p-4 shadow/);
  assert.match(jobs, /loadlink-glass mt-6 rounded-\[24px\] border p-4 shadow/);
  assert.match(contracts, /Contract or scope/);
  assert.match(contracts, /Search contracts/);
  assert.doesNotMatch(contracts, /More filters/);
  assert.doesNotMatch(contracts, /Equipment required/);
  assert.doesNotMatch(contracts, /setEquipment/);
});
