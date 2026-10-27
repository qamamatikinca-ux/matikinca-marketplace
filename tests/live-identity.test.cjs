const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const fs=require('node:fs');
const mod={exports:{}};
new Function('exports','module',ts.transpileModule(fs.readFileSync('lib/liveIdentity.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(mod.exports,mod);
const {facePose,matchesPose,comparisonDistance}=mod.exports;
function points(nose=50){ const p=Array.from({length:68},()=>({x:50,y:50}));for(let i=36;i<42;i++)p[i].x=30;for(let i=42;i<48;i++)p[i].x=70;p[30].x=nose;return p; }
test('pose guidance distinguishes centre and opposite turns',()=>{assert(matchesPose(facePose(points()),'centre'));assert(matchesPose(facePose(points(36)),'left'));assert(matchesPose(facePose(points(64)),'right'));assert(!matchesPose(facePose(points(36)),'right'));});
test('invalid and undersized faces cannot advance guidance',()=>{assert.equal(facePose([]),null);assert(!matchesPose(NaN,'centre'));const p=points();p[30].x=NaN;assert.equal(facePose(p),null);});
test('comparison rejects incomplete and nonfinite descriptors',()=>{assert.equal(comparisonDistance([],[]),null);const a=new Float32Array(128),b=new Float32Array(128);assert.equal(comparisonDistance(a,b),0);b[0]=0.5;assert.equal(comparisonDistance(a,b),0.5);b[0]=Infinity;assert.equal(comparisonDistance(a,b),null);});
