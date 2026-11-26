/* eslint-disable @typescript-eslint/no-require-imports */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Module=require("node:module");
const ts=require("typescript");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
function load(p){
 const filename=path.resolve(__dirname,"..",p);
 const mod=new Module(filename,module);mod.filename=filename;mod.paths=module.paths;
 mod._compile(ts.transpileModule(read(p),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
 return mod.exports;
}
const camera=load("lib/vehicleFaceCamera.ts");
const photoDraft=load("lib/vehiclePhotoDraft.ts");
const checks=load("lib/vehiclePostingIntelligence.ts");

test("camera error guidance is actionable and MP4/WebM choices are device-specific",()=>{
 assert.match(camera.cameraFailureText({name:"NotAllowedError"}),/Allow camera access/);
 assert.match(camera.cameraFailureText({name:"NotReadableError"}),/Another app/);
 assert.match(camera.cameraFailureText({name:"NotFoundError"}),/front camera/);
 assert.match(camera.cameraFailureText({name:"OverconstrainedError"}),/camera settings/);
 assert.equal(camera.selectRecordingMime(type=>type==="video/mp4"),"video/mp4");
 assert.equal(camera.selectRecordingMime(type=>type==="video/webm"),"video/webm");
 assert.equal(camera.selectRecordingMime(()=>false),"");
});

test("camera scan keeps all five challenge steps and never asserts identity approval",()=>{
 const scan=read("components/VehicleSellerCameraCheck.tsx");
 assert.match(scan,/waitForCameraFrame\(player\)/);
 assert.match(scan,/loadFaceGuidance\(\)/);
 assert.match(scan,/recording\.size>8\*1024\*1024/);
 assert.match(scan,/checkDriverFrame\(/);
 assert.match(scan,/updateDriverHold\(/);
 assert.match(scan,/const poses:Pose\[\]=\["centre"/);
 assert.match(scan,/Previous|previous valid capture/);
 assert.match(scan,/setStage\(hasCapture\?"done":"idle"\)/);
 assert.match(scan,/Request staff review/);
 assert.match(scan,/not automatically identify you or prove liveness/);
 assert.match(scan,/className="max-h-\[40dvh\] w-full -scale-x-100/);
 const sql=read("supabase/migrations/20261127002500_private_seller_face_video_storage.sql");
 for(const mime of ["video/mp4","video/webm"])assert.ok(sql.includes(mime));
 assert.match(sql,/public=false/);
});

test("mobile vehicle photo picker adds photos instead of discarding existing ones",()=>{
 const form=read("app/list-your-vehicle/LegacyVehicleListingPage.tsx");
 assert.match(form,/const combined = \[\.\.\.vehiclePhotos,\s*\.\.\.preparedFiles\]/);
 assert.match(form,/const remaining = Math\.max\(0, max - vehiclePhotos\.length\)/);
 assert.match(form,/preparedPreviews\.forEach\(revokePreviewUrl\)/);
 assert.match(form,/removeVehiclePhoto\(index/);
 assert.match(form,/setVehiclePhotos\(nextFiles\)/);
 assert.match(form,/saveVehiclePhotoDraft\(/);
 assert.match(form,/restoreVehiclePhotoDraft\(/);
 assert.match(form,/readableUploadError\(/);
 assert.match(form,/preparingVehiclePhotos \|\| saving/);
 assert.match(form,/photoRecoveryNotice/);
 assert.match(form,/Clear|clearVehiclePhotoDraft/);
});

test("file recovery stays user-scoped, excludes ID documents and degrades safely",async()=>{
 const draft=read("lib/vehiclePhotoDraft.ts");
 assert.match(draft,/userId\.trim\(\) \+ ":" \+ submissionId\.trim\(\)/);
 assert.match(draft,/indexedDB\.open\(DATABASE, VERSION\)/);
 assert.doesNotMatch(draft,/idDocument|sellerFaceEvidence|vehicle-verification/);
 assert.deepEqual(await photoDraft.restoreVehiclePhotos("owner","submission"),[]);
 assert.equal(await photoDraft.saveVehiclePhotos("owner","submission",[]),false);
 await photoDraft.clearVehiclePhotos("owner","submission");
 const state=read("lib/vehicleDraft.ts");
 assert.match(state,/isVehicleDraftActiveInTab/);
 assert.match(state,/markVehicleDraftActiveInTab/);
 assert.match(read("components/LoadLinkVehicleWizardController20260825.tsx"),/clearVehiclePhotoDraft/);
});

test("model-year checks are specific and do not block a legitimate next-year model",()=>{
 const base={category:"truck",make:"Volvo",model:"FH",year:2026,bodyType:"Tractor",condition:"Good",
 transmission:"Automatic",fuel:"Diesel",mileage:"10000",gvm:"12000",payload:"8000",
 offer:"sale",salePrice:"500000",rentalPrice:"",rentalPeriod:"month",serviceHistory:"Full",
 description:"Vehicle description with known history, complete maintenance and accurate documentation.",
 photoCount:2,packageType:"pro"};
 const next=checks.assessVehicleListing({...base,year:new Date().getFullYear()+1});
 assert.ok(!next.some(x=>x.level==="warning"&&/manufacturing-year range/.test(x.message)));
 assert.ok(next.some(x=>x.level==="suggestion"&&/Next-year model/.test(x.message)));
 const future=checks.assessVehicleListing({...base,year:new Date().getFullYear()+3});
 assert.ok(future.some(x=>x.level==="warning"&&/Selected year/.test(x.message)));
 assert.ok(!checks.assessVehicleListing(base).some(x=>/manufacturing year/.test(x.message)));
});

test("Step 4 shows an actual submit button and actionable year correction",()=>{
 const wizard=read("components/LoadLinkVehicleWizardController20260825.tsx");
 const form=read("app/list-your-vehicle/LegacyVehicleListingPage.tsx");
 assert.match(wizard,/function submitFromReview\(/);
 assert.match(wizard,/form\.requestSubmit\(/);
 assert.match(wizard,/onClick=\{submitFromReview\}/);
 assert.doesNotMatch(wizard,/Review, then submit below/);
 assert.match(wizard,/loadlink-vehicle-open-step/);
 assert.match(form,/Edit model year/);
 assert.match(form,/role="alert"/);
 assert.match(form,/bg-\[\#f8f9fa\] text-black/);
});
