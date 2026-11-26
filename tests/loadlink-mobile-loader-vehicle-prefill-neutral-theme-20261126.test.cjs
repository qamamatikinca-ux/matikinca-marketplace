/* eslint-disable @typescript-eslint/no-require-imports */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");

test("the original moving LoadLink truck remains unchanged",()=>{
  const loader=read("components/LoadLinkLoading.tsx");
  const css=read("app/loadlink-refresh-theme-20261015.css");
  for(const part of ['data-loadlink-page-loading="true"','loadlink-truck','truck-cab','truck-box',
    '@keyframes truck-drive','track-mark track-one']){
    assert.ok(loader.includes(part),"Missing original loader part: "+part);
  }
  assert.ok(!loader.includes("loadlink-loading-scene"),"Do not replace original truck artwork");
  assert.ok(css.includes('#f8f9fa'),"Neutral background stays");
});

test("site light appearance stays neutral, with original dark mode preserved",()=>{
  const layout=read("app/layout.tsx");
  const hook=read("lib/useLoadLinkTheme.ts");
  const coordinator=read("components/ThemeCoordinator.tsx");
  const wizard=read("components/LoadLinkVehicleWizardController20260825.tsx");
  const theme=read("app/loadlink-light-glass.css");
  assert.ok(!layout.includes("#f4efe3"));
  assert.ok(!hook.includes("#f4efe3"));
  assert.ok(!coordinator.includes("#f4efe3"));
  assert.ok(!wizard.includes("#f5f1e8"));
  assert.ok(layout.includes("#f8f9fa"));
  assert.ok(theme.includes('html[data-loadlink-theme="light"]'));
  assert.ok(theme.includes("background-color: #f8f9fa !important"));
});

test("the original posting fields stay visible and in their original order",()=>{
  const form=read("app/list-your-vehicle/LegacyVehicleListingPage.tsx");
  assert.ok(!form.includes("data-loadlink-vehicle-condition-details"));
  const labels=[
    "Listing title","Condition","Transmission","Fuel / power type","Mileage / usage",
    "Previous owners","Service history","Engine / drivetrain condition","Tyre condition",
    "Accident / structural damage","Last service date — optional","Roadworthy status",
    "Registration number","VIN / chassis number","Engine / serial number",
    "Axle configuration","GVM kg","Payload / capacity kg",
  ];
  for(const label of labels){
    assert.ok(form.includes('<Field label="'+label+'"'),"Missing original posting field: "+label);
  }
  assert.ok(form.indexOf('<Field label="Previous owners">') <
    form.indexOf('<Field label="Registration number">'));
  assert.equal(form.split("<VehicleIntelligentPricingPanel").length-1,1);
  assert.equal(form.split("<VehicleOwnershipEstimator").length-1,1);
  assert.ok(form.includes('const [condition, setCondition] = useState("")'));
  assert.ok(form.includes("Choose actual condition"));
  assert.ok(form.includes("<option>Not specified</option>"));
});

test("catalogue-supported prefill is retained without inventing mechanical condition",()=>{
  const form=read("app/list-your-vehicle/LegacyVehicleListingPage.tsx");
  for(const value of ["reference?.verified_transmission","reference?.verified_fuel",
    "setTransmission(reference?.verified_transmission","selectLightCommercialModel",
    "getLightCommercialModelPrefill","Supported model details are suggested automatically"]){
    assert.ok(form.includes(value),value);
  }
  assert.ok(!form.includes('setServiceHistory("Full service history")'));
});

test("vehicle choice photos and all controls remain while typography is restrained",()=>{
  const form=read("app/list-your-vehicle/LegacyVehicleListingPage.tsx");
  const page=read("app/list-your-vehicle/page.tsx");
  assert.ok(form.includes("relative mb-4 block h-36"));
  assert.ok(form.includes("ll-vehicle-type-card min-h-28 rounded-xl border px-6 py-5"));
  for(const name of ["truck.webp","bakkie-van.webp","trailer.webp"])assert.ok(form.includes(name));
  assert.ok(page.includes("-webkit-appearance: auto !important"));
});

test("application chat still uses compact receipt and full separate viewer",()=>{
  const card=read("components/LoadLinkApplicationCard.tsx");
  const chat=read("app/messages/page.tsx");
  for(const value of ["max-w-[340px]","View application","createPortal",
    'role="dialog" aria-modal="true"','data-loadlink-application-paper="true"',
    "/images/loadlink-logo-light.png",'event.key === "Escape"']){
    assert.ok(card.includes(value),value);
  }
  assert.ok(chat.includes('message.message_kind === "application" && !message.deleted_at'));
  assert.ok(chat.includes("rounded-lg bg-transparent p-0 shadow-none"));
});
