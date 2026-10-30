const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, resolve = require) {
 const module = { exports: {} };
 const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
 new Function('require', 'module', 'exports', code)(resolve, module, module.exports);
 return module.exports;
}
const live = load('lib/liveIdentity.ts');
const guidance = load('lib/driverCapture.ts', () => live);
const cameraQuality = load("lib/cameraQuality.ts");
const review = load('lib/driverFaceReview.ts', () => live);
const vector = n => new Float32Array(128).fill(n);

test('an unreadable ID is inconclusive and preserves the completed camera evidence for review', async () => {
 const result = await review.compareDriverEvidence(async source => {
  if (source === 'identity') throw new Error('ID inference unavailable');
  return [vector(0)];
 });
 assert.equal(result.distance, null);
 assert.equal(result.continuity, 0);
});
test('a detected change of face requires another capture', async () => {
 await assert.rejects(review.compareDriverEvidence(async source => [vector(source === 'last' ? 1 : 0)]), /same face throughout/);
});
test('ambiguous ID faces never produce a match score', async () => {
 const result = await review.compareDriverEvidence(async source => source === 'identity' ? [vector(0), vector(1)] : [vector(0)]);
 assert.equal(result.distance, null);
});

async function exerciseCamera(t, missing = false) {
 const keys = ['navigator', 'MediaRecorder', 'document', 'Image', 'performance', 'setTimeout'];
 const previous = Object.fromEntries(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
 t.after(() => { for (const key of keys) { if (previous[key]) Object.defineProperty(globalThis, key, previous[key]); else delete globalThis[key]; } });
 const actualTimer = setTimeout;
 let clock = 0, target = 'centre', stateIndex = 0, refIndex = 0;
 const events = [], stages = [], messages = [], progress = [];
 const el = { videoWidth: 640, videoHeight: 480, srcObject: null, play: async () => events.push('preview') };
 const refs = [el, { scrollIntoView() {} }, null, null, 0, false, null];
 const react = {
  useCallback: fn => fn, useEffect() {},
  useRef: initial => ({ current: refIndex < refs.length ? refs[refIndex++] : initial }),
  useState: initial => {
   const index = stateIndex++;
   return [index === 1 ? true : initial, value => {
    if (index === 2) stages.push(value);
    if (index === 3) messages.push(value);
    if (index === 5) progress.push(value);
    if (index === 6) target = value;
    if (index === 7) messages.push(value);
   }];
  },
 };
 const jsx = (type, props) => ({ type, props });
 const descriptorTask = { withFaceLandmarks(tiny) { assert.equal(tiny, true); return this; }, withFaceDescriptors() { return this; }, async run() { return [{ descriptor: vector(0) }]; } };
 const api = {
  TinyFaceDetectorOptions: class {},
  detectAllFaces(input) {
   if (input !== el) { events.push('comparison'); return descriptorTask; }
   return { withFaceLandmarks(tiny) { assert.equal(tiny, true); return this; }, async run() {
    events.push('detect');
    if (missing) return [];
    const points = Array.from({ length: 68 }, () => ({ x: 320, y: 220 }));
    for (let i = 36; i < 42; i++) points[i].x = 280;
    for (let i = 42; i < 48; i++) points[i].x = 360;
    points[30].x = target === 'left' ? 340 : target === 'right' ? 300 : 320;
    return [{ detection: { box: { x: 190, y: 80, width: 260, height: 320 } }, landmarks: { positions: points } }];
   } };
  },
 };
 const track = { stop() { events.push('track-stopped'); } };
 const env = {
  navigator: { mediaDevices: { getUserMedia: async () => { events.push('camera'); return { getTracks: () => [track] }; } } },
  MediaRecorder: class {
   static isTypeSupported(value) { return value === 'video/mp4'; }
   state = 'inactive';
   start() { events.push('record'); this.state = 'recording'; }
   stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['test-only-video']) }); this.onstop?.(); events.push('record-stopped'); }
  },
  document: { hidden: false, createElement() { return { width: 0, height: 0, getContext: () => ({ drawImage() {}, getImageData() { const data=new Uint8ClampedArray(80*80*4);for(let i=0;i<80*80;i++){const value=(i+Math.floor(i/80))%2?235:40;data.set([value,value,value,255],i*4);}return {data};} }), toDataURL:()=>"data:image/jpeg;base64,dGVzdA==", toBlob: callback => callback(new Blob(['test-only-portrait'], { type: 'image/jpeg' })) }; } },
  Image: class { width = 640; height = 480; async decode() {} },
  performance: { now: () => clock += 180 },
  setTimeout: (callback, delay) => actualTimer(callback, delay === 80 ? 0 : delay),
 };
 for (const [key, value] of Object.entries(env)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
 const request = async body => {
  events.push(body.action);
  if (body.action === 'start') return Response.json({ check: { id: 'fixture', user_id: 'fixture', challenge: ['centre', 'left', 'centre', 'right', 'centre'] }, uploads: {} });
  if (body.action === 'document') throw new Error('ID processing unavailable');
  throw new Error('Unexpected request: ' + body.action);
 };
 const component = load('components/DriverCameraCheck.tsx', id => {
  if (id === 'react') return react;
  if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
  if (id === 'next/link' || id.endsWith('/LoadLinkIcon') || id.endsWith('/CameraExample')) return () => null;
  if (id.endsWith('/cameraQuality')) return cameraQuality;
  if (id.endsWith('/supabaseClient')) return { supabase: {} };
  if (id.endsWith('/driverIdentityClient')) return { driverIdentityRequest: request };
  if (id.endsWith('/faceComparison')) return { loadFaceGuidance: async () => { events.push('models'); return api; }, loadFaceComparison: async () => api };
  if (id.endsWith('/driverFaceReview')) return review;
  if (id.endsWith('/liveIdentity')) return live;
  if (id.endsWith('/driverCapture')) return guidance;
  throw new Error(id);
 }).default;
 const tree = component({ state: { identityReady: true, identityMime: 'image/jpeg', check: null }, disabled: false, onBusy() {}, onSaved: async () => {} });
 function find(node) {
  if (!node) return null;
  if (Array.isArray(node)) return node.map(find).find(Boolean);
  if (typeof node !== 'object') return null;
  if (node.type === 'button' && node.props.children === 'Start camera check') return node;
  return find(node.props?.children);
 }
 await find(tree).props.onClick();
 // The JSX handler starts the async function without returning its promise.
 for (let i = 0; i < 300 && !stages.some(s => s === 'review' || s === 'idle'); i++) await new Promise(resolve => actualTimer(resolve, 1));
 return { events, stages, messages, progress };
}
test('camera opens before ID analysis; all real movement prompts finish despite an unreadable ID', async t => {
 const result = await exerciseCamera(t);
 assert.equal(result.events[0], 'camera');
 assert(result.events.indexOf('record-stopped') < result.events.indexOf('document'));
 assert.deepEqual(result.progress, [0, 1, 2, 3, 4, 5]);
 assert(result.stages.includes('review'));
 assert(result.messages.some(value => /staff comparison/.test(value)));
 assert(result.events.includes('track-stopped'));
});
test('no face never starts a recording or advances a movement', async t => {
 const result = await exerciseCamera(t, true);
 assert(!result.events.includes('record'));
 assert(!result.events.includes('document'));
 assert.deepEqual(result.progress, [0]);
 assert(result.stages.includes('idle'));
 assert(result.messages.some(value => /one face in frame/.test(value)));
 assert(result.events.includes('track-stopped'));
});
