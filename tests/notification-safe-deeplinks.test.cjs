/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const source = fs.readFileSync(path.join(__dirname,"..","components/NotificationCenter.tsx"),"utf8");
const declaration = source.slice(source.indexOf("export function safeNotificationHref"),source.indexOf("export default function NotificationCenter"));
const moduleObj = { exports:{} };
const js = ts.transpileModule(declaration,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function("module","exports",js)(moduleObj,moduleObj.exports);
const { safeNotificationHref } = moduleObj.exports;

test("notification links accept safe internal app destinations",()=>{
  for(const href of ["/notifications","/vehicles/123","/messages?conversation=abc","/account/settings#notifications"]){
    assert.equal(safeNotificationHref(href),href);
  }
});
test("notification links reject external or disguised destinations",()=>{
  for(const href of ["https://example.com","javascript:alert(1)","//evil.example","/%2fexample.com","/%5cattack","/\\evil.example","/x\nattack",null,undefined,""]){
    assert.equal(safeNotificationHref(href),null);
  }
});