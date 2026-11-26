/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = p => fs.readFileSync(path.resolve(__dirname, "..", p), "utf8");

test("LoadLink truck is visible from first loading frame in both themes", () => {
  const loader = read("components/LoadLinkLoading.tsx");
  const css = read("app/loadlink-refresh-theme-20261015.css");
  assert.match(loader,/data-loadlink-page-loading="true"/);
  assert.match(loader,/grid place-items-center/);
  assert.match(loader,/loadlink-loading-truck/);
  assert.match(loader,/Loading LoadLink/);
  assert.doesNotMatch(loader,/translate\(120vw|truck-drive|left: -220px/);
  assert.match(loader,/prefers-reduced-motion: reduce/);
  assert.match(css,/html\[data-loadlink-theme="light"\] \[data-loadlink-page-loading="true"\] \{ background: #f8f9fa/);
});

test("first paint and intentional site surfaces have neutral, not beige, backgrounds", () => {
  const layout=read("app/layout.tsx");
  const hook=read("lib/useLoadLinkTheme.ts");
  const coordinator=read("components/ThemeCoordinator.tsx");
  const wizard=read("components/LoadLinkVehicleWizardController20260825.tsx");
  const theme=read("app/loadlink-light-glass.css");
  assert.doesNotMatch(layout,/#f4efe3/);
  assert.doesNotMatch(hook,/#f4efe3/);
  assert.doesNotMatch(coordinator,/#f4efe3/);
  assert.doesNotMatch(wizard,/#f5f1e8/);
  assert.match(layout,/#f8f9fa/);
  assert.match(theme,/html\[data-loadlink-theme="light"\]/);
  assert.match(theme,/bg-\[\#f5f1e8\]/);
  assert.match(theme,/background-color: #f8f9fa !important/);
  assert.match(theme,/\[class\*="bg-\[\#f6b800\]"\]/);
});

test("selected vehicle retains catalogue prefill without inventing service records", () => {
  const form=read("app/list-your-vehicle/LegacyVehicleListingPage.tsx");
  assert.match(form,/reference\?\.verified_transmission/);
  assert.match(form,/reference\?\.verified_fuel/);
  assert.match(form,/setTitle\(\x60\$\{year\} \$\{brand\} \$\{modelName\}\x60\)/);
  assert.match(form,/data-loadlink-vehicle-condition-details="true"/);
  assert.match(form,/useState\("Not specified"\)/);
  assert.match(form,/<option>Not specified<\/option>/);
  assert.match(form,/Model specifications cannot confirm service, tyre or accident history/);
  assert.match(form,/setEngineCondition\(category === "trailer" \? "Not applicable"/);
  assert.match(form,/vehicleCategory !== "trailer" \? <Field/);
  assert.match(form,/Service, condition and inspection details/);
});

test("posting categories and model fields are compact and native on phones", () => {
  const form=read("app/list-your-vehicle/LegacyVehicleListingPage.tsx");
  const page=read("app/list-your-vehicle/page.tsx");
  assert.match(form,/ll-vehicle-type-card flex min-h-24 items-center gap-3 rounded-xl/);
  assert.match(form,/h-20 w-24 shrink-0/);
  assert.doesNotMatch(form,/ll-vehicle-type-card min-h-28 rounded-\[24px\]/);
  assert.match(page,/-webkit-appearance: auto !important/);
  assert.match(page,/border-radius: 10px !important/);
  assert.doesNotMatch(page,/linear-gradient\(45deg, transparent 50%/);
});

test("chat application is a compact receipt opening the branded full document", () => {
  const card=read("components/LoadLinkApplicationCard.tsx");
  const chat=read("app/messages/page.tsx");
  assert.match(card,/max-w-\[340px\]/);
  assert.match(card,/View application/);
  assert.match(card,/createPortal/);
  assert.match(card,/role="dialog" aria-modal="true"/);
  assert.match(card,/data-loadlink-application-paper="true"/);
  assert.match(card,/\/images\/loadlink-logo-light\.png/);
  assert.match(card,/event\.key === "Escape"/);
  assert.match(chat,/message\.message_kind === "application" && !message\.deleted_at/);
  assert.match(chat,/rounded-lg bg-transparent p-0 shadow-none/);
});
