/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = p => fs.readFileSync(path.resolve(__dirname, "..", p), "utf8");

test("original LoadLink moving truck and animation are restored without changing its artwork", () => {
  const loader=read("components/LoadLinkLoading.tsx");
  const css=read("app/loadlink-refresh-theme-20261015.css");
  assert.match(loader,/data-loadlink-page-loading="true"/);
  assert.match(loader,/loadlink-truck/);
  assert.match(loader,/truck-box/);
  assert.match(loader,/truck-cab/);
  assert.match(loader,/@keyframes truck-drive/);
  assert.match(loader,/track-mark track-one/);
  assert.doesNotMatch(loader,/loadlink-loading-scene/);
  assert.match(css,/html\\[data-loadlink-theme="light"\\] \\[data-loadlink-page-loading="true"\\] \\{ background: #f8f9fa/);
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

test("all original posting fields remain visible, editable, and in their original order", () => {
  const form=read("app/list-your-vehicle/LegacyVehicleListingPage.tsx");
  assert.doesNotMatch(form,/data-loadlink-vehicle-condition-details/);
  const labels=[
    'Listing title','Condition','Transmission','Fuel / power type',
    'Mileage / usage','Previous owners','Service history',
    'Engine / drivetrain condition','Tyre condition','Accident / structural damage',
    'Last service date — optional','Roadworthy status','Registration number',
    'VIN / chassis number','Engine / serial number','Axle configuration',
    'GVM kg','Payload / capacity kg',
  ];
  for(const label of labels)assert.ok(form.includes(`<Field label="${label}"`),`Missing original field: ${label}`);
  assert.ok(form.indexOf('<Field label="Previous owners">')<form.indexOf('<Field label="Registration number">'));
  assert.equal((form.match(/<VehicleIntelligentPricingPanel/g)||[]).length,1);
  assert.equal((form.match(/<VehicleOwnershipEstimator/g)||[]).length,1);
  assert.match(form,/const \\[condition, setCondition\\] = useState\\(""\\)/);
  assert.match(form,/Choose actual condition/);
  assert.match(form,/<option>Not specified<\\/option>/);
});

test("truck model prefill remains and selected bakkie/van models get limited editable suggestions",()=>{
  const form=read("app/list-your-vehicle/LegacyVehicleListingPage.tsx");
  assert.match(form,/reference\\?\\.verified_transmission/);
  assert.match(form,/reference\\?\\.verified_fuel/);
  assert.match(form,/setTransmission\\(reference\\?\\.verified_transmission/);
  assert.match(form,/selectLightCommercialModel/);
  assert.match(form,/getLightCommercialModelPrefill/);
  assert.match(form,/Supported model details are suggested automatically/);
  assert.doesNotMatch(form,/setServiceHistory\\("Full service history"\\)/);
});

test("vehicle choice keeps its original photos and fields with only restrained typography",()=>{
  const form=read("app/list-your-vehicle/LegacyVehicleListingPage.tsx");
  const page=read("app/list-your-vehicle/page.tsx");
  assert.match(form,/relative mb-4 block h-36/);
  assert.match(form,/ll-vehicle-type-card min-h-28 rounded-xl border px-6 py-5/);
  assert.match(form,/images\\/vehicle-types\\/truck.webp/);
  assert.match(form,/images\\/vehicle-types\\/bakkie-van.webp/);
  assert.match(form,/images\\/vehicle-types\\/trailer.webp/);
  assert.match(page,/-webkit-appearance: auto !important/);
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
