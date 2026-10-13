const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const source = path.resolve(__dirname, '../lib/callHistory.ts');
const compiled = ts.transpileModule(fs.readFileSync(source, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const loaded = new Module(source, module); loaded.filename = source; loaded._compile(compiled, source);
const { describeCall, mergeChatTimeline } = loaded.exports;
const now = Date.parse('2026-10-13T08:00:00Z');
const base = { id: 'call1', conversation_id: 'thread', caller_user_id: 'caller', callee_user_id: 'callee', started_at: '2026-10-13T07:55:00Z', ended_at: '2026-10-13T07:58:00Z', last_heartbeat_at: '2026-10-13T07:58:00Z', status: 'ended', end_reason: null };
const signal = (type, payload = {}) => ({ session_id: base.id, signal_type: type, created_at: '2026-10-13T07:56:00Z', payload });
test('unanswered call uses the recipient perspective', () => {
  assert.equal(describeCall(base, 'callee', [], now).label, 'Missed voice call');
  assert.equal(describeCall(base, 'caller', [], now).label, 'Unanswered voice call');
});
test('declined and failed calls never show negotiated audio as connected', () => {
  assert.equal(describeCall({ ...base, end_reason: 'declined' }, 'callee', [signal('answer')], now).detail, 'You declined');
  const failed = describeCall({ ...base, end_reason: 'connection_failed' }, 'caller', [signal('answer')], now);
  assert.equal(failed.label, 'Call could not connect');
  assert.equal(failed.detail, 'Connection interrupted');
});
test('new duration measures connected audio and excludes ringing time', () => {
  const call = describeCall(base, 'caller', [signal('answer'), signal('hangup', { reason: 'ended', connected_at: '2026-10-13T07:57:00Z', connected_seconds: 61 })], now);
  assert.equal(call.detail, '1m 1s');
});
test('zero duration without a connection stays unanswered', () => {
  assert.equal(describeCall(base, 'caller', [signal('hangup', { connected_at: null, connected_seconds: 0 })], now).label, 'Unanswered voice call');
});
test('legacy answer-based durations are marked approximate', () => {
  assert.equal(describeCall(base, 'caller', [signal('answer')], now).detail, 'About 2m');
});
test('stale active calls stop showing in progress', () => {
  const row = { ...base, status: 'active', ended_at: null };
  assert.equal(describeCall(row, 'callee', [], now).ongoing, false);
  assert.equal(describeCall(row, 'callee', [], now).missed, true);
  assert.equal(describeCall(row, 'caller', [signal('answer')], now).detail, 'Call interrupted');
});
test('calls appear between messages without mutating the message array', () => {
  const messages = [{ id: 'before', created_at: '2026-10-13T07:54:00Z' }, { id: 'after', created_at: '2026-10-13T07:59:00Z' }];
  const timeline = mergeChatTimeline(messages, [describeCall(base, 'caller', [], now)]);
  assert.deepEqual(timeline.map(entry => entry.key), ['message:before', 'call:call1', 'message:after']);
  assert.equal(messages.length, 2);
});
test('hangup reason takes effect before the session update arrives', () => {
  const row = { ...base, status: 'active', ended_at: null };
  const call = describeCall(row, 'callee', [signal('hangup', { reason: 'cancelled', connected_seconds: 0 })], now);
  assert.equal(call.label, 'Missed voice call');
  assert.equal(call.ongoing, false);
});
