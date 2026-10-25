const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const filename = path.resolve(__dirname, '../lib/conversationStarters.ts');
const loaded = new Module(filename, module);
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
const { conversationStarters } = loaded.exports;
test('every starter refers to the exact post, including owner replies', () => {
 for (const kind of ['job', 'contract', 'vehicle', 'driver', 'unknown']) for (const owner of [false, true]) {
  const title = 'Actual advertised post';
  for (const text of conversationStarters({ title, listing_kind: kind }, 'Different thread title', owner)) assert.ok(text.includes(title));
 }
});
test('job and contract enquiries do not ask about vehicle condition or a viewing', () => {
 for (const kind of ['job', 'contract']) {
  const text = conversationStarters({ title: 'Port work', listing_kind: kind }, '').join(' ');
  assert.doesNotMatch(text, /condition|viewing|can be viewed/);
  assert.match(text, new RegExp(kind));
 }
});
test('missing context stays neutral rather than inferring a type from its title', () => {
 const text = conversationStarters(null, 'Driver job truck sale').join(' ');
 assert.doesNotMatch(text, /collection|delivery|condition|licence|viewed/);
});
test('legacy type is exact and structured type takes precedence', () => {
 assert.match(conversationStarters({ description: 'Listing type: Contract', title: 'Route' }, '').join(' '), /contract/);
 assert.match(conversationStarters({ listing_kind: 'vehicle', description: 'Listing type: Contract', title: 'Truck' }, '').join(' '), /condition/);
 assert.doesNotMatch(conversationStarters({ description: 'Not a Listing type: Contract', title: 'Item' }, '').join(' '), /application process/);
});
