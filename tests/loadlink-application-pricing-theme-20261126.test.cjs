/* eslint-disable @typescript-eslint/no-require-imports */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Module=require("node:module");
const ts=require("typescript");

const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
function load(p){
  const filename=path.join(__dirname,"..",p);
  const m=new Module(filename,module);
  m.filename=filename;
  m.paths=module.paths;
  m._compile(ts.transpileModule(read(p),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
  return m.exports;
}
const {estimateTrip,estimateContractSpend}=load("lib/tripProfitability.ts");
const {estimateVehicleOwnership}=load("lib/vehicleOwnershipCost.ts");
const {parseLoadLinkApplication}=load("lib/loadlinkApplication.ts");

test("a real job application is handed to chat as a private structured preview, not URL text",()=>{
  const draft=read("components/ContractApplicationDraft.tsx");
  const chat=read("app/messages/page.tsx");
  const card=read("components/LoadLinkApplicationCard.tsx");
  const sql=read("supabase/migrations/20261126043000_structured_listing_applications.sql");
  assert.match(draft,/savePendingApplication\(draft\)/);
  assert.match(draft,/&application=1/);
  assert.doesNotMatch(draft,/&draft=/);
  assert.match(chat,/data-loadlink-application-composer/);
  assert.match(chat,/send_listing_guest_application/);
  assert.match(chat,/message\.message_kind === "application"/);
  assert.match(chat,/message\.message_kind !== "application" && message\.body/);
  assert.match(card,/data-loadlink-application-card/);
  assert.match(card,/View full application/);
  assert.match(sql,/v_role is distinct from 'buyer'/);
  assert.match(sql,/grant execute on function public\.send_listing_guest_application\(uuid,text,jsonb\) to authenticated/i);
  assert.match(sql,/client_token/);
});

test("application handoff rejects expired, incorrect-listing and malformed previews",()=>{
  const now=Date.now(), listing_id="11111111-1111-4111-8111-111111111111";
  const payload={
    listing_id,kind:"job",listing_title:"Johannesburg to Durban",city:"Gauteng",
    advertised_rate:"R20 000",vehicle:"Superlink",applicant_name:"Example user",
    company:"",email:"",phone:"",area:"",offer:"",note:"",details:"Example application",
    client_token:"22222222-2222-4222-8222-222222222222",created_at:now,
  };
  assert.equal(parseLoadLinkApplication(payload,listing_id,now).kind,"job");
  assert.equal(parseLoadLinkApplication(payload,"33333333-3333-4333-8333-333333333333",now),null);
  assert.equal(parseLoadLinkApplication({...payload,created_at:now-3_600_001},listing_id,now),null);
  assert.equal(parseLoadLinkApplication({...payload,created_at:now+60_001},listing_id,now),null);
  assert.equal(parseLoadLinkApplication({...payload,kind:"quote"},listing_id,now),null);
  assert.equal(parseLoadLinkApplication({...payload,client_token:"bad"},listing_id,now),null);
  assert.equal(parseLoadLinkApplication({...payload,note:"a".repeat(900)},listing_id,now).note.length,600);
});

test("price determination returns auditable cost, margin and contract totals",()=>{
  const input={loadedKm:100,emptyKm:20,litresPer100Km:30,dieselRandPerLitre:24,
    tolls:100,driverExpenses:500,maintenanceRandPerKm:2,otherCosts:100,
    offeredRevenue:0,targetMarginPercent:20};
  const e=estimateTrip(input);
  assert.ok(e);
  assert.equal(e.totalKm,120);
  assert.equal(e.fuelLitres,36);
  assert.equal(e.fuelCost,864);
  assert.equal(e.maintenanceCost,240);
  assert.equal(e.breakEvenRate,1804);
  assert.equal(e.suggestedRate,2255);
  assert.deepEqual(estimateContractSpend(e.suggestedRate,20,12),{monthly:45100,contractTotal:541200});
  assert.equal(estimateContractSpend(2255,0,12),null);
  assert.equal(estimateContractSpend(2255,20.5,12),null);
  assert.equal(estimateContractSpend(2255,20,0),null);
  assert.equal(estimateTrip({...input,targetMarginPercent:100}),null);
  assert.equal(estimateTrip({...input,targetMarginPercent:96}),null);
  assert.equal(estimateTrip({...input,dieselRandPerLitre:-1}),null);
  assert.equal(estimateTrip({...input,loadedKm:0}),null);
  assert.equal(estimateTrip({...input,loadedKm:Number.NaN}),null);
});

test("ownership calculator covers annual monthly and kilometre costs without counting loan principal",()=>{
  const v={annualKm:80000,litresPer100Km:30,dieselRandPerLitre:24,maintenanceRandPerKm:2,
    insuranceMonthly:3000,licenceAnnual:12000,tyresAnnual:24000,
    financeMonthly:1200,depreciationAnnual:80000};
  const e=estimateVehicleOwnership(v);
  assert.ok(e);
  assert.equal(e.annualFuel,576000);
  assert.equal(e.annualMaintenance,160000);
  assert.equal(e.annualFixed,166400);
  assert.equal(e.annualTotal,902400);
  assert.equal(e.monthlyTotal,75200);
  assert.equal(e.costPerKm,11.28);
  assert.equal(estimateVehicleOwnership({...v,annualKm:0}),null);
  assert.equal(estimateVehicleOwnership({...v,annualKm:600000}),null);
  assert.equal(estimateVehicleOwnership({...v,tyresAnnual:-1}),null);
  assert.equal(estimateVehicleOwnership({...v,financeMonthly:Number.POSITIVE_INFINITY}),null);
  const ui=read("components/VehicleOwnershipEstimator.tsx");
  assert.match(ui,/Finance interest per month/);
  assert.match(ui,/Electricity price \(R\/kWh\)/);
  assert.match(ui,/useState\(posting\)/);
});

test("theme stays light on first visit, avoids global 360ms delay, and uses mobile colour fade",()=>{
  const layout=read("app/layout.tsx"),hook=read("lib/useLoadLinkTheme.ts");
  const globals=read("app/globals.css"),refresh=read("app/loadlink-refresh-theme-20261015.css");
  assert.match(layout,/data-loadlink-theme="light"/);
  assert.match(hook,/const mobileTouch =/);
  assert.match(hook,/if \(mobileTouch\)/);
  assert.match(hook,/root\.dataset\.loadlinkThemeFallback = "true"/);
  assert.doesNotMatch(globals,/transition-duration: 360ms;/);
  assert.match(refresh,/transition-duration: 180ms !important/);
  assert.match(refresh,/prefers-reduced-motion: reduce/);
});
