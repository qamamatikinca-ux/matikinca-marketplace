/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = name => fs.readFileSync(path.join(__dirname, "..", name), "utf8");

test("truck model selector preserves high-contrast dark background and legible model rows", () => {
 const picker = read("components/VehicleMakeModelPicker.tsx");
 assert.match(picker,/darkMode \? "bg-\[#141414\] text-white"/);
 assert.match(picker,/text-\[#fafafa\]/);
 assert.doesNotMatch(picker,/overflow-hidden bg-white shadow-\[0_24px/);
 assert.match(picker,/setActiveMake\\(option.name\\); setQuery\\(""\\);/);
});

test("public search progressively renders independent categories and reuses recent requests", () => {
 const search = read("app/search/SearchResultsClient.tsx");
 assert.match(search,/function cachedPublicSearch/);
 assert.match(search,/publicSearchCache\.set\(key/);
 assert.match(search,/setListings\(\(data.rows \|\| \[\]\)\.filter\(isCurrentListing\)\)/);
 assert.match(search,/setDrivers\(data.drivers \|\| \[\]\)/);
 assert.match(search,/setDealers\(data\)/);
 assert.doesNotMatch(search,/Promise\.allSettled\(\[/);
 assert.match(search,/Search LoadLink<\/h1>/);
});

test("calls obtain relay availability and avoid showing a connected timer until audible media is ready", () => {
 const call=read("components/LoadLinkCallLayerReliable20260822.tsx");
 const css=read("app/loadlink-call-chat-20261013.css");
 assert.match(call,/relayAvailable: payload\.relayAvailable === true/);
 assert.match(call,/iceServers:ice\.servers/);
 assert.match(call,/reconnectTimeoutRef/);
 assert.match(call,/hidden=\{!mediaConnected\}/);
 assert.match(css,/\[data-loadlink-call-avatar\] img/);
 assert.match(css,/border-radius: 50% !important/);
});
