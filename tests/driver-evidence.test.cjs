const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const crypto = require('node:crypto');
function handler({ bytes = new Uint8Array([137,80,78,71,13,10,26,10]), budget = true, user = { id: 'owner' } } = {}) {
 const writes = []; let downloads = 0, endpoint;
 const admin = {
  auth: { getUser: async () => ({ data: { user }, error: null }) },
  rpc: async (name, payload) => {
   if (name === 'loadlink_reserve_driver_evidence_attempt') return { data: budget, error: null };
   assert.equal(name, 'loadlink_register_driver_document_for_user'); writes.push(payload);
   return { data: { document: { id: 'recorded' } }, error: null };
  },
  from: table => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: table === 'driver_profiles' ? { id: 'profile' } : null, error: null }) }) }) }),
  storage: { from: () => ({ download: async () => { downloads++; return { data: new Blob([bytes]), error: null }; } }) },
 };
 const previous = global.Deno;
 global.Deno = { env: { get: () => 'fixture-only' }, serve: value => { endpoint = value; } };
 const filename = path.resolve(__dirname, '../supabase/functions/loadlink-driver-evidence/index.ts');
 const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
 const loaded = new Module(filename, module);
 loaded.require = name => name.startsWith('npm:') ? { createClient: () => admin } : require(name);
 try { loaded._compile(compiled, filename); } finally { global.Deno = previous; }
 return { run: async body => {
  const old = global.Deno; global.Deno = { env: { get: () => 'fixture-only' } };
  try { return await endpoint(new Request('https://fixture.test', { method: 'POST', headers: { Authorization: 'Bearer fixture' }, body: JSON.stringify(body) })); }
  finally { global.Deno = old; }
 }, writes, downloads: () => downloads };
}
const body = { documentType: 'portrait', path: 'owner/portrait/12345678-1234-1234-1234-123456789012-photo.png', filename: 'photo.png' };
test('trusted processor recomputes fingerprints and identity instead of accepting caller attestations', async () => {
 const bytes = new Uint8Array([137,80,78,71,13,10,26,10]); const h = handler({ bytes });
 const r = await h.run({ ...body, p_user_id: 'someone-else', p_sha256: 'forged', p_size_bytes: 1 });
 assert.equal(r.status, 200);
 assert.equal(h.writes[0].p_user_id, 'owner');
 assert.equal(h.writes[0].p_size_bytes, bytes.length);
 assert.equal(h.writes[0].p_sha256, crypto.createHash('sha256').update(bytes).digest('hex'));
 const result = await r.json(); assert.equal(result.document.id, 'recorded'); assert.equal(result.previousStoragePath, undefined);
});
test('another user path and anonymous accounts cannot register evidence', async () => {
 const h = handler(); assert.equal((await h.run({ ...body, path: body.path.replace('owner/', 'stranger/') })).status, 400); assert.equal(h.downloads(), 0);
 const anon = handler({ user: { id: 'owner', is_anonymous: true } }); assert.equal((await anon.run(body)).status, 401); assert.equal(anon.writes.length, 0);
});
test('shared attempt budget stops downloads and PDFs cannot be profile photos', async () => {
 const limited = handler({ budget: false }); assert.equal((await limited.run(body)).status, 429); assert.equal(limited.downloads(), 0);
 const pdf = handler({ bytes: new TextEncoder().encode('%PDF-1.7 %%EOF') }); assert.equal((await pdf.run(body)).status, 400); assert.equal(pdf.writes.length, 0);
});
