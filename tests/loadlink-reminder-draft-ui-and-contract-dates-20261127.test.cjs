const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const read = (p) => fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
function load(p) {
 const file=path.resolve(__dirname,"..",p);
 const m=new Module(file,module); m.filename=file; m.paths=module.paths;
 m._compile(ts.transpileModule(read(p),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
 return m.exports;
}
const { suggestContractEndDate } = load("lib/contractCompletionDate.ts");
test("unambiguous contract durations calculate editable calendar dates",()=>{
 assert.equal(suggestContractEndDate("2026-11-27","12 months"),"2027-11-27");
 assert.equal(suggestContractEndDate("2027-01-31","1 month"),"2027-02-28");
 assert.equal(suggestContractEndDate("2024-01-31","1 month"),"2024-02-29");
 assert.equal(suggestContractEndDate("2026-11-27","2 weeks"),"2026-12-11");
 assert.equal(suggestContractEndDate("2026-11-27","1 year"),"2027-11-27");
});
test("unknown or invalid contract duration never invents an end date",()=>{
 for(const value of ["ongoing","approx 12 months","indefinite","0 months","121 months","24 years",""]) {
  assert.equal(suggestContractEndDate("2026-11-27",value),"",value);
 }
 assert.equal(suggestContractEndDate("not a date","12 months"),"");
 assert.equal(suggestContractEndDate("2026-02-30","1 month"),"");
});
test("contract form retains a user-editable end date and persists it to History",()=>{
 const p=read("app/contracts/post/page.tsx");
 assert.match(p,/Expected completion date — optional/);
 assert.match(p,/suggestContractEndDate\(startDate, duration\)/);
 assert.match(p,/setEndDateOverridden\(true\)/);
 assert.match(p,/draft\.endDateOverridden/);
 assert.match(p,/expectedEndDate && expectedEndDate < startDate/);
 assert.match(p,/work_ends_at:/);
 assert.match(p,/\.eq\("user_id",auth\.user\.id\)\.select\("id"\)/);
});
test("History reminder displays on Home or a new enquiry, not over an existing chat",()=>{
 const p=read("components/JobCompletionReminder.tsx");
 assert.match(p,/useSearchParams\(\)/);
 assert.match(p,/searchParams\.has\("listing"\) && !searchParams\.has\("thread"\)/);
 assert.match(p,/reminderRoute==="home"\?9000:1200/);
 assert.match(read("app/layout.tsx"),/<Suspense fallback=\{null\}><JobCompletionReminder \/><\/Suspense>/);
});
test("only approved jobs and ended contracts are eligible for a reminder",()=>{
 const p=read("components/JobCompletionReminder.tsx");
 assert.equal((p.match(/\.eq\("moderation_status","approved"\)/g)||[]).length,2);
 assert.match(p,/\.eq\("listing_kind","contract"\)/);
 assert.match(p,/\.not\("work_ends_at","is",null\)/);
 assert.match(p,/zaDate\(due\)<=date/);
 assert.match(p,/loadlink-due-dismiss/);
 assert.match(p,/loadlink-due-complete/);
 assert.match(p,/closeError\.code==="23505"/);
 assert.match(p,/\.from\("job_closures"\)\.insert/);
});
test("saved draft prompt is compact, detailed, delayed and never shown over messages",()=>{
 const p=read("components/VehicleDraftResumeToast.tsx");
 assert.match(p,/if\(pathname!=="\/"\)/);
 assert.match(p,/if\(pathname!=="\/"\|\|!visible\)return null;/);
 assert.match(p,/1800/);
 assert.match(p,/readVehicleWizardStep/);
 assert.match(p,/saved listing/);
 assert.match(p,/bottom-\[max\(96px,env\(safe-area-inset-bottom\)\)\]/);
 assert.doesNotMatch(p,/Continue your vehicle listing\?/);
});
