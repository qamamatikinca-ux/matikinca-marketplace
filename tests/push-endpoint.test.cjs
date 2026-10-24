const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const source = path.resolve(__dirname, '../lib/pushEndpoint.ts');
const compiled = ts.transpileModule(fs.readFileSync(source, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const loaded = new Module(source, module); loaded.filename = source; loaded._compile(compiled, source);
const { isTrustedPushEndpoint } = loaded.exports;
test('push destinations accept browser providers and reject SSRF destinations', () => {
  for (const url of ['https://fcm.googleapis.com/fcm/send/token', 'https://updates.push.services.mozilla.com/wpush/v2/token', 'https://web.push.apple.com/token', 'https://wns2.notify.windows.com/token']) assert.equal(isTrustedPushEndpoint(url), true, url);
  for (const url of ['http://fcm.googleapis.com/token', 'https://localhost/token', 'https://127.0.0.1/token', 'https://169.254.169.254/latest', 'https://[::1]/token', 'https://fcm.googleapis.com.evil.example/token', 'https://fcm.googleapis.com@evil.example/token', 'https://fcm.googleapis.com:8443/token', 'https://evilnotify.windows.com/token', 'data:text/plain,test', 'not a url']) assert.equal(isTrustedPushEndpoint(url), false, url);
});
