const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Module=require("node:module");
const ts=require("typescript");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
function load(p){
 const f=path.resolve(__dirname,"..",p),m=new Module(f,module);
 m.filename=f;m.paths=module.paths;
 m._compile(ts.transpileModule(read(p),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
 return m.exports;
}
const {normalizeVehicleIdentity,validateVehicleVin,validateVehicleRegistration,validateEngineNumber,validateVehicleMeasurements}=load("lib/vehicleDataValidation.ts");
test("modern VINs reject made-up or short identifiers such as gghgu8",()=>{
 assert.match(validateVehicleVin("gghgu8",2026,"truck"),/17-character VIN/);
 assert.match(validateVehicleVin("1HGCM82633I004352",2020,"truck"),/cannot contain I, O or Q/);
 assert.match(validateVehicleVin("AAAAAAAAAAAAAAAAA",2026,"truck"),/placeholder/);
 assert.match(validateVehicleVin("1HGCM82633A00435!",2026,"truck"),/letters/);
 assert.equal(normalizeVehicleIdentity(" 1hgcm82633a004352 "),"1HGCM82633A004352");
 assert.equal(validateVehicleVin("1HGCM82633A004352",2026,"truck"),null);
});
test("older vehicle chassis IDs are not falsely rejected for being shorter than 17",()=>{
 assert.equal(validateVehicleVin("ABC12345",1975,"truck"),null);
 assert.match(validateVehicleVin("ABC",1975,"truck"),/5–17/);
});
test("format checks respect customised South African registration plates and bounded engine numbers",()=>{
 assert.equal(validateVehicleRegistration(" ND 123-456 "),null);
 assert.equal(validateVehicleRegistration("CA 12345"),null);
 assert.match(validateVehicleRegistration("K@ GP"),/Use 2–15/);
 assert.equal(validateEngineNumber("EM123-456/7"),null);
 assert.match(validateEngineNumber("X".repeat(21)),/20/);
});
test("numeric vehicle fields reject impossible values while permitting legitimate zero mileage",()=>{
 const d={odometerKm:"0",previousOwners:"0",gvmKg:"32000",payloadKg:"15000",rate:"850000",rentalRate:"",offerMode:"sale"};
 assert.equal(validateVehicleMeasurements(d),null);
 assert.match(validateVehicleMeasurements({...d,odometerKm:"-1"}),/whole-number/);
 assert.match(validateVehicleMeasurements({...d,odometerKm:"30.5"}),/whole-number/);
 assert.match(validateVehicleMeasurements({...d,gvmKg:"12000",payloadKg:"13000"}),/cannot exceed/);
 assert.match(validateVehicleMeasurements({...d,previousOwners:"2.5"}),/Previous owners/);
 assert.match(validateVehicleMeasurements({...d,rate:"-100"}),/positive advertised/);
 assert.match(validateVehicleMeasurements({...d,offerMode:"sale_or_rental",rentalRate:"0"}),/valid positive rental/);
});
test("VIN guidance, numeric validation and dropdowns are part of the actual vehicle-posting flow",()=>{
 const p=read("app/list-your-vehicle/LegacyVehicleListingPage.tsx");
 assert.match(p,/validateVehicleVin\(vin,year,vehicleCategory\)/);
 assert.match(p,/validateVehicleRegistration\(registrationNumber\)/);
 assert.match(p,/validateVehicleMeasurements\(\{odometerKm,previousOwners,gvmKg,payloadKg,rate,rentalRate,offerMode\}\)/);
 assert.match(p,/pattern=\{year>=1981\?/);
 assert.match(p,/maxLength=\{17\}/);
 assert.match(p,/Choose fuel \/ power type/);
 assert.match(p,/Choose axle arrangement \(if applicable\)/);
 assert.match(p,/Other — specify/);
});
test("Home reminder rechecks saved drafts on every Home visit and remembers explicit dismissal for a day",()=>{
 const ui=read("components/VehicleDraftResumeToast.tsx");
 assert.match(ui,/if\(pathname!=="\/"\)/);
 assert.match(ui,/getUser\(\)/);
 assert.match(ui,/loadlink-vehicle-draft-changed/);
 assert.match(ui,/visibilitychange/);
 assert.match(ui,/draftIdentity\(draft/);
 assert.match(ui,/1800/);
 assert.doesNotMatch(ui,/sessionStorage\.getItem\(seen\)/);
});
test("packaging reflects backend photo/message quotas, and featured tier uses active server entitlement",()=>{
 const benefits=read("lib/vehiclePlanBenefits.ts");
 const business=read("components/BusinessPlans.tsx"),packages=read("app/packages/page.tsx"),poster=read("app/list-your-vehicle/LegacyVehicleListingPage.tsx");
 assert.match(benefits,/monthlyListings:5, photoLimit:2, dailyMessages:50/);
 assert.match(benefits,/monthlyListings:10, photoLimit:10, dailyMessages:null/);
 assert.match(benefits,/monthlyListings:null, photoLimit:30, dailyMessages:null/);
 assert.match(business,/VEHICLE_PLAN_RULES\.standard\.features/);
 assert.match(business,/VEHICLE_PLAN_RULES\.pro\.features/);
 assert.match(packages,/VEHICLE_PLAN_RULES\.pro\.features/);
 assert.match(poster,/data-loadlink-plan-entitlements="verified"/);
 assert.match(poster,/const effectivePackage:/);
 assert.match(poster,/sponsored: effectivePackage/);
 assert.doesNotMatch(poster,/sponsored: packageType === "pro"/);
});
test("database enforces VIN and truck measurements, not just client form",()=>{
 const sql=read("supabase/migrations/20261127220000_vehicle_identity_data_guard.sql");
 assert.match(sql,/create trigger loadlink_truck_identity_format_guard/);
 assert.match(sql,/length\(v_vin\) <> 17/);
 assert.match(sql,/NEW\.vin/iu); // server assigns canonical uppercase VIN
 assert.match(sql,/new\.payload_kg>new\.gvm_kg/);
});
