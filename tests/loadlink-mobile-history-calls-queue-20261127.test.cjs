const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const ts=require("typescript");
const Module=require("node:module");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
function load(p){
 const filename=path.resolve(__dirname,"..",p);
 const m=new Module(filename,module);m.filename=filename;m.paths=module.paths;
 m._compile(ts.transpileModule(read(p),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
 return m.exports;
}
function storage(){
 const records=new Map();
 return {getItem:k=>records.has(k)?records.get(k):null,setItem:(k,v)=>records.set(k,String(v)),removeItem:k=>records.delete(k),clear:()=>records.clear()};
}
test("mobile gallery return preserves the step for the original owner and submission",()=>{
 global.window={dispatchEvent(){}};
 global.localStorage=storage();global.sessionStorage=storage();
 const draft=load("lib/vehicleDraft.ts");
 draft.scopeVehicleDraft("person-1");
 localStorage.setItem(draft.VEHICLE_DRAFT_KEY,JSON.stringify({vehicleCategory:"truck",brand:"Volvo",modelName:"FH"}));
 localStorage.setItem(draft.VEHICLE_SUBMISSION_KEY,"submission-1");
 draft.saveVehicleWizardStep(2);
 assert.equal(draft.readVehicleWizardStep("person-1","submission-1"),2);
 assert.equal(draft.readVehicleWizardStep("person-2","submission-1"),0);
 assert.equal(draft.readVehicleWizardStep("person-1","submission-2"),0);
 draft.clearVehicleDraft("person-1");
 assert.equal(draft.readVehicleWizardStep("person-1","submission-1"),0);
 delete global.window;delete global.localStorage;delete global.sessionStorage;
});
test("uploading or scanning photos does not observe all descendant mutations or reset the wizard",()=>{
 const wizard=read("components/LoadLinkVehicleWizardController20260825.tsx");
 assert.match(wizard,/saveVehicleWizardStep\(activeStep\)/);
 assert.match(wizard,/readVehicleWizardStep\(\)/);
 assert.match(wizard,/subtree: false/);
 assert.doesNotMatch(wizard,/observer\.observe\([^;]*subtree: true/);
 const upload=read("app/list-your-vehicle/LegacyVehicleListingPage.tsx");
 assert.match(upload,/const combined = \[\.\.\.vehiclePhotos, \.\.\.preparedFiles\]/);
 assert.match(upload,/saveVehiclePhotoDraft\(/);
});
test("contract completion uses a legal lifecycle value and preserves poster-only authorisation",()=>{
 const sql=read("supabase/migrations/20261127145500_history_call_expiry_legacy_vehicle_queue.sql");
 assert.match(sql,/set status='closed', lifecycle_status='archived'/);
 assert.doesNotMatch(sql,/lifecycle_status=case when new\.outcome='completed'/);
 const dialog=read("components/JobConversationStatusDialog.tsx");
 assert.match(dialog,/\.from\("job_closures"\)\.insert/);
 assert.match(dialog,/existing\.data\?\.outcome==="completed"/);
 assert.match(dialog,/onCompleted\?\.\(\)/);
});
test("call button waits for the mounted listener and collects permission before call session",()=>{
 const bootstrap=read("components/LoadLinkCallBootstrap.tsx");
 const call=read("components/LoadLinkCallLayerReliable20260822.tsx");
 const sql=read("supabase/migrations/20261127145500_history_call_expiry_legacy_vehicle_queue.sql");
 assert.match(bootstrap,/loadlink-call-layer-ready/);
 assert.match(bootstrap,/pending = event as CustomEvent/);
 assert.match(call,/window\.dispatchEvent\(new Event\("loadlink-call-layer-ready"\)\)/);
 const start=call.slice(call.indexOf("async function startInApp()"),call.indexOf("async function acceptIncoming()"));
 assert.ok(start.indexOf("getUserMedia")<start.indexOf('action:"start"'));
 assert.match(sql,/last_heartbeat_at < now\(\)-interval '90 seconds'/);
});
test("Control Centre includes legacy asset stock and explains failures",()=>{
 const sql=read("supabase/migrations/20261127145500_history_call_expiry_legacy_vehicle_queue.sql");
 const admin=read("app/admin/listings/page.tsx");
 assert.match(sql,/p_kind,'all'\)='vehicle' and j\.listing_kind='asset'/);
 assert.match(admin,/value === "asset"/);
 assert.match(admin,/Preliminary vehicle reviews could not load/);
});
test("price determination uses bounded real costs and does not invent a price",()=>{
 const {estimateTrip,estimateContractSpend}=load("lib/tripProfitability.ts");
 const estimate=estimateTrip({loadedKm:500,emptyKm:200,litresPer100Km:40,dieselRandPerLitre:20,tolls:1000,driverExpenses:1200,maintenanceRandPerKm:2,otherCosts:800,offeredRevenue:0,targetMarginPercent:20});
 assert.equal(estimate.suggestedRate,12500);
 assert.deepEqual({...estimateContractSpend(estimate.suggestedRate,10,12)},{monthly:125000,contractTotal:1500000});
 assert.equal(estimateTrip({loadedKm:0,emptyKm:0,litresPer100Km:0,dieselRandPerLitre:0,tolls:0,driverExpenses:0,maintenanceRandPerKm:0,otherCosts:0,offeredRevenue:0,targetMarginPercent:20}),null);
 const ui=read("components/VehicleIntelligentPricingPanel.tsx");
 assert.match(ui,/Not enough matching advertised sales/);
 assert.match(ui,/Never overwrites an asking price supplied by the seller/);
});
test("resume listing popup shows meaningful identity, stage and saved time",()=>{
 const toast=read("components/VehicleDraftResumeToast.tsx");
 assert.match(toast,/You have a saved listing/);
 assert.match(toast,/readVehicleWizardStep/);
 assert.match(toast,/Resume listing/);
 assert.doesNotMatch(toast,/Continue your vehicle listing\?/);
});
