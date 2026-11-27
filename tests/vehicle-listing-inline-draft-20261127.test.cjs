const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");

test("saved listing no longer blocks the vehicle posting page with a fullscreen modal",()=>{
 const source=read("app/list-your-vehicle/page.tsx");
 assert.doesNotMatch(source,/Continue your vehicle listing\?/);
 assert.doesNotMatch(source,/Your saved vehicle details are ready/);
 assert.doesNotMatch(source,/LoadLinkActionToast/);
 assert.doesNotMatch(source,/if \(entryReady && draftDecision === "pending"/);
 assert.match(source,/data-loadlink-saved-draft-inline="true"/);
 assert.match(source,/id="listing-form"/);
});

test("saved draft opens inside the real wizard without losing the current step",()=>{
 const source=read("app/list-your-vehicle/page.tsx");
 const wizard=read("components/LoadLinkVehicleWizardController20260825.tsx");
 assert.match(source,/resumeDraft=\{draftDecision !== "fresh"\}/);
 assert.match(source,/key=\{draftDecision === "fresh" \? "fresh-draft" : "saved-draft"\}/);
 assert.match(source,/readVehicleWizardStep\(\)/);
 assert.match(source,/setDraftDecision\("resume"\)/);
 assert.match(wizard,/readVehicleWizardStep\(\)/);
});

test("Start fresh clears the stored draft and remounts the wizard",()=>{
 const source=read("app/list-your-vehicle/page.tsx");
 assert.match(source,/clearVehicleDraft\(\); setDraftDecision\("fresh"\);/);
 assert.match(source,/Start fresh/);
 assert.match(source,/Keep editing/);
 assert.match(read("lib/vehicleDraft.ts"),/sessionStorage\.removeItem\(VEHICLE_ACTIVE_TAB_KEY \+ owner\)/);
});

test("the home-only reminder stays separate from the listing form",()=>{
 const reminder=read("components/VehicleDraftResumeToast.tsx");
 assert.match(reminder,/pathname !== "\/" \|\| !draft/);
 assert.match(reminder,/bottom-\[max\(90px,env\(safe-area-inset-bottom\)\)\]/);
});
