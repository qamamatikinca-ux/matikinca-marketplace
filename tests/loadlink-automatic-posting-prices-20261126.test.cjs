/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), Module=require("node:module"), ts=require("typescript");
const source = file => fs.readFileSync(path.resolve(__dirname,"..",file),"utf8");
function load(file) {
  const filename=path.resolve(__dirname,"..",file);
  const m=new Module(filename,module);m.filename=filename;m.paths=module.paths;
  m._compile(ts.transpileModule(source(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
  return m.exports;
}
const {canAutoDetermineVehiclePrice}=load("lib/automaticVehiclePricing.ts");
const valid={make:"Volvo Trucks",model:"FH",year:2023,condition:"Good",
  mileage:"280000",offerMode:"sale",detailsComplete:true};

test("vehicle price is automatically eligible only after complete usable seller inputs",()=>{
  assert.equal(canAutoDetermineVehiclePrice(valid),true);
  assert.equal(canAutoDetermineVehiclePrice({...valid,offerMode:"sale_or_rental"}),true);
  assert.equal(canAutoDetermineVehiclePrice({...valid,offerMode:"poa"}),true);
  assert.equal(canAutoDetermineVehiclePrice({...valid,offerMode:"rental"}),false);
  assert.equal(canAutoDetermineVehiclePrice({...valid,detailsComplete:false}),false);
  assert.equal(canAutoDetermineVehiclePrice({...valid,make:""}),false);
  assert.equal(canAutoDetermineVehiclePrice({...valid,condition:""}),false);
  assert.equal(canAutoDetermineVehiclePrice({...valid,mileage:""}),false);
  assert.equal(canAutoDetermineVehiclePrice({...valid,mileage:"abc"}),false);
  assert.equal(canAutoDetermineVehiclePrice({...valid,mileage:"-12"}),false);
  assert.equal(canAutoDetermineVehiclePrice({...valid,mileage:"12.5"}),false);
  assert.equal(canAutoDetermineVehiclePrice({...valid,mileage:"100000000"}),false);
  assert.equal(canAutoDetermineVehiclePrice({...valid,mileage:"0"}),true);
  assert.equal(canAutoDetermineVehiclePrice({...valid,year:1900}),false);
  assert.equal(canAutoDetermineVehiclePrice({...valid,year:2999}),false);
});

test("vehicle estimator requests comparisons automatically and suppresses old responses",()=>{
  const panel=source("components/VehicleIntelligentPricingPanel.tsx");
  assert.match(panel,/data-loadlink-price-determination="automatic"/);
  assert.match(panel,/useEffect\(\(\) =>/);
  assert.match(panel,/window\.setTimeout\(async \(\) =>/);
  assert.match(panel,/window\.clearTimeout\(timer\)/);
  assert.match(panel,/if \(!active\) return/);
  assert.match(panel,/loadlink_vehicle_market_recommendation/);
  assert.match(panel,/Number\(evidence\.sample_count\) >= 3/);
  assert.match(panel,/based on/i);
  assert.doesNotMatch(panel,/onClick=\{determinePrice\}/);
  assert.match(panel,/onClick=\{\(\) => onUsePrice\(/);
  assert.match(panel,/offerMode !== "poa"/);
  assert.match(panel,/rental-cost-based/);
});

test("ownership and price results occur after every existing vehicle form field",()=>{
  const vehicle=source("app/list-your-vehicle/LegacyVehicleListingPage.tsx");
  const priceAt=vehicle.indexOf("<VehicleIntelligentPricingPanel");
  const ownerAt=vehicle.indexOf("<VehicleOwnershipEstimator");
  assert.ok(priceAt > vehicle.indexOf('<Field label="Description" wide>'));
  assert.ok(ownerAt > priceAt);
  assert.ok(priceAt < vehicle.indexOf('SectionHeading step="03"'));
  assert.match(vehicle,/readyForEstimate=\{Boolean\(title\.trim\(\) && registrationNumber\.trim\(\) && vin\.trim\(\) && description\.trim\(\) && city\.trim\(\)\)\}/);
  assert.equal(vehicle.split("<VehicleIntelligentPricingPanel").length-1,1);
  assert.equal(vehicle.split("<VehicleOwnershipEstimator").length-1,1);
  assert.match(vehicle,/<Field label="Service history"/);
  assert.match(vehicle,/<Field label="Tyre condition"/);
  assert.match(vehicle,/<Field label="Accident \/ structural damage"/);
  assert.match(vehicle,/<Field label="VIN \/ chassis number"/);
  assert.match(vehicle,/LoadLinkLoading/);
});

test("cost of ownership is prominent and recalculates automatically, without guessed fuel prices",()=>{
  const ui=source("components/VehicleOwnershipEstimator.tsx");
  assert.match(ui,/data-loadlink-cost-automatic="true"/);
  assert.match(ui,/Cost of ownership · automatic calculation/);
  assert.match(ui,/useMemo\(\(\)=>\{/);
  assert.match(ui,/estimateVehicleOwnership\(entry\)/);
  assert.match(ui,/annualKm/);
  assert.match(ui,/actualFuel/);
  assert.match(ui,/dieselRandPerLitre/);
  assert.match(ui,/role="status" aria-live="polite"/);
  assert.match(ui,/useState\(posting\)/);
});

test("job and contract posting display automatic cost-based pricing without requiring a calculate button",()=>{
  const job=source("app/jobs/list/page.tsx"), contract=source("app/contracts/post/page.tsx");
  const calc=source("components/PosterTransportPriceGuide.tsx");
  assert.match(job,/<PosterTransportPriceGuide darkMode=\{darkMode\} contract=\{isContract\} initialExpanded/);
  assert.match(contract,/<PosterTransportPriceGuide darkMode=\{darkMode\} contract initialExpanded/);
  assert.match(calc,/Automatic price determination/);
  assert.match(calc,/estimateTrip\(/);
  assert.match(calc,/estimateContractSpend\(/);
  assert.match(calc,/Calculates|recalculates automatically/i);
  assert.match(calc,/role="status" aria-live="polite"/);
  assert.doesNotMatch(calc,/onClick=\{determinePrice\}/);
  assert.equal(job.split("<PosterTransportPriceGuide").length-1,1);
  assert.equal(contract.split("<PosterTransportPriceGuide").length-1,1);
});
