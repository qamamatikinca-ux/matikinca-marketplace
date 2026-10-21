const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
function loadTs(relative, mocks = {}) {
  const source = path.resolve(__dirname, relative);
  const compiled = ts.transpileModule(fs.readFileSync(source, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const loaded = new Module(source, module); loaded.filename = source;
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = name => Object.hasOwn(mocks, name) ? mocks[name] : originalRequire(name);
  loaded._compile(compiled, source); return loaded.exports;
}
const pricing = loadTs('../lib/manualPricing.ts');
const daily = { code: 'manual_listing_credit', unit_price_cents: 1400, duration_days: 1, currency: 'ZAR' };
test('daily credit is exactly R14 ZAR for one active day', () => {
  assert.equal(pricing.isManualDailyProduct(daily), true);
  for (const product of [null, {}, { ...daily, duration_days: 10 }, { ...daily, unit_price_cents: 150 }, { ...daily, currency: 'USD' }, { ...daily, code: 'other' }]) assert.equal(pricing.isManualDailyProduct(product), false);
});
test('legacy catalog stops checkout before any order or payment is created', async () => {
  const keys = ['PAYSTACK_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  keys.forEach(key => { process.env[key] = key.includes('URL') ? 'https://test.invalid' : 'test-only-value'; });
  let adminReads = 0, orders = 0;
  const user = { auth: { getUser: async () => ({ data: { user: { id: 'user', email: 'test@example.invalid' } } }) }, rpc: async name => {
    if (name === 'loadlink_get_my_intelligence_state') return { data: { account_status: 'active', plan: 'standard' }, error: null };
    if (name === 'loadlink_get_manual_listing_product') return { data: { ...daily, duration_days: 10 }, error: null };
    orders += 1; throw new Error('Unexpected write');
  } };
  let clients = 0;
  const admin = { from: () => { adminReads += 1; throw new Error('Unexpected admin access'); }, rpc: () => { orders += 1; throw new Error('Unexpected order'); } };
  try {
    const route = loadTs('../app/api/billing/paystack/manual/initialize/route.ts', {
      '@supabase/supabase-js': { createClient: () => clients++ === 0 ? user : admin },
      '@/lib/manualPricing': pricing,
    });
    const response = await route.POST(new Request('https://loadlink.invalid/api/billing/paystack/manual/initialize', { method: 'POST', headers: { Authorization: 'Bearer test-only-session', 'Content-Type': 'application/json' }, body: JSON.stringify({ quantity: 7 }) }));
    assert.equal(response.status, 409);
    assert.equal((await response.json()).error, pricing.MANUAL_DAILY_UNAVAILABLE);
    assert.equal(adminReads, 0); assert.equal(orders, 0);
  } finally { keys.forEach(key => { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; }); }
});
