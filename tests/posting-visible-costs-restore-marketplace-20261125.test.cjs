/* eslint-disable @typescript-eslint/no-require-imports */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');

test('vehicle marketplace does not add secondary keyword and advanced filter panels',()=>{
 const src=read('components/VehicleMarketplaceHub.tsx');
 assert.doesNotMatch(src,/Search commercial vehicles/);
 assert.doesNotMatch(src,/More vehicle filters/);
 assert.doesNotMatch(src,/data-loadlink-vehicle-search-filters/);
 assert.match(src,/setKeyword\(params\.get\("search"\)/);
 assert.match(src,/LoadLinkSortControl/);
 assert.match(src,/VehicleMakeModelPicker/);
});
test('all three posting price tools are near the price field and not duplicated',()=>{
 const job=read('app/jobs/list/page.tsx');
 const contract=read('app/contracts/post/page.tsx');
 const vehicle=read('app/list-your-vehicle/LegacyVehicleListingPage.tsx');
 const calc=read('components/PosterTransportPriceGuide.tsx');
 for(const src of [job,contract]) assert.equal((src.match(/<PosterTransportPriceGuide/g)||[]).length,1);
 assert.match(calc,/Automatic price determination/);
 assert.match(job,/<PosterTransportPriceGuide darkMode=\{darkMode\} contract=\{isContract\}/);
 assert.ok(job.indexOf('<PosterTransportPriceGuide')<job.indexOf('Accept formal transport offers<span'));
 assert.ok(contract.indexOf('<PosterTransportPriceGuide')<contract.indexOf('Accept formal transport offers<span'));
 assert.equal((vehicle.match(/<VehicleIntelligentPricingPanel/g)||[]).length,1);
 assert.equal((vehicle.match(/<VehicleOwnershipEstimator/g)||[]).length,1);
 assert.ok(vehicle.indexOf('<VehicleIntelligentPricingPanel')>vehicle.indexOf('<Field label="Description" wide>'));
 assert.ok(vehicle.indexOf('<VehicleOwnershipEstimator')>vehicle.indexOf('<VehicleIntelligentPricingPanel'));
 assert.ok(vehicle.indexOf('<VehicleIntelligentPricingPanel')<vehicle.indexOf('SectionHeading step="03"'));
});
test('ownership calculator displays its actual form when posting and can be collapsed',()=>{
 const src=read('components/VehicleOwnershipEstimator.tsx');
 assert.match(src,/useState\(posting\)/);
 assert.match(src,/aria-expanded=\{expanded\}/);
 assert.match(src,/setExpanded\(value=>!value\)/);
 for (const field of ['annualKm','dieselRandPerLitre','maintenanceRandPerKm','insuranceMonthly','licenceAnnual','tyresAnnual','financeMonthly','depreciationAnnual']){
  assert.ok(src.includes(field),field+' is included');
 }
 assert.match(src,/estimateVehicleOwnership\(entry\)/);
});
