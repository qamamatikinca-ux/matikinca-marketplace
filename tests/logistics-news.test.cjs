const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
const filename = path.resolve('lib/logisticsNews.ts');
const mod = new Module(filename, module);
mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { isLogisticsNewsItem, parseNewsFeed, newsFeeds, freshLogisticsNews } = mod.exports;
const item = title => ({ title, url: 'https://satrucker.co.za/industry-update/', source: 'SA Trucker', summary: '', publishedAt: '2026-11-08T07:00:00Z', image: 'https://satrucker.co.za/truck.jpg' });
test('only trucking and logistics subjects are eligible regardless of publisher', () => {
  for (const title of ['New electric truck fleet enters service', 'Freight volumes recover at container terminals', 'Warehouse capacity supports the supply chain', 'Truck brake maintenance and arrestor bed safety']) assert.equal(isLogisticsNewsItem(item(title)), true, title);
  for (const title of ['Local football team wins', 'Paper safeguard puts industrial policy in focus', 'Election results announced', 'N4 truck stop leads to R12 million dagga seizure and alleged bribery attempt', 'Stolen truck recovered', 'Truck driver arrested after cargo theft', 'Police investigate freight syndicate', 'Dashcam exposes serious truck crash', 'Trucks escape disaster in a highway near miss']) assert.equal(isLogisticsNewsItem(item(title)), false, title);
});
test('crime in descriptions, categories and URLs is excluded before feed limits', () => {
  const block = (title, extra = '', slug = 'industry-update') => `<item><title>${title}</title><link>https://satrucker.co.za/${slug}/</link><pubDate>Sun, 08 Nov 2026 07:00:00 GMT</pubDate>${extra}</item>`;
  const xml = block('Truck update', '<description><![CDATA[Police made an arrest.]]></description>') + block('Truck update', '<category>Crime</category>') + block('Truck update', '', 'cargo-theft') + block('Truck deliveries grow');
  const parsed = parseNewsFeed(xml, newsFeeds[1], Date.parse('2026-11-08T12:00:00Z'));
  assert.deepEqual(parsed.map(i => i.title), ['Truck deliveries grow']);
});
test('fallbacks and old cached client items cannot bypass the editorial policy', () => {
  const now = Date.parse('2026-11-08T12:00:00Z');
  const items = [item('New truck launch'), item('Truck hijacking investigation'), { ...item('Truck launch'), publishedAt: '2026-10-01T00:00:00Z' }, { ...item('Truck launch'), url: 'https://untrusted.example/trucks' }];
  assert.deepEqual(freshLogisticsNews(items, now).map(i => i.title), ['New truck launch']);
  assert.equal(isLogisticsNewsItem({ ...item('New truck launch'), summary: 'Cargo was stolen by armed robbers.' }), false);
});
