const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const source=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
test("application document cards preserve white paper and dark ink in either chat mode",()=>{
 const component=source("components/LoadLinkApplicationCard.tsx");
 const css=source("app/loadlink-refresh-theme-20261015.css");
 const globals=source("app/globals.css");
 assert.match(component,/data-loadlink-application-card="true"/);
 assert.match(css,/html\[data-loadlink-theme\] body \.loadlink-messages \[data-loadlink-application-card="true"\]/);
 assert.match(css,/background: #fff !important/);
 assert.match(css,/color: #171717 !important/);
 assert.match(css,/data-loadlink-application-card="true"\] \[class\*="text-black\/"/);
 assert.match(globals,/html\[data-loadlink-theme="dark"\] \.loadlink-messages \[class\*="bg-white"\]/);
});
