/* eslint-disable @typescript-eslint/no-require-imports */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),Module=require("node:module"),ts=require("typescript");
function load(p){
 const file=path.resolve(__dirname,"..",p),mod=new Module(file,module);
 mod.filename=file;mod.paths=module.paths;
 mod._compile(ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{
   module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
 }}).outputText,file);return mod.exports;
}
const {getLightCommercialModelPrefill}=load("lib/southAfricanLightCommercialCatalog.ts");
test("limited bakkie/van prefill uses only unambiguous model-year combinations",()=>{
 assert.deepEqual(getLightCommercialModelPrefill("Volkswagen","ID. Buzz Cargo",2025),
  {fuelType:"Electric",bodyType:"Panel van"});
 assert.deepEqual(getLightCommercialModelPrefill("Ford","E-Transit",2024),
  {fuelType:"Electric"});
 assert.deepEqual(getLightCommercialModelPrefill("Maxus","eDeliver 3",2024),
  {fuelType:"Electric",bodyType:"Panel van"});
 assert.deepEqual(getLightCommercialModelPrefill("Opel","Combo Cargo",2024),
  {bodyType:"Panel van"});
});
test("model autofill never invents values for generic, unrecognised or invalid-year models",()=>{
 assert.equal(getLightCommercialModelPrefill("Toyota","Hilux",2024),null);
 assert.equal(getLightCommercialModelPrefill("Ford","Transit",2025),null);
 assert.equal(getLightCommercialModelPrefill("Ford","E-Transit",2019),null);
 assert.equal(getLightCommercialModelPrefill("Volkswagen","ID. Buzz Cargo",2023),null);
 assert.equal(getLightCommercialModelPrefill("Volkswagen","ID. Buzz Cargo plus",2025),null);
 assert.equal(getLightCommercialModelPrefill("Unknown","Unverified",2026),null);
});
test("switching model preserves explicit different seller values and avoids stale suggestions",()=>{
 const form=fs.readFileSync(path.resolve(__dirname,"..","app/list-your-vehicle/LegacyVehicleListingPage.tsx"),"utf8");
 assert.match(form,/setFuelType\(current => !current \|\| current === previous\?\.fuelType/);
 assert.match(form,/setBodyType\(current => !current \|\| current === previous\?\.bodyType/);
 assert.match(form,/setTransmission\(reference\?\.verified_transmission/);
 assert.match(form,/getLightCommercialModelPrefill\(brand, name, year\)/);
});
